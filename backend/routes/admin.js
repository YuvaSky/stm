const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const Printer = require('../models/Printer');
const Shop = require('../models/Shop');
const Branch = require('../models/Branch');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Staff = require('../models/Staff');

router.use(protect, authorize('ADMIN', 'MANAGER', 'DEVELOPER'));

// Get all registered Shops (Admin Only)
router.get('/shops', async (req, res) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 }).lean();
    const branches = await Branch.find().lean();
    const staff = await Staff.find().populate('userId', 'name mobile email').lean();

    const enrichedShops = shops.map(s => {
      const shopBranches = branches.filter(b => b.shopId?.toString() === s._id.toString());
      const shopStaff = staff.filter(st => st.shopId?.toString() === s._id.toString());
      return {
        ...s,
        branches: shopBranches,
        staff: shopStaff
      };
    });

    res.json({ success: true, shops: enrichedShops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register New Shop (Admin Only - Only Admins have access to add shops)
router.post('/shops', async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      name,
      mobile,
      phone,
      email,
      address,
      password,
      pricing,
      upiId,
      retentionMinutes
    } = req.body;

    const contactPhone = String(mobile || phone || '').replace(/\D/g, '').trim();
    const finalShopName = (shopName || '').trim();
    const finalOwnerName = (ownerName || name || '').trim();
    const finalAddress = (address || '').trim();
    const finalPassword = String(password || '').trim();

    if (!finalShopName || !finalOwnerName || !contactPhone || !finalPassword || !finalAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shop Name, Owner Name, Mobile Number, Password, and Shop Address are required.'
      });
    }

    if (contactPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number.'
      });
    }

    if (finalPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const existingShop = await Shop.findOne({ phone: contactPhone });
    if (existingShop) {
      return res.status(400).json({
        success: false,
        message: `A shop with mobile ${contactPhone} already exists (${existingShop.name}).`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(finalPassword, salt);

    const baseSlug = finalShopName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'shop';
    const uniqueSuffix = Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 5);
    const slug = `${baseSlug}-${contactPhone.slice(-4)}-${uniqueSuffix}`;

    const newShop = await Shop.create({
      name: finalShopName,
      slug,
      ownerName: finalOwnerName,
      phone: contactPhone,
      email: (email || '').trim().toLowerCase(),
      address: finalAddress,
      passwordHash,
      role: 'SHOPKEEPER',
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'PRO',
      settings: {
        retentionMinutes: Number(retentionMinutes) || 60,
        autoPrint: true,
        preferredPrinter: 'AUTO',
        pricing: {
          A4_BW: Number(pricing?.A4_BW) >= 0 ? Number(pricing.A4_BW) : 2,
          A4_COLOUR: Number(pricing?.A4_COLOUR) >= 0 ? Number(pricing.A4_COLOUR) : 10,
          A3_BW: Number(pricing?.A3_BW) >= 0 ? Number(pricing.A3_BW) : 5,
          A3_COLOUR: Number(pricing?.A3_COLOUR) >= 0 ? Number(pricing.A3_COLOUR) : 20,
          doubleSidedMultiplier: Number(pricing?.doubleSidedMultiplier) || 1.8
        },
        paymentGateway: {
          upiId: (upiId || '').trim()
        }
      }
    });

    const branch = await Branch.create({
      shopId: newShop._id,
      name: `${finalShopName} - Main Counter`,
      address: finalAddress,
      code: `BR-${contactPhone.slice(-4)}`,
      status: 'ACTIVE'
    });

    let user = await User.findOne({ mobile: contactPhone });
    if (!user) {
      user = await User.create({
        name: finalOwnerName,
        mobile: contactPhone,
        email: (email || '').trim().toLowerCase(),
        passwordHash,
        role: 'STAFF'
      });
    } else {
      user.name = finalOwnerName;
      user.role = 'STAFF';
      user.passwordHash = passwordHash;
      await user.save();
    }

    const staff = await Staff.create({
      userId: user._id,
      shopId: newShop._id,
      branchId: branch._id,
      role: 'STAFF',
      status: 'ACTIVE'
    });

    await AuditLog.create({
      userId: req.user._id,
      action: 'NEW_SHOP_CREATED',
      metadata: { shopName: newShop.name, ownerName: newShop.ownerName, mobile: contactPhone }
    });

    res.status(201).json({
      success: true,
      message: `✅ Shop '${newShop.name}' registered successfully!`,
      shop: newShop,
      branch,
      staff,
      user
    });
  } catch (err) {
    console.error('[Admin Register Shop Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all Users (Customers, Shopkeepers, Admins) with role filter
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    if (role && role !== 'ALL') {
      if (role === 'STAFF' || role === 'SHOPKEEPER') {
        query.role = { $in: ['SHOPKEEPER', 'STAFF', 'MANAGER'] };
      } else {
        query.role = role;
      }
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    // Map associated Staff data and Shop info if applicable
    const staffMembers = await Staff.find().populate('shopId').populate('branchId').lean();
    const staffMap = {};
    staffMembers.forEach(s => {
      if (s.userId) staffMap[s.userId.toString()] = s;
    });

    const enrichedUsers = users.map(u => {
      const staffInfo = staffMap[u._id.toString()];
      return {
        ...u,
        staffId: staffInfo ? staffInfo._id : null,
        staffStatus: staffInfo ? staffInfo.status : 'ACTIVE',
        branchId: staffInfo ? staffInfo.branchId?._id : null,
        shopId: staffInfo ? staffInfo.shopId?._id : null,
        shopName: staffInfo?.shopId?.name || (u.role === 'SHOPKEEPER' || u.role === 'STAFF' ? `${u.name}'s Print Shop` : undefined),
        shopAddress: staffInfo?.shopId?.address || staffInfo?.branchId?.address || undefined
      };
    });

    res.json({ success: true, users: enrichedUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create New Account (Customer, Shopkeeper/Staff, Admin/Manager)
router.post('/users', async (req, res) => {
  try {
    const { name, mobile, email, password, role, shopName, address } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Account with this mobile number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRole = ['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN', 'SHOPKEEPER'].includes(role) ? role : 'CUSTOMER';

    const newUser = await User.create({
      name,
      mobile,
      email: email || '',
      passwordHash,
      role: userRole
    });

    let staffRecord = null;
    let shopRecord = null;
    if (['STAFF', 'MANAGER', 'ADMIN', 'SHOPKEEPER'].includes(userRole)) {
      if (shopName) {
        const cleanShopName = shopName.trim();
        const baseSlug = cleanShopName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'shop';
        const uniqueSuffix = Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 5);
        const slug = `${baseSlug}-${mobile.slice(-4)}-${uniqueSuffix}`;
        shopRecord = await Shop.create({
          name: cleanShopName,
          slug,
          ownerName: name.trim(),
          phone: mobile,
          email: (email || '').trim().toLowerCase(),
          address: (address || 'Counter Address').trim(),
          passwordHash,
          role: 'SHOPKEEPER',
          subscriptionStatus: 'ACTIVE',
          subscriptionPlan: 'PRO'
        });
      } else {
        shopRecord = await Shop.findOne();
        if (!shopRecord) {
          shopRecord = await Shop.create({ name: 'Main Shop', address: address || 'Main Street', phone: mobile });
        }
      }

      let branch = await Branch.findOne({ shopId: shopRecord._id });
      if (!branch) {
        branch = await Branch.create({
          shopId: shopRecord._id,
          name: `${shopRecord.name} - Main Counter`,
          address: shopRecord.address || 'Main Branch',
          code: `BR-${mobile.slice(-4)}`
        });
      }

      staffRecord = await Staff.create({
        userId: newUser._id,
        shopId: shopRecord._id,
        branchId: branch._id,
        role: userRole === 'ADMIN' ? 'MANAGER' : (userRole === 'STAFF' ? 'STAFF' : 'SHOPKEEPER'),
        status: 'ACTIVE'
      });
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'NEW_ACCOUNT_CREATED',
      metadata: { newUserName: name, mobile, role: userRole }
    });

    res.status(201).json({
      success: true,
      message: `Account '${name}' (${userRole}) created successfully`,
      user: {
        _id: newUser._id,
        name: newUser.name,
        mobile: newUser.mobile,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        staffId: staffRecord ? staffRecord._id : null,
        staffStatus: staffRecord ? staffRecord.status : 'ACTIVE',
        shopName: shopRecord ? shopRecord.name : undefined,
        shopId: shopRecord ? shopRecord._id : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete User Account
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    // Don't allow deleting self
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account while logged in' });
    }

    await User.findByIdAndDelete(userId);
    await Staff.deleteMany({ userId });

    await AuditLog.create({
      userId: req.user._id,
      action: 'ACCOUNT_DELETED',
      metadata: { deletedUserName: userToDelete.name, mobile: userToDelete.mobile }
    });

    res.json({ success: true, message: `Account '${userToDelete.name}' deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Overview Analytics & Statistics for Admin Portal Dashboard
router.get('/analytics', async (req, res) => {
  try {
    const Order = require('../models/Order');

    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'CUSTOMER' });
    const totalStaff = await Staff.countDocuments();
    const totalAdmins = await User.countDocuments({ role: { $in: ['ADMIN', 'MANAGER'] } });

    const totalOrders = await Order.countDocuments();
    const activeQueue = await Order.countDocuments({ status: { $in: ['PAID', 'QUEUED', 'VERIFIED', 'PRINTING'] } });
    const readyOrders = await Order.countDocuments({ status: 'READY' });
    const completedOrders = await Order.countDocuments({ status: 'COLLECTED' });

    // Calculate revenue
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Today's stats
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOrdersCount = await Order.countDocuments({ createdAt: { $gte: startOfDay } });
    const todayRevenueResult = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay }, paymentStatus: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    const printers = await Printer.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCustomers,
        totalStaff,
        totalAdmins,
        totalOrders,
        activeQueue,
        readyOrders,
        completedOrders,
        totalRevenue,
        todayOrdersCount,
        todayRevenue,
        printers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all Staff/Shopkeepers
router.get('/staff', async (req, res) => {
  try {
    const staffMembers = await Staff.find()
      .populate('userId', 'name mobile email role createdAt')
      .populate('shopId', 'name address phone')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, staff: staffMembers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create New Shopkeeper (Staff Member)
router.post('/staff', async (req, res) => {
  try {
    const { name, mobile, password, role } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user or shopkeeper with this mobile number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const staffRole = role === 'MANAGER' ? 'MANAGER' : 'STAFF';

    const newUser = await User.create({
      name,
      mobile,
      passwordHash,
      role: staffRole
    });

    let shop = await Shop.findOne();
    let branch = await Branch.findOne();

    if (!shop) {
      shop = await Shop.create({ name: 'Main Shop', address: 'Main Street', phone: mobile });
    }
    if (!branch) {
      branch = await Branch.create({ shopId: shop._id, name: 'Main Branch', code: 'BR-01' });
    }

    const newStaff = await Staff.create({
      userId: newUser._id,
      shopId: shop._id,
      branchId: branch._id,
      role: staffRole,
      status: 'ACTIVE'
    });

    await AuditLog.create({
      staffId: req.user._id,
      action: 'NEW_SHOPKEEPER_CREATED',
      metadata: { newStaffName: name, mobile, role: staffRole }
    });

    res.status(201).json({
      success: true,
      message: `Shopkeeper '${name}' created successfully`,
      staff: {
        _id: newStaff._id,
        role: staffRole,
        status: newStaff.status,
        userId: {
          _id: newUser._id,
          name: newUser.name,
          mobile: newUser.mobile,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle Staff Status (ACTIVE/INACTIVE)
router.patch('/staff/:id/status', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staff.status = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await staff.save();

    res.json({ success: true, message: `Staff status updated to ${staff.status}`, status: staff.status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all Printers
router.get('/printers', async (req, res) => {
  try {
    const printers = await Printer.find().populate('branchId', 'name').lean();
    res.json({ success: true, printers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Printer
router.post('/printers', async (req, res) => {
  try {
    const { name, type, capabilities, branchId } = req.body;
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const branch = await Branch.findOne();
      targetBranchId = branch ? branch._id : null;
    }

    const printer = await Printer.create({
      branchId: targetBranchId,
      name,
      type: type || 'LASER',
      capabilities: capabilities || { paperSizes: ['A4'], color: false, duplex: true },
      status: 'ONLINE'
    });

    res.status(201).json({ success: true, printer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Pricing & Retention Settings
router.get('/settings', async (req, res) => {
  try {
    const shop = await Shop.findOne();
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Pricing & Retention Settings
router.put('/settings', async (req, res) => {
  try {
    const { pricing, retentionMinutes } = req.body;
    let shop = await Shop.findOne();

    if (!shop) {
      shop = new Shop({
        name: 'Main Stationery & Print Shop',
        address: '123 Station Road',
        phone: '9876543210'
      });
    }

    if (pricing) shop.settings.pricing = pricing;
    if (retentionMinutes) shop.settings.retentionMinutes = retentionMinutes;

    await shop.save();

    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Audit Logs View
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'name mobile')
      .populate('staffId', 'name mobile')
      .populate('orderId', 'publicOrderId')
      .lean();

    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
