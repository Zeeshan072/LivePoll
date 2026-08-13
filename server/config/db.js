// ============================================================
// config/db.js — MongoDB Connection Manager
// ============================================================
// Exports a single async function: connectDB()
//
// How it works:
//   1. Reads MONGO_URI from the .env file (loaded in server.js)
//   2. Uses Mongoose to open a connection to MongoDB Atlas
//   3. Logs success (with the host name) or failure
//   4. On failure → exits the process so the app never starts
//      without a working database
//
// IMPORTANT: Never paste your connection string here directly.
//            Always keep it in server/.env which is .gitignored.
// ============================================================

const mongoose = require('mongoose');

const connectDB = async () => {
  // Guard: fail fast with a helpful message if the env var is missing
  // or still holds the placeholder text from .env.example
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('your_mongodb')) {
    console.error(
      '\n❌ [MongoDB] MONGO_URI is not set.\n' +
      '   Open server/.env and replace the placeholder with your\n' +
      '   real MongoDB Atlas connection string.\n' +
      '   Example:\n' +
      '   MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/livepoll?retryWrites=true&w=majority\n'
    );
    process.exit(1);
  }

  try {
    // mongoose.connect() resolves with a MongooseConnection object.
    // We pass no extra options — Mongoose 7+ uses the new connection
    // engine by default, so the old useNewUrlParser / useUnifiedTopology
    // flags are no longer needed.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`\n✅ [MongoDB] Connected → ${conn.connection.host}`);
    console.log(`   Database name: ${conn.connection.name}\n`);
  } catch (error) {
    // Common causes:
    //   • Wrong username / password in the connection string
    //   • Your IP is not whitelisted in Atlas Network Access
    //   • The cluster URL is incorrect
    console.error(`\n❌ [MongoDB] Connection failed: ${error.message}`);
    console.error(
      '   Tip: Check your MONGO_URI in server/.env and make sure\n' +
      '   your current IP is whitelisted in MongoDB Atlas → Network Access.\n'
    );
    // Exit with code 1 (non-zero = error) so the process doesn't
    // silently continue without a database connection.
    process.exit(1);
  }
};

module.exports = connectDB;
