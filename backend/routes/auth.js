const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Register User
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, email, password, role } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this mobile number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      mobile,
      email: email || '',
      passwordHash,
      role: role || 'CUSTOMER'
    });

    let staffRecord = null;
    if (['SHOPKEEPER', 'STAFF', 'MANAGER'].includes(user.role)) {
      const Shop = require('../models/Shop');
      const Branch = require('../models/Branch');
      const Staff = require('../models/Staff');

      const shopName = req.body.shopName || `${name}'s Print Shop`;
      let shop = await Shop.create({ name: shopName, address: 'Counter Address', phone: mobile });
      let branch = await Branch.create({ shopId: shop._id, name: 'Main Counter', code: `BR-${user.mobile.slice(-4)}` });

      staffRecord = await Staff.create({
        userId: user._id,
        shopId: shop._id,
        branchId: branch._id,
        role: user.role,
        status: 'ACTIVE'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'super_secret_secure_print_key_2026_antigravity',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        staffId: staffRecord ? staffRecord._id : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: 'Mobile and password are required' });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'super_secret_secure_print_key_2026_antigravity',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Current User Profile
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
