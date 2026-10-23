const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const Document = require('../models/Document');
const PrintSetting = require('../models/PrintSetting');
const PrintJob = require('../models/PrintJob');
const Printer = require('../models/Printer');
const User = require('../models/User');
const Shop = require('../models/Shop');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const { hashToken } = require('../utils/idGenerator');
const { dispatchPrintJob } = require('../utils/printDispatcher');

// All routes require SHOPKEEPER, STAFF, MANAGER or ADMIN role
router.use(protect, authorize('SHOPKEEPER', 'STAFF', 'MANAGER', 'ADMIN'));

// Helper to resolve the authenticated user's associated shop
async function getShopForUser(user) {
  if (!user) return null;
  const Staff = require('../models/Staff');
  const staff = await Staff.findOne({ userId: user._id });
  if (staff && staff.shopId) {
    const s = await Shop.findById(staff.shopId);
    if (s) return s;
  }
  if (user.shopId) {
    const s = await Shop.findById(user.shopId);
    if (s) return s;
  }
  if (user._id) {
    const s = await Shop.findById(user._id);
    if (s) return s;
  }
  const phone = user.phone || user.mobile;
  if (phone) {
    const s = await Shop.findOne({ phone: String(phone).replace(/\D/g, '') });
    if (s) return s;
  }
  return await Shop.findOne();
}

