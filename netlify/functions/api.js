process.env.NETLIFY = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

let serverless;
try {
  serverless = require('serverless-http');
} catch (_) {
  serverless = require('../../backend/node_modules/serverless-http');
}
const app = require('../../backend/app');

module.exports.handler = serverless(app);
