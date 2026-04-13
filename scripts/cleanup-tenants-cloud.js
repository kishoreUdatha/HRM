/**
 * Cleanup All Tenant Data from Cloud Database
 * Keeps: Super Admin users only
 * Removes: All tenants, regular users, employees, billing, payroll data, etc.
 *
 * Usage: node scripts/cleanup-tenants-cloud.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function cleanupCloudDatabase() {
  console.log('===========================================');
  console.log('  HRZIO Cloud Database Cleanup Script');
  console.log('===========================================\n');

  if (!MONGODB_URI || !MONGODB_URI.includes('cosmos.azure.com')) {
    console.error('ERROR: This script is intended for cloud database only.');
    console.error('Please ensure MONGODB_URI points to Azure Cosmos DB.');
    process.exit(1);
  }

  console.log('Connecting to cloud database...');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const db = mongoose.connection.db;

    // List of databases to clean
    const databases = [
      'hrm_tenants',
      'hrm_auth',
      'hrm_employees',
      'hrm_attendance',
      'hrm_payroll',
      'hrm_billing',
      'hrm_leave',
      'hrm_notifications',
      'hrm_documents'
    ];

    console.log('Starting cleanup...\n');

    // 1. Clean hrm_tenants - Remove ALL tenants
    console.log('1. Cleaning hrm_tenants database...');
    try {
      const tenantsDb = mongoose.connection.useDb('hrm_tenants');
      const tenantsCollection = tenantsDb.collection('tenants');
      const tenantCount = await tenantsCollection.countDocuments();
      console.log(`   Found ${tenantCount} tenants`);
      if (tenantCount > 0) {
        const result = await tenantsCollection.deleteMany({});
        console.log(`   Deleted ${result.deletedCount} tenants`);
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // 2. Clean hrm_auth - Keep only super_admin users
    console.log('\n2. Cleaning hrm_auth database (keeping super admins)...');
    try {
      const authDb = mongoose.connection.useDb('hrm_auth');
      const usersCollection = authDb.collection('users');

      // Count super admins
      const superAdminCount = await usersCollection.countDocuments({ role: 'super_admin' });
      console.log(`   Found ${superAdminCount} super admin(s) - these will be preserved`);

      // Count regular users
      const regularUserCount = await usersCollection.countDocuments({ role: { $ne: 'super_admin' } });
      console.log(`   Found ${regularUserCount} regular users to delete`);

      if (regularUserCount > 0) {
        const result = await usersCollection.deleteMany({ role: { $ne: 'super_admin' } });
        console.log(`   Deleted ${result.deletedCount} regular users`);
      }

      // Also clean refresh tokens (except for super admins)
      try {
        const tokensCollection = authDb.collection('refreshtokens');
        const tokenCount = await tokensCollection.countDocuments();
        if (tokenCount > 0) {
          // Get super admin user IDs
          const superAdmins = await usersCollection.find({ role: 'super_admin' }).toArray();
          const superAdminIds = superAdmins.map(sa => sa._id.toString());

          const tokenResult = await tokensCollection.deleteMany({
            userId: { $nin: superAdminIds }
          });
          console.log(`   Deleted ${tokenResult.deletedCount} refresh tokens`);
        }
      } catch (e) {
        console.log(`   Note: Could not clean refresh tokens - ${e.message}`);
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // 3. Clean hrm_employees - Remove ALL
    console.log('\n3. Cleaning hrm_employees database...');
    try {
      const employeesDb = mongoose.connection.useDb('hrm_employees');
      const collections = ['employees', 'departments', 'designations', 'shifts'];
      for (const collName of collections) {
        try {
          const coll = employeesDb.collection(collName);
          const count = await coll.countDocuments();
          if (count > 0) {
            const result = await coll.deleteMany({});
            console.log(`   Deleted ${result.deletedCount} from ${collName}`);
          }
        } catch (e) {
          // Collection might not exist
        }
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // 4. Clean hrm_attendance - Remove ALL
    console.log('\n4. Cleaning hrm_attendance database...');
    try {
      const attendanceDb = mongoose.connection.useDb('hrm_attendance');
      const collections = ['attendances', 'attendancerecords', 'faceenrollments'];
      for (const collName of collections) {
        try {
          const coll = attendanceDb.collection(collName);
          const count = await coll.countDocuments();
          if (count > 0) {
            const result = await coll.deleteMany({});
            console.log(`   Deleted ${result.deletedCount} from ${collName}`);
          }
        } catch (e) {
          // Collection might not exist
        }
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // 5. Clean hrm_payroll - Remove ALL
    console.log('\n5. Cleaning hrm_payroll database...');
    try {
      const payrollDb = mongoose.connection.useDb('hrm_payroll');
      const collections = ['payrolls', 'payslips', 'salarystructures', 'taxdeclarations', 'payrollaudits'];
      for (const collName of collections) {
        try {
          const coll = payrollDb.collection(collName);
          const count = await coll.countDocuments();
          if (count > 0) {
            const result = await coll.deleteMany({});
            console.log(`   Deleted ${result.deletedCount} from ${collName}`);
          }
        } catch (e) {
          // Collection might not exist
        }
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // 6. Clean hrm_billing - Remove ALL subscriptions and invoices
    console.log('\n6. Cleaning hrm_billing database...');
    try {
      const billingDb = mongoose.connection.useDb('hrm_billing');
      const collections = ['subscriptions', 'invoices', 'payments', 'subscriptionplans'];
      for (const collName of collections) {
        try {
          const coll = billingDb.collection(collName);
          const count = await coll.countDocuments();
          if (count > 0) {
            const result = await coll.deleteMany({});
            console.log(`   Deleted ${result.deletedCount} from ${collName}`);
          }
        } catch (e) {
          // Collection might not exist
        }
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // 7. Clean hrm_leave - Remove ALL
    console.log('\n7. Cleaning hrm_leave database...');
    try {
      const leaveDb = mongoose.connection.useDb('hrm_leave');
      const collections = ['leaves', 'leavebalances', 'leavetypes', 'holidays'];
      for (const collName of collections) {
        try {
          const coll = leaveDb.collection(collName);
          const count = await coll.countDocuments();
          if (count > 0) {
            const result = await coll.deleteMany({});
            console.log(`   Deleted ${result.deletedCount} from ${collName}`);
          }
        } catch (e) {
          // Collection might not exist
        }
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    // 8. Clean hrm_notifications - Remove ALL
    console.log('\n8. Cleaning hrm_notifications database...');
    try {
      const notifDb = mongoose.connection.useDb('hrm_notifications');
      const collections = ['notifications', 'pushsubscriptions'];
      for (const collName of collections) {
        try {
          const coll = notifDb.collection(collName);
          const count = await coll.countDocuments();
          if (count > 0) {
            const result = await coll.deleteMany({});
            console.log(`   Deleted ${result.deletedCount} from ${collName}`);
          }
        } catch (e) {
          // Collection might not exist
        }
      }
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }

    console.log('\n===========================================');
    console.log('  Cleanup Complete!');
    console.log('===========================================\n');

    // Print remaining super admin info
    console.log('Remaining Super Admin(s):');
    try {
      const authDb = mongoose.connection.useDb('hrm_auth');
      const usersCollection = authDb.collection('users');
      const superAdmins = await usersCollection.find({ role: 'super_admin' }).toArray();
      superAdmins.forEach(admin => {
        console.log(`  - Email: ${admin.email}`);
        console.log(`    Name: ${admin.firstName} ${admin.lastName}`);
      });
    } catch (e) {
      console.log('  Could not fetch super admin details');
    }

    console.log('\nSuper Admin Login URL: https://hrzio.com/super-admin/login');

  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database.');
    process.exit(0);
  }
}

// Run the cleanup
cleanupCloudDatabase();