// Get Active Queue & Dashboard Summary
router.get('/queue', async (req, res) => {
  try {
    const currentShop = await getShopForUser(req.user);
    const isGlobalAdmin = ['ADMIN', 'DEVELOPER'].includes(req.user?.role);

    const filter = {
      status: { $in: ['PAID', 'QUEUED', 'VERIFIED', 'PRINTING', 'PRINTED', 'READY', 'PRINT_FAILED'] }
    };

    if (currentShop && !isGlobalAdmin) {
      filter.$or = [
        { shopId: currentShop._id },
        { shopId: { $exists: false } },
        { shopId: null }
      ];
    }

    const activeOrders = await Order.find(filter)
      .sort({ createdAt: 1 })
      .populate('userId', 'name mobile email')
      .lean();

    const result = await Promise.all(activeOrders.map(async (order) => {
      const documents = await Document.find({ orderId: order._id }).lean();
      const settings = await PrintSetting.find({ orderId: order._id }).lean();
      return {
        ...order,
        documents,
        settings
      };
    }));

    const collectedFilter = {
      status: 'COLLECTED',
      collectedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
    };
    if (currentShop && !isGlobalAdmin) {
      collectedFilter.$or = [
        { shopId: currentShop._id },
        { shopId: { $exists: false } },
        { shopId: null }
      ];
    }

    const stats = {
      newOrders: activeOrders.filter(o => ['PAID', 'QUEUED', 'VERIFIED'].includes(o.status)).length,
      printing: activeOrders.filter(o => o.status === 'PRINTING').length,
      ready: activeOrders.filter(o => o.status === 'READY').length,
      collectedToday: await Order.countDocuments(collectedFilter)
    };

    res.json({ success: true, stats, queue: result, shop: currentShop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify Customer QR Code
router.post('/verify-qr', async (req, res) => {
  try {
    const { qrToken, targetOrderId } = req.body;

    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token is required' });
    }

    const hashed = hashToken(qrToken);
    const order = await Order.findOne({ qrTokenHash: hashed })
      .populate('userId', 'name mobile')
      .lean();

    if (!order) {
      await AuditLog.create({
        staffId: req.user._id,
        action: 'INVALID_QR_SCAN_ATTEMPT',
        metadata: { scannedToken: qrToken }
      });
      return res.status(400).json({ 
        success: false, 
        mismatch: true,
        message: '🔴 ORDER MISMATCH: This QR code is invalid or does not belong to any active order.' 
      });
    }

    // Check if targetOrderId specified and does not match
    if (targetOrderId && order._id.toString() !== targetOrderId.toString()) {
      await AuditLog.create({
        orderId: order._id,
        staffId: req.user._id,
        action: 'WRONG_ORDER_QR_MISMATCH',
        metadata: { expectedOrder: targetOrderId, scannedOrder: order._id }
      });
      return res.status(400).json({ 
        success: false, 
        mismatch: true,
        message: '🔴 ORDER MISMATCH: Scanned QR belongs to order ' + order.publicOrderId + ', not the selected queue order.' 
      });
    }

    if (order.status === 'COLLECTED') {
      return res.status(400).json({
        success: false,
        message: '⚠️ ALREADY COLLECTED: Order ' + order.publicOrderId + ' was already collected.'
      });
    }

    const documents = await Document.find({ orderId: order._id }).lean();
    const settings = await PrintSetting.find({ orderId: order._id }).lean();

    await AuditLog.create({
      orderId: order._id,
      staffId: req.user._id,
      action: 'QR_VERIFIED',
      metadata: { publicOrderId: order.publicOrderId }
    });

    console.log(`\x1b[36m[SHOPKEEPER QR SCAN] Verified Order ${order.publicOrderId} for Customer ${order.userId?.name}\x1b[0m`);

    res.json({
      success: true,
      verified: true,
      order: {
        ...order,
        documents,
        settings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify Pickup PIN Fallback
router.post('/verify-pin', async (req, res) => {
  try {
    const { pickupPin, orderId } = req.body;

    if (!pickupPin) {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }

    const hashedPin = hashToken(pickupPin);
    let order;

    if (orderId) {
      order = await Order.findById(orderId).populate('userId', 'name mobile').lean();
      if (!order || order.pickupPinHash !== hashedPin) {
        await AuditLog.create({
          orderId: orderId,
          staffId: req.user._id,
          action: 'FAILED_PIN_ATTEMPT',
          metadata: { enteredPin: pickupPin }
        });
        return res.status(400).json({ success: false, message: '🔴 INVALID PICKUP PIN: Verification failed.' });
      }
    } else {
      order = await Order.findOne({ pickupPinHash: hashedPin, status: { $ne: 'COLLECTED' } })
        .populate('userId', 'name mobile')
        .lean();

      if (!order) {
        return res.status(400).json({ success: false, message: '🔴 INVALID PICKUP PIN: No matching order found.' });
      }
    }

    const documents = await Document.find({ orderId: order._id }).lean();
    const settings = await PrintSetting.find({ orderId: order._id }).lean();

    await AuditLog.create({
      orderId: order._id,
      staffId: req.user._id,
      action: 'PIN_VERIFIED',
      metadata: { publicOrderId: order.publicOrderId }
    });

    res.json({
      success: true,
      verified: true,
      order: {
        ...order,
        documents,
        settings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Send Print Job to Physical Printer via Local Print Agent
// Send Print Job to Physical Printer via Local Print Agent
router.post('/print-now', async (req, res) => {
  try {
    const { orderId, isReprintConfirmed, printerName } = req.body;
    const io = req.app.get('io');

    const result = await dispatchPrintJob({
      orderId,
      io,
      staffId: req.user._id,
      isReprintConfirmed,
      customPrinterName: printerName
    });

    res.json({
      success: true,
      message: `Print job dispatched to Local Agent -> ${result.finalPrinterName}`,
      printJobId: result.printJob._id,
      printerName: result.finalPrinterName,
      publicOrderId: result.order.publicOrderId
    });
  } catch (err) {
    if (err.requiresReprintConfirmation) {
      return res.status(409).json({
        success: false,
        requiresReprintConfirmation: true,
        printCount: err.printCount,
        message: err.message
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// Abort an active print job before handing the order to the customer
router.post('/abort-print', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['PAID', 'QUEUED', 'VERIFIED', 'PRINTING', 'PRINTED'].includes(order.status)) {
      return res.status(409).json({
        success: false,
        message: `Order cannot be aborted from status ${order.status}`
      });
    }

    order.status = 'CANCELLED';
    await order.save();

    const activeJobs = await PrintJob.find({
      orderId: order._id,
      status: { $in: ['QUEUED', 'SENDING', 'PRINTING'] }
    }).select('_id').lean();

    await PrintJob.updateMany(
      { orderId: order._id, status: { $in: ['QUEUED', 'SENDING', 'PRINTING'] } },
      { status: 'ABORTED', failureReason: 'Aborted by staff', completedAt: new Date() }
    );

    await AuditLog.create({
      orderId: order._id,
      staffId: req.user._id,
      action: 'PRINT_ABORTED',
      metadata: { publicOrderId: order.publicOrderId }
    });

    const io = req.app.get('io');
    if (io) {
      activeJobs.forEach(job => io.emit('agent_abort_print', { printJobId: job._id }));
      io.emit('order_status_updated', {
        orderId: order._id,
        publicOrderId: order.publicOrderId,
        status: 'CANCELLED'
      });
    }

    res.json({ success: true, message: `Print aborted for ${order.publicOrderId}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Auto-Print & Preferred Connected Printer Settings
router.get('/autoprint-settings', async (req, res) => {
  try {
    let shop = await Shop.findOne();
    res.json({
      success: true,
      autoPrint: shop?.settings?.autoPrint !== false,
      preferredPrinter: shop?.settings?.preferredPrinter || 'AUTO'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Auto-Print & Preferred Connected Printer Settings
router.post('/autoprint-settings', async (req, res) => {
  try {
    const { autoPrint, preferredPrinter } = req.body;
    let shop = await Shop.findOne();
    if (!shop) {
      shop = await Shop.create({
        name: 'Secure Print Shop',
        slug: 'main',
        address: 'Counter 1',
        phone: '9999999999',
        settings: {}
      });
    }

    if (!shop.settings) shop.settings = {};
    if (autoPrint !== undefined) shop.settings.autoPrint = autoPrint;
    if (preferredPrinter !== undefined) shop.settings.preferredPrinter = preferredPrinter;

    await shop.save();

    // Broadcast update to all connected screens
    const io = req.app.get('io');
    if (io) {
      io.emit('autoprint_settings_updated', {
        autoPrint: shop.settings.autoPrint,
        preferredPrinter: shop.settings.preferredPrinter
      });
    }

    res.json({
      success: true,
      autoPrint: shop.settings.autoPrint,
      preferredPrinter: shop.settings.preferredPrinter,
      message: shop.settings.autoPrint 
        ? '⚡ Automatic Printing enabled! New customer orders will print immediately.'
        : '⏸️ Manual Queue enabled. Orders will wait for staff "PRINT NOW" click.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark Order Ready for Pickup
router.post('/mark-ready', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = 'READY';
    order.readyAt = new Date();
    await order.save();

    await PrintJob.updateMany({ orderId: order._id, status: 'PRINTING' }, { status: 'COMPLETED', completedAt: new Date() });

    await AuditLog.create({
      orderId: order._id,
      staffId: req.user._id,
      action: 'ORDER_MARKED_READY',
      metadata: { publicOrderId: order.publicOrderId }
    });

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', {
        orderId: order._id,
        publicOrderId: order.publicOrderId,
        status: 'READY'
      });
    }

    res.json({ success: true, message: `Order ${order.publicOrderId} marked READY for pickup` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Final Pickup & Physical Packet Handover
router.post('/collect-order', async (req, res) => {
  try {
    const { orderId, physicalJobIdChecked } = req.body;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({ publicOrderId: orderId });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!physicalJobIdChecked) {
      return res.status(400).json({
        success: false,
        message: '🔴 PHYSICAL PACKET MISMATCH: You must verify that Digital Job ID matches Physical Job ID on tray/envelope.'
      });
    }

    order.status = 'COLLECTED';
    order.collectedAt = new Date();

    // Set retention expiry timer (e.g., 60 mins from collection)
    const retentionMinutes = parseInt(process.env.RETENTION_MINUTES || '60', 10);
    order.expiresAt = new Date(Date.now() + retentionMinutes * 60 * 1000);
    await order.save();

    await AuditLog.create({
      orderId: order._id,
      staffId: req.user._id,
      action: 'ORDER_COLLECTED_HANDOVER_COMPLETE',
      metadata: { publicOrderId: order.publicOrderId, collectedAt: order.collectedAt }
    });

    console.log(`\x1b[32m[HANDOVER COMPLETE] Order ${order.publicOrderId} handed over to Customer. Status: COLLECTED. Physical file retention auto-delete timer initiated.\x1b[0m`);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', {
        orderId: order._id,
        publicOrderId: order.publicOrderId,
        status: 'COLLECTED'
      });
    }

    res.json({
      success: true,
      message: `Handover complete for ${order.publicOrderId}. Order status set to COLLECTED. Auto-deletion retention started.`,
      expiresAt: order.expiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reports & Analytics
router.get('/reports', async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0,0,0,0));
    const currentShop = await getShopForUser(req.user);
    const isGlobalAdmin = ['ADMIN', 'DEVELOPER'].includes(req.user?.role);

    const reportFilter = { createdAt: { $gte: todayStart } };
    if (currentShop && !isGlobalAdmin) {
      reportFilter.$or = [
        { shopId: currentShop._id },
        { shopId: { $exists: false } },
        { shopId: null }
      ];
    }

    const todayOrders = await Order.find(reportFilter);
    const totalSales = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const completedOrders = todayOrders.filter(o => o.status === 'COLLECTED').length;

    res.json({
      success: true,
      reports: {
        todayOrdersCount: todayOrders.length,
        todaySales: totalSales,
        completedOrders,
        pendingOrders: todayOrders.length - completedOrders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Live Local Print Agent Status & Telemetry
router.get('/agent-status', (req, res) => {
  const io = req.app.get('io');
  const activeAgents = req.app.get('activeAgents');
  const agentRoom = io?.sockets?.adapter?.rooms?.get('print_agents');
  const count = agentRoom ? agentRoom.size : 0;
  const agentsList = activeAgents ? Array.from(activeAgents.values()) : [];

  const list = [];
  agentsList.forEach(agent => {
    if (!agent.printers) return;
    if (Array.isArray(agent.printers)) {
      agent.printers.forEach(p => {
        if (typeof p === 'string') {
          list.push({ name: p, isDefault: false, status: 'Ready' });
        } else if (p && p.name) {
          list.push({
            name: p.name,
            isDefault: Boolean(p.isDefault),
            status: p.status || 'Ready'
          });
        }
      });
    } else if (typeof agent.printers === 'string') {
      const lines = agent.printers.split('\n').filter(l => l.trim() && !l.includes('---') && !l.includes('PrinterStatus'));
      lines.forEach(line => {
        const match = line.match(/^(\S.*?\S)\s{2,}/);
        const name = match ? match[1].trim() : line.trim();
        const isDefault = line.toLowerCase().includes('true');
        if (name && name !== 'Name') {
          list.push({ name, isDefault, status: 'Ready' });
        }
      });
    }
  });

  const seen = new Set();
  const printers = list.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  res.json({
    success: true,
    online: count > 0,
    count,
    agents: agentsList,
    printers: printers,
    secretConfigured: !!(process.env.AGENT_SECRET || 'agent_secret_token_998877')
  });
});

// Trigger a real-time rescan of all Windows Spooler & Physical Printers
router.post('/rescan-printers', async (req, res) => {
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('agent_rescan_printers', { timestamp: new Date() });
    }

    // Wait a brief moment for the local agent to scan spooler and emit back
    await new Promise(r => setTimeout(r, 1200));

    const activeAgents = req.app.get('activeAgents');
    const agentsList = activeAgents ? Array.from(activeAgents.values()) : [];
    const list = [];
    agentsList.forEach(agent => {
      if (!agent.printers) return;
      if (Array.isArray(agent.printers)) {
        agent.printers.forEach(p => {
          if (typeof p === 'string') list.push({ name: p, isDefault: false, status: 'Ready' });
          else if (p && p.name) list.push({ name: p.name, isDefault: Boolean(p.isDefault), status: p.status || 'Ready' });
        });
      }
    });

    const seen = new Set();
    const printers = list.filter(p => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });

    res.json({
      success: true,
      message: `Scanned ${printers.length} printer(s) from Windows Spooler`,
      printers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register or set a manual / network printer directly
router.post('/custom-printer', async (req, res) => {
  try {
    const { printerName } = req.body;
    if (!printerName || !printerName.trim()) {
      return res.status(400).json({ success: false, message: 'Printer name is required' });
    }
    const cleanName = printerName.trim();
    const currentShop = await getShopForUser(req.user);

    let printerDoc = await Printer.findOne({ name: cleanName });
    if (!printerDoc) {
      printerDoc = await Printer.create({
        branchId: currentShop?._id ? String(currentShop._id) : 'Main_Branch',
        name: cleanName,
        type: 'LASER',
        capabilities: { paperSizes: ['A4', 'A3'], color: true, duplex: true },
        status: 'ONLINE'
      });
    }

    // Update shop autoprint preferred printer
    if (currentShop) {
      currentShop.preferredPrinter = cleanName;
      await currentShop.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('autoprint_settings_updated', { preferredPrinter: cleanName });
    }

    res.json({
      success: true,
      message: `Active printer configured: ${cleanName}`,
      printer: { name: cleanName, isDefault: false, status: 'Ready' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dispatch a Test Print Job Signal to Local Print Agent
router.post('/test-print', async (req, res) => {
  try {
    const io = req.app.get('io');
    const agentRoom = io?.sockets?.adapter?.rooms?.get('print_agents');
    const isOnline = agentRoom && agentRoom.size > 0;
    const testJobId = 'TEST-' + Date.now().toString(36).toUpperCase();

    if (io) {
      io.emit('agent_test_print', {
        testJobId,
        timestamp: new Date(),
        initiatedBy: req.user ? req.user.name : 'Shopkeeper Staff'
      });
    }

    console.log(`\x1b[36m[TEST PRINT DISPATCHED] ID: ${testJobId} | Agent Online: ${!!isOnline}\x1b[0m`);

    res.json({
      success: true,
      testJobId,
      agentConnected: !!isOnline,
      message: isOnline
        ? `✅ Test print signal (${testJobId}) dispatched to connected Local Print Agent!`
        : `⚠️ Test print signal (${testJobId}) sent to WebSocket queue. Start 'npm start' in print-agent to process.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get list of all staff members under current shopkeeper's shop
router.get('/staff', async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const Branch = require('../models/Branch');

    const currentShop = await getShopForUser(req.user);
    const shopId = currentShop ? currentShop._id : null;

    if (!shopId) {
      return res.json({ success: true, staff: [] });
    }

    const shopStaffList = await Staff.find({ shopId })
      .populate('userId', 'name mobile email role createdAt')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    const formattedList = shopStaffList.map(s => ({
      _id: s._id,
      name: s.userId?.name || 'Staff Member',
      mobile: s.userId?.mobile || '',
      email: s.userId?.email || '',
      role: s.role,
      status: s.status,
      branchName: s.branchId?.name || 'Main Counter',
      createdAt: s.createdAt
    }));

    res.json({ success: true, staff: formattedList });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new staff member (counter operator) for current shopkeeper
router.post('/staff', async (req, res) => {
  try {
    let { name, mobile, password } = req.body;
    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, Mobile Number, and Password are required for staff.' });
    }

    mobile = String(mobile).replace(/\D/g, '').trim();
    if (mobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number for staff login.' });
    }

    const existing = await User.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user account with this mobile number already exists.' });
    }

    const Staff = require('../models/Staff');
    const Branch = require('../models/Branch');

    const currentShop = await getShopForUser(req.user);
    let shopId = currentShop ? currentShop._id : null;

    if (!shopId) {
      let shop = await Shop.findOne();
      if (!shop) {
        shop = await Shop.create({ name: 'Main Print Shop', slug: 'main', address: 'Counter', phone: mobile });
      }
      shopId = shop._id;
    }

    let branch = await Branch.findOne({ shopId });
    if (!branch) {
      branch = await Branch.create({ shopId, name: 'Main Counter', code: 'BR-01' });
    }
    const branchId = branch._id;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      mobile,
      passwordHash,
      role: 'STAFF'
    });

    const newStaffRecord = await Staff.create({
      userId: newUser._id,
      shopId,
      branchId,
      role: 'STAFF',
      status: 'ACTIVE'
    });

    res.json({
      success: true,
      message: `✅ Staff operator '${name}' created! Login ID: ${mobile}`,
      staff: {
        _id: newStaffRecord._id,
        name: newUser.name,
        mobile: newUser.mobile,
        role: newStaffRecord.role,
        status: newStaffRecord.status,
        branchName: branch.name,
        createdAt: newStaffRecord.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a staff member under shopkeeper
router.delete('/staff/:id', async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff record not found' });
    }

    if (staff.userId) {
      await User.findByIdAndDelete(staff.userId);
    }
    await Staff.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Staff operator removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Shopkeeper Pricing Settings
router.get('/pricing', async (req, res) => {
  try {
    const shop = await getShopForUser(req.user);
    const defaultPricing = {
      A4_BW: 2,
      A4_COLOUR: 10,
      A3_BW: 5,
      A3_COLOUR: 20,
      LEGAL_BW: 3,
      LEGAL_COLOUR: 12,
      GLOSSY_COLOUR: 25,
      doubleSidedMultiplier: 1.8,
      customItems: []
    };

    const pricing = shop?.settings?.pricing ? {
      ...defaultPricing,
      ...shop.settings.pricing,
      customItems: Array.isArray(shop.settings.pricing.customItems) ? shop.settings.pricing.customItems : []
    } : defaultPricing;

    res.json({
      success: true,
      pricing
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Shopkeeper Pricing Settings (Base rates & Custom items)
router.put('/pricing', async (req, res) => {
  try {
    const { pricing } = req.body;
    if (!pricing) {
      return res.status(400).json({ success: false, message: 'Pricing payload is required' });
    }

    const shop = await getShopForUser(req.user);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (!shop.settings) shop.settings = {};
    if (!shop.settings.pricing) shop.settings.pricing = {};

    // Update standard paper rates
    if (pricing.A4_BW !== undefined) shop.settings.pricing.A4_BW = Math.max(0, Number(pricing.A4_BW));
    if (pricing.A4_COLOUR !== undefined) shop.settings.pricing.A4_COLOUR = Math.max(0, Number(pricing.A4_COLOUR));
    if (pricing.A3_BW !== undefined) shop.settings.pricing.A3_BW = Math.max(0, Number(pricing.A3_BW));
    if (pricing.A3_COLOUR !== undefined) shop.settings.pricing.A3_COLOUR = Math.max(0, Number(pricing.A3_COLOUR));
    if (pricing.LEGAL_BW !== undefined) shop.settings.pricing.LEGAL_BW = Math.max(0, Number(pricing.LEGAL_BW));
    if (pricing.LEGAL_COLOUR !== undefined) shop.settings.pricing.LEGAL_COLOUR = Math.max(0, Number(pricing.LEGAL_COLOUR));
    if (pricing.GLOSSY_COLOUR !== undefined) shop.settings.pricing.GLOSSY_COLOUR = Math.max(0, Number(pricing.GLOSSY_COLOUR));
    if (pricing.doubleSidedMultiplier !== undefined) shop.settings.pricing.doubleSidedMultiplier = Math.max(1, Math.min(2, Number(pricing.doubleSidedMultiplier)));

    if (Array.isArray(pricing.customItems)) {
      shop.settings.pricing.customItems = pricing.customItems.map(it => ({
        id: it.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: String(it.name || '').trim(),
        price: Math.max(0, Number(it.price) || 0),
        unit: it.unit || 'per document',
        category: it.category || 'FINISHING',
        description: String(it.description || '').trim(),
        enabled: it.enabled !== false
      })).filter(it => it.name);
    }

    shop.markModified('settings.pricing');
    await shop.save();

    res.json({
      success: true,
      message: '✅ Print Rates & Dynamic Services updated! Customer Store rates reflect this instantly.',
      pricing: shop.settings.pricing
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add a single custom dynamic price item / service
router.post('/pricing/custom-item', async (req, res) => {
  try {
    const { name, price, unit, category, description, enabled } = req.body;
    if (!name || price === undefined || isNaN(Number(price))) {
      return res.status(400).json({ success: false, message: 'Item Name and Price are required.' });
    }

    const shop = await getShopForUser(req.user);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    if (!shop.settings) shop.settings = {};
    if (!shop.settings.pricing) shop.settings.pricing = {};
    if (!Array.isArray(shop.settings.pricing.customItems)) {
      shop.settings.pricing.customItems = [];
    }

    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      price: Math.max(0, Number(price)),
      unit: unit || 'per document',
      category: category || 'FINISHING',
      description: description ? description.trim() : '',
      enabled: enabled !== false
    };

    shop.settings.pricing.customItems.push(newItem);
    shop.markModified('settings.pricing');
    await shop.save();

    res.status(201).json({
      success: true,
      message: `✅ Added custom service '${newItem.name}' at ₹${newItem.price}!`,
      item: newItem,
      pricing: shop.settings.pricing
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update an existing dynamic price item
router.put('/pricing/custom-item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, unit, category, description, enabled } = req.body;

    const shop = await getShopForUser(req.user);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    if (!shop.settings?.pricing?.customItems) {
      return res.status(404).json({ success: false, message: 'No custom items configured' });
    }

    const itemIndex = shop.settings.pricing.customItems.findIndex(it => it.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Price item not found' });
    }

    const currentItem = shop.settings.pricing.customItems[itemIndex];
    if (name) currentItem.name = name.trim();
    if (price !== undefined && !isNaN(Number(price))) currentItem.price = Math.max(0, Number(price));
    if (unit) currentItem.unit = unit;
    if (category) currentItem.category = category;
    if (description !== undefined) currentItem.description = description.trim();
    if (enabled !== undefined) currentItem.enabled = Boolean(enabled);

    shop.markModified('settings.pricing');
    await shop.save();

    res.json({
      success: true,
      message: `✅ Price item updated successfully!`,
      item: currentItem,
      pricing: shop.settings.pricing
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a dynamic price item
router.delete('/pricing/custom-item/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const shop = await getShopForUser(req.user);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    if (!shop.settings?.pricing?.customItems) {
      return res.status(404).json({ success: false, message: 'No custom items' });
    }

    shop.settings.pricing.customItems = shop.settings.pricing.customItems.filter(it => it.id !== id);
    shop.markModified('settings.pricing');
    await shop.save();

    res.json({
      success: true,
      message: '✅ Price item removed.',
      pricing: shop.settings.pricing
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Payment Gateway Credentials for Shopkeeper
router.get('/payment-settings', async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const staff = await Staff.findOne({ userId: req.user._id });
    let shop = null;
    if (staff && staff.shopId) {
      shop = await Shop.findById(staff.shopId);
    }
    if (!shop) {
      shop = await Shop.findOne();
    }

    res.json({
      success: true,
      paymentGateway: shop ? (shop.settings.paymentGateway || {}) : {}
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Payment Gateway Credentials for Shopkeeper
router.put('/payment-settings', async (req, res) => {
  try {
    const { razorpayKeyId, razorpayKeySecret, razorpayAccountId, upiId } = req.body;
    const Staff = require('../models/Staff');
    const staff = await Staff.findOne({ userId: req.user._id });
    let shop = null;
    if (staff && staff.shopId) {
      shop = await Shop.findById(staff.shopId);
    }
    if (!shop) {
      shop = await Shop.findOne();
    }

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (!shop.settings.paymentGateway) {
      shop.settings.paymentGateway = {};
    }

    if (razorpayKeyId !== undefined) shop.settings.paymentGateway.razorpayKeyId = razorpayKeyId;
    if (razorpayKeySecret !== undefined) shop.settings.paymentGateway.razorpayKeySecret = razorpayKeySecret;
    if (razorpayAccountId !== undefined) shop.settings.paymentGateway.razorpayAccountId = razorpayAccountId;
    if (upiId !== undefined) shop.settings.paymentGateway.upiId = upiId;

    await shop.save();

    res.json({
      success: true,
      message: '✅ Payment gateway credentials updated successfully for your shop!',
      paymentGateway: shop.settings.paymentGateway
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Full Shop Details
router.get('/shop-details', async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const staff = await Staff.findOne({ userId: req.user._id });
    let shop = null;
    if (staff && staff.shopId) {
      shop = await Shop.findById(staff.shopId);
    }
    if (!shop) {
      shop = await Shop.findById(req.user._id);
    }
    if (!shop && (req.user.phone || req.user.mobile)) {
      shop = await Shop.findOne({ phone: req.user.phone || req.user.mobile });
    }
    if (!shop) {
      shop = await Shop.findOne();
    }

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop details not found' });
    }

    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'http';
    const customerUploadUrl = `${protocol}://${host}/?shop=${shop._id}`;

    res.json({
      success: true,
      shop: {
        id: shop._id,
        _id: shop._id,
        name: shop.name,
        slug: shop.slug,
        ownerName: shop.ownerName || 'Shop Owner',
        phone: shop.phone,
        mobile: shop.phone,
        email: shop.email || '',
        address: shop.address || '',
        subscriptionStatus: shop.subscriptionStatus || 'ACTIVE',
        subscriptionPlan: shop.subscriptionPlan || 'PRO',
        settings: shop.settings,
        pricing: shop.settings?.pricing,
        retentionMinutes: shop.settings?.retentionMinutes || 60,
        upiId: shop.settings?.paymentGateway?.upiId || '',
        customerUploadUrl,
        createdAt: shop.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Shop Details
router.put('/shop-details', async (req, res) => {
  try {
    const { name, ownerName, email, address, phone, pricing, retentionMinutes, upiId } = req.body;
    const Staff = require('../models/Staff');
    const staff = await Staff.findOne({ userId: req.user._id });
    let shop = null;
    if (staff && staff.shopId) {
      shop = await Shop.findById(staff.shopId);
    }
    if (!shop) {
      shop = await Shop.findById(req.user._id);
    }
    if (!shop && (req.user.phone || req.user.mobile)) {
      shop = await Shop.findOne({ phone: req.user.phone || req.user.mobile });
    }
    if (!shop) {
      shop = await Shop.findOne();
    }

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (name) shop.name = name.trim();
    if (ownerName) shop.ownerName = ownerName.trim();
    if (email !== undefined) shop.email = email.trim().toLowerCase();
    if (address) shop.address = address.trim();
    if (phone) shop.phone = String(phone).replace(/\D/g, '').trim();

    if (!shop.settings) shop.settings = {};

    if (retentionMinutes !== undefined) {
      shop.settings.retentionMinutes = Number(retentionMinutes) || 60;
    }

    if (pricing) {
      shop.settings.pricing = {
        ...shop.settings.pricing,
        ...pricing
      };
    }

    if (upiId !== undefined) {
      if (!shop.settings.paymentGateway) shop.settings.paymentGateway = {};
      shop.settings.paymentGateway.upiId = upiId.trim();
    }

    await shop.save();

    res.json({
      success: true,
      message: '✅ Shop details updated successfully!',
      shop
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Stream document directly for shopkeeper browser viewing & printing
router.get('/document/:docId/view', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId).select('+fileData');
    if (!doc || doc.deletedAt) {
      return res.status(404).send('Document not found or expired');
    }

    const mimeTypes = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      txt: 'text/plain'
    };
    const contentType = mimeTypes[doc.fileType?.toLowerCase()] || 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalFileName || 'document.pdf')}"`);

    if (doc.fileData && doc.fileData.length > 0) {
      return res.send(doc.fileData);
    }

    const absolutePath = path.isAbsolute(doc.storageKey)
      ? doc.storageKey
      : path.join(__dirname, '../', doc.storageKey);

    if (fs.existsSync(absolutePath)) {
      return res.sendFile(absolutePath);
    }

    return res.status(404).send('Physical document file not found on disk');
  } catch (err) {
    res.status(500).send('Error loading document: ' + err.message);
  }
});

// Download document for counter operator
router.get('/document/:docId/download', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId).select('+fileData');
    if (!doc || doc.deletedAt) {
      return res.status(404).json({ success: false, message: 'Document not found or expired' });
    }

    if (doc.fileData && doc.fileData.length > 0) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalFileName || 'document.pdf')}"`);
      res.setHeader('Content-Type', doc.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream');
      return res.send(doc.fileData);
    }

    const absolutePath = path.isAbsolute(doc.storageKey)
      ? doc.storageKey
      : path.join(__dirname, '../', doc.storageKey);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found' });
    }

    res.download(absolutePath, doc.originalFileName);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manually or browser-printed status updater
router.post('/mark-printed', async (req, res) => {
  try {
    const { orderId, method = 'BROWSER_PRINT' } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = 'PRINTED';
    order.printCount += 1;
    order.printedToPrinter = method === 'BROWSER_PRINT' ? 'Browser Print Dialog' : 'Counter Printer';
    order.printedAt = new Date();
    await order.save();

    await AuditLog.create({
      orderId: order._id,
      staffId: req.user._id,
      action: 'ORDER_PRINTED',
      metadata: { publicOrderId: order.publicOrderId, method }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', {
        orderId: order._id,
        publicOrderId: order.publicOrderId,
        status: 'PRINTED',
        printCount: order.printCount,
        printedToPrinter: order.printedToPrinter
      });
    }

    res.json({ success: true, message: `Order ${order.publicOrderId} marked as printed`, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
