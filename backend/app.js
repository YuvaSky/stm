const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const shopkeeperRoutes = require('./routes/shopkeeper');
const agentRoutes = require('./routes/agent');
const adminRoutes = require('./routes/admin');

const app = express();

// Ensure DB is connected for serverless invocations
let isDbConnecting = null;
app.use(async (req, res, next) => {
  try {
    if (!isDbConnecting) {
      isDbConnecting = connectDB().then(async () => {
        try {
          const User = require('./models/User');
          const bcrypt = require('bcryptjs');
          const existingDev = await User.findOne({ mobile: '8766341212' });
          if (!existingDev) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('admin@secureprint', salt);
            await User.create({
              name: 'System Developer Admin',
              mobile: '8766341212',
              email: 'developer@secureprint.com',
              passwordHash,
              role: 'DEVELOPER'
            });
            console.log('✅ Default Developer Account created: 8766341212 / admin@secureprint');
          }
        } catch (seedErr) {
          console.error('Seed dev error:', seedErr.message);
        }
      });
    }
    await isDbConnecting;
    next();
  } catch (err) {
    console.error('DB Middleware Error:', err.message);
    next(err);
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-agent-secret']
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check endpoint
const healthHandler = (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Secure Print & Photocopy Shop System API',
    mode: process.env.NETLIFY ? 'NETLIFY_SERVERLESS' : 'NODE_EXPRESS',
    timestamp: new Date()
  });
};

app.get('/api/health', healthHandler);
app.get('/.netlify/functions/api/health', healthHandler);
app.get('/health', healthHandler);

// Create router to mount on multiple prefixes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/customer', customerRoutes);
apiRouter.use('/shopkeeper', shopkeeperRoutes);
apiRouter.use('/agent', agentRoutes);
apiRouter.use('/admin', adminRoutes);

// Mount router on /api and /.netlify/functions/api
app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);
app.use('/', apiRouter);

module.exports = app;
