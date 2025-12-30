/**
 * Script to set up mobile login credentials for existing users
 * This adds mobileNumber and PIN (default: 1122) to all users
 *
 * Usage: node scripts/setup-mobile-login.js
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/hrm_auth?authSource=admin';
const DEFAULT_PIN = '1122';

async function setupMobileLogin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Hash the default PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(DEFAULT_PIN, salt);

    // Get all users without mobile credentials
    const users = await usersCollection.find({
      $or: [
        { mobileNumber: { $exists: false } },
        { pin: { $exists: false } }
      ]
    }).toArray();

    console.log(`Found ${users.length} users to update`);

    let updated = 0;
    for (const user of users) {
      // Generate a unique mobile number based on user's email or use a pattern
      // For demo purposes, we'll use the last 10 digits of the user's _id or a generated number
      const mobileNumber = generateMobileNumber(user, updated);

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            mobileNumber: mobileNumber,
            pin: hashedPin
          }
        }
      );

      console.log(`Updated user: ${user.email} -> Mobile: ${mobileNumber}, PIN: ${DEFAULT_PIN}`);
      updated++;
    }

    console.log(`\nSuccessfully updated ${updated} users`);
    console.log(`\nDefault PIN for all users: ${DEFAULT_PIN}`);
    console.log('\nUsers can now login with their mobile number and PIN.');

    // List all users with their mobile numbers
    console.log('\n--- User Mobile Numbers ---');
    const allUsers = await usersCollection.find({}, { projection: { email: 1, mobileNumber: 1, firstName: 1, lastName: 1 } }).toArray();
    allUsers.forEach(u => {
      console.log(`${u.firstName || ''} ${u.lastName || ''} (${u.email}): ${u.mobileNumber || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

function generateMobileNumber(user, index) {
  // Generate a 10-digit mobile number
  // Use pattern: 9XXXXXXXXX where X is based on index
  const base = 9000000000;
  const number = base + (index + 1) * 1000 + Math.floor(Math.random() * 999);
  return number.toString().substring(0, 10);
}

setupMobileLogin();
