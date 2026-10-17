process.env.NETLIFY = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const serverless = require('serverless-http');
const app = require('../../backend/app');

module.exports.handler = serverless(app);
