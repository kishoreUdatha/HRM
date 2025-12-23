/**
 * Super Admin Seed Script
 * Creates a super admin user for platform administration
 *
 * Usage: node scripts/seed-super-admin.js
 *
 * Environment Variables:
 *   MONGODB_URI - MongoDB connection string (default: mongodb://localhost:27017)
 *   MONGODB_USER - MongoDB username (default: admin)
 *   MONGODB_PASS - MongoDB password (default: hrm_password_2024)
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_USER = process.env.MONGODB_USER || 'admin';
const MONGODB_PASS = process.env.MONGODB_PASS || 'hrm_password_2024';

// Database name
const AUTH_DATABASE = 'hrm_auth';

// Super Admin credentials
const SUPER_ADMIN = {
  email: 'superadmin@hrm-platform.com',
  password: 'SuperAdmin@123',
  firstName: 'Platform',
  lastName: 'Administrator',
};

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function seedSuperAdmin() {
  console.log('='.repeat(60));
  console.log('HRM Super Admin Seeding Script');
  console.log('='.repeat(60));
  console.log('');

  const connectionString = `mongodb://${MONGODB_USER}:${MONGODB_PASS}@${MONGODB_URI.replace('mongodb://', '')}?authSource=admin`;

  let client;
  try {
    client = new MongoClient(connectionString);
    await client.connect();
    console.log('Connected to MongoDB successfully!\n');

    const authDb = client.db(AUTH_DATABASE);
    const usersCollection = authDb.collection('users');

    // Check if super admin already exists
    const existingSuperAdmin = await usersCollection.findOne({
      email: SUPER_ADMIN.email,
      role: 'super_admin',
    });

    if (existingSuperAdmin) {
      console.log('Super Admin already exists!');
      console.log(`  Email: ${SUPER_ADMIN.email}`);
      console.log('  Password: (use existing password or reset it)');
      console.log('\nTo reset password, delete the user and run this script again.');
      return;
    }

    // Create super admin user
    console.log('Creating Super Admin user...');

    const hashedPassword = await hashPassword(SUPER_ADMIN.password);

    const superAdminUser = {
      _id: new ObjectId(),
      email: SUPER_ADMIN.email,
      password: hashedPassword,
      firstName: SUPER_ADMIN.firstName,
      lastName: SUPER_ADMIN.lastName,
      role: 'super_admin',
      permissions: ['*'], // All permissions
      isActive: true,
      status: 'active',
      isEmailVerified: true,
      tenantId: null, // Super admin is not tied to any tenant
      refreshTokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.insertOne(superAdminUser);

    console.log('\n' + '='.repeat(60));
    console.log('Super Admin created successfully!');
    console.log('='.repeat(60));
    console.log('\nLogin credentials:');
    console.log(`  URL: http://localhost:5173/super-admin/login`);
    console.log(`  Email: ${SUPER_ADMIN.email}`);
    console.log(`  Password: ${SUPER_ADMIN.password}`);
    console.log('\nIMPORTANT: Change the password after first login!');

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the seed function
seedSuperAdmin().catch(console.error);
