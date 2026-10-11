const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const targetUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secure_print_shop';
  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    if (process.env.MONGODB_URI) {
      console.error(`[MongoDB Connection Error]: ${error.message}`);
      process.exit(1);
    }
    console.log(`[MongoDB]: Local MongoDB is not running (127.0.0.1:27017).`);
    console.log(`[MongoDB]: Starting embedded in-memory MongoDB server...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: { dbName: 'secure_print_shop' }
      });
      const memoryUri = mongodInstance.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`✅ [Embedded MongoDB Connected]: In-Memory instance running at ${memoryUri}`);

      // Seed initial data so all user roles and sample shops are immediately ready
      try {
        const { seedData } = require('../seed');
        await seedData();
      } catch (seedErr) {
        console.warn('[Seeder Notice]:', seedErr.message);
      }

      return conn;
    } catch (memErr) {
      console.error(`[MongoDB Connection Error]: ${memErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
