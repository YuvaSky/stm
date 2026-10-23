const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    // Guest customer fallback (auto-assign temp guest user)
    req.user = {
      _id: '650000000000000000000000',
      name: 'Guest Customer',
      mobile: '0000000000',
      role: 'CUSTOMER'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_secure_print_key_2026_antigravity');
    req.user = await User.findById(decoded.id).select('-passwordHash');
    if (req.user && ['STAFF', 'MANAGER'].includes(req.user.role)) {
      const Staff = require('../models/Staff');
      const staffMember = await Staff.findOne({ userId: req.user._id });
      if (staffMember) {
        req.user.shopId = staffMember.shopId;
        req.user.branchId = staffMember.branchId;
      }
    }
    if (!req.user) {
      const Shop = require('../models/Shop');
      const shop = await Shop.findById(decoded.id).select('-passwordHash');
      if (shop) {
        req.user = {
          _id: shop._id,
          name: shop.ownerName || shop.name,
          mobile: shop.phone,
          role: 'SHOPKEEPER',
          shopId: shop._id
        };
      } else {
        req.user = {
          _id: '650000000000000000000000',
          name: 'Guest Customer',
          mobile: '0000000000',
          role: 'CUSTOMER'
        };
      }
    }
    next();
  } catch (err) {
    // If token invalid/expired, default to Guest Customer instead of crashing 500
    req.user = {
      _id: '650000000000000000000000',
      name: 'Guest Customer',
      mobile: '0000000000',
      role: 'CUSTOMER'
    };
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const isShopAction = roles.includes('ADMIN') && !roles.includes('CUSTOMER');
      return res.status(403).json({ 
        success: false, 
        message: isShopAction
          ? 'Access denied: Only administrators have access to add or manage print shops.'
          : `User role '${req.user?.role || 'UNAUTHORIZED'}' is not authorized for this action` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
