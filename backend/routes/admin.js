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

router.use(protect, authorize('ADMIN', 'MANAGER', 'DEVELOPER', 'SHOPKEEPER'));

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

    // Map associated Staff data if applicable
    const staffMembers = await Staff.find().lean();
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
        branchId: staffInfo ? staffInfo.branchId : null
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
    const { name, mobile, email, password, role } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Account with this mobile number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRole = ['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'].includes(role) ? role : 'CUSTOMER';

    const newUser = await User.create({
      name,
      mobile,
      email: email || '',
      passwordHash,
      role: userRole
    });

    let staffRecord = null;
    if (['STAFF', 'MANAGER', 'ADMIN'].includes(userRole)) {
      let shop = await Shop.findOne();
      let branch = await Branch.findOne();

      if (!shop) {
        shop = await Shop.create({ name: 'Main Shop', address: 'Main Street', phone: mobile });
      }
      if (!branch) {
        branch = await Branch.create({ shopId: shop._id, name: 'Main Branch', code: 'BR-01' });
      }

      staffRecord = await Staff.create({
        userId: newUser._id,
        shopId: shop._id,
        branchId: branch._id,
        role: userRole === 'ADMIN' ? 'MANAGER' : userRole,
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
        staffStatus: staffRecord ? staffRecord.status : 'ACTIVE'
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
