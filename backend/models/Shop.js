const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, default: '' },
  ownerName: { type: String, default: 'Shop Owner' },
  email: { type: String, default: '' },
  passwordHash: { type: String, default: '' },
  role: { type: String, default: 'SHOPKEEPER' },
  logo: { type: String, default: '' },
  address: { type: String, default: 'Main Counter Address' },
  phone: { type: String, required: true },
  subscriptionStatus: { type: String, enum: ['ACTIVE', 'INACTIVE', 'TRIAL', 'EXPIRED'], default: 'ACTIVE' },
  subscriptionPlan: { type: String, default: 'PRO' },
  settings: {
    retentionMinutes: { type: Number, default: 60 },
    autoPrint: { type: Boolean, default: true },
    preferredPrinter: { type: String, default: 'AUTO' },
    pricing: {
      A4_BW: { type: Number, default: 2 },
      A4_COLOUR: { type: Number, default: 10 },
      A3_BW: { type: Number, default: 5 },
      A3_COLOUR: { type: Number, default: 20 },
      LEGAL_BW: { type: Number, default: 3 },
      LEGAL_COLOUR: { type: Number, default: 12 },
      GLOSSY_COLOUR: { type: Number, default: 25 },
      doubleSidedMultiplier: { type: Number, default: 1.8 },
      customItems: [
        {
          id: { type: String },
          name: { type: String, required: true },
          price: { type: Number, required: true },
          unit: { type: String, default: 'per document' }, // 'per document' | 'per page' | 'flat'
          category: { type: String, default: 'FINISHING' }, // 'BINDING' | 'LAMINATION' | 'PAPER' | 'FINISHING' | 'OTHER'
          description: { type: String, default: '' },
          enabled: { type: Boolean, default: true }
        }
      ]
    },
    paymentGateway: {
      razorpayKeyId: { type: String, default: '' },
      razorpayKeySecret: { type: String, default: '' },
      razorpayAccountId: { type: String, default: '' }, // Razorpay Route Linked Account ID (e.g. acc_102938475)
      bankAccountNumber: { type: String, default: '' },
      bankIfsc: { type: String, default: '' },
      upiId: { type: String, default: '' }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
