const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Register as a Shop (Admin Only - Only Admins have access to add shops)
router.post('/register-shop', protect, authorize('ADMIN', 'MANAGER', 'DEVELOPER'), async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      phone,
      mobile,
      email,
      address,
      password,
      pricing,
      upiId,
      retentionMinutes
    } = req.body;

    const contactPhone = String(phone || mobile || '').replace(/\D/g, '').trim();

    if (!shopName || !ownerName || !contactPhone || !password || !address) {
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

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const Shop = require('../models/Shop');
    const Branch = require('../models/Branch');
    const Staff = require('../models/Staff');

    // Check if a Shop already exists with this phone
    const existingShop = await Shop.findOne({ phone: contactPhone });
    if (existingShop) {
      return res.status(400).json({
        success: false,
        message: `A print shop with mobile ${contactPhone} is already registered (${existingShop.name}). Please sign in.`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate unique slug
    const cleanShopName = shopName.trim();
    const baseSlug = cleanShopName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'shop';
    const uniqueSuffix = Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 5);
    const slug = `${baseSlug}-${contactPhone.slice(-4)}-${uniqueSuffix}`;

    const newShop = await Shop.create({
      name: cleanShopName,
      slug: slug,
      ownerName: ownerName.trim(),
      phone: contactPhone,
      email: (email || '').trim().toLowerCase(),
      address: address.trim(),
      passwordHash: passwordHash,
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

    // Create Main Counter Branch
    const branch = await Branch.create({
      shopId: newShop._id,
      name: `${cleanShopName} - Main Counter`,
      address: address.trim(),
      code: `BR-${contactPhone.slice(-4)}`,
      status: 'ACTIVE'
    });

    // Synchronize User and Staff records for full compatibility
    let user = await User.findOne({ mobile: contactPhone });
    if (!user) {
      user = await User.create({
        name: ownerName.trim(),
        mobile: contactPhone,
        email: (email || '').trim().toLowerCase(),
        passwordHash: passwordHash,
        role: 'STAFF'
      });
    } else {
      user.name = ownerName.trim();
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

    // Issue JWT token
    const token = jwt.sign(
      { id: newShop._id, role: 'SHOPKEEPER' },
      process.env.JWT_SECRET || 'super_secret_secure_print_key_2026_antigravity',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: `✅ Shop '${newShop.name}' registered successfully!`,
      token,
      shop: {
        id: newShop._id,
        _id: newShop._id,
        name: newShop.name,
        slug: newShop.slug,
        ownerName: newShop.ownerName,
        phone: newShop.phone,
        email: newShop.email,
        address: newShop.address,
        branchId: branch._id,
        settings: newShop.settings
      },
      user: {
        id: newShop._id,
        _id: newShop._id,
        name: newShop.ownerName,
        shopName: newShop.name,
        ownerName: newShop.ownerName,
        mobile: newShop.phone,
        phone: newShop.phone,
        email: newShop.email,
        role: 'SHOPKEEPER',
        staffId: staff._id,
        shop: newShop
      }
    });
  } catch (err) {
    console.error('[Register Shop Error]:', err);
    res.status(500).json({ success: false, message: err.message || 'Shop registration failed' });
  }
});

// Register Customer (Public registration is for Customers only; shops & staff are created by Admin)
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').trim();

    const existingUser = await User.findOne({ mobile: cleanMobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this mobile number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Public self-registration only ever creates customer accounts
    const user = await User.create({
      name,
      mobile: cleanMobile,
      email: email || '',
      passwordHash,
      role: 'CUSTOMER'
    });

    const token = jwt.sign(
      { id: user._id, role: 'CUSTOMER' },
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
        role: 'CUSTOMER'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    let { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both Mobile Number and Password' });
    }

    mobile = String(mobile).replace(/\D/g, '').trim();
    password = String(password).trim();

    const Shop = require('../models/Shop');

    let account = null;
    let accountType = '';

    // Search by mobile phone number
    const shopAccount = await Shop.findOne({ phone: mobile });
    if (shopAccount) {
      account = {
        _id: shopAccount._id,
        name: shopAccount.ownerName || shopAccount.name,
        shopName: shopAccount.name,
        mobile: shopAccount.phone,
        email: shopAccount.email,
        role: 'SHOPKEEPER',
        passwordHash: shopAccount.passwordHash
      };
      accountType = 'SHOP';
    } else {
      const userAccount = await User.findOne({ mobile });
      if (userAccount) {
        account = userAccount;
        accountType = 'USER';
      }
    }

    console.log(`[Auth Login Attempt]: Mobile=${mobile}, Found Account=${account ? accountType : 'NONE'}`);

    if (!account) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, account.passwordHash);
    console.log(`[Auth Login Attempt]: Password Match=${isMatch}`);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const role = account.role || (accountType === 'SHOP' ? 'SHOPKEEPER' : 'CUSTOMER');
    const token = jwt.sign(
      { id: account._id, role: role },
      process.env.JWT_SECRET || 'super_secret_secure_print_key_2026_antigravity',
      { expiresIn: '7d' }
    );

    const userResponseObj = {
      id: account._id,
      name: account.name,
      mobile: account.mobile || account.phone,
      email: account.email || '',
      role: role
    };

    if (accountType === 'SHOP') {
      userResponseObj.shopId = account._id;
      userResponseObj.shopName = account.shopName || account.name;
      userResponseObj.name = account.ownerName || account.name;
      userResponseObj.ownerName = account.ownerName || account.name;
      userResponseObj.shop = shopAccount;
    } else if (accountType === 'USER' && ['STAFF', 'MANAGER'].includes(role)) {
      const Staff = require('../models/Staff');
      const staffMember = await Staff.findOne({ userId: account._id }).populate('shopId');
      if (staffMember && staffMember.shopId) {
        userResponseObj.shopId = staffMember.shopId._id;
        userResponseObj.shopName = staffMember.shopId.name;
        userResponseObj.shop = staffMember.shopId;
        userResponseObj.staffId = staffMember._id;
      }
    }

    res.json({
      success: true,
      token,
      user: userResponseObj
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Current User Profile
router.get('/me', protect, async (req, res) => {
  try {
    let userData = req.user.toObject ? req.user.toObject() : { ...req.user };
    if (['SHOPKEEPER', 'STAFF', 'MANAGER'].includes(req.user.role)) {
      if (req.user.shopName) {
        userData.shopName = req.user.shopName;
      } else if (req.user.name && req.user.ownerName) {
        userData.shopName = req.user.name;
        userData.name = req.user.ownerName;
      } else {
        const Staff = require('../models/Staff');
        const staffRecord = await Staff.findOne({ userId: req.user._id }).populate('shopId');
        if (staffRecord && staffRecord.shopId) {
          userData.shopName = staffRecord.shopId.name;
          userData.shop = staffRecord.shopId;
          userData.staffId = staffRecord._id;
        }
      }
    }
    res.json({ success: true, user: userData });
  } catch (err) {
    res.json({ success: true, user: req.user });
  }
});

module.exports = router;
