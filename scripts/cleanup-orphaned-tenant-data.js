/**
 * Cleanup Orphaned Tenant Data Script
 *
 * This script removes all data (employees, timesheets, users, etc.)
 * that belong to tenants that no longer exist.
 *
 * Usage:
 *   node cleanup-orphaned-tenant-data.js
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/?authSource=admin';

// All databases and their collections that have tenantId
const DATABASES = {
  'hrm_tenants': ['tenants'],
  'hrm_auth': ['users', 'sessions', 'refreshtokens'],
  'hrm_employees': ['employees', 'departments', 'designations', 'documents'],
  'hrm_timesheets': ['timesheets', 'timeentries', 'projects'],
  'hrm_leave': ['leaverequests', 'leavebalances', 'leavetypes', 'holidays'],
  'hrm_attendance': ['attendances', 'shifts'],
  'hrm_payroll': ['payrolls', 'salaries', 'payrollruns'],
};

async function cleanupOrphanedTenantData() {
  let client = null;

  try {
    console.log('='.repeat(70));
    console.log('Orphaned Tenant Data Cleanup Script');
    console.log('='.repeat(70));
    console.log(`\nConnecting to MongoDB...`);

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected successfully!\n');

    // Step 1: Get all valid tenant IDs
    console.log('Step 1: Fetching all valid tenant IDs...');
    const tenantsDb = client.db('hrm_tenants');
    const tenants = await tenantsDb.collection('tenants').find({}, { projection: { _id: 1, slug: 1, name: 1 } }).toArray();
    const validTenantIds = new Set(tenants.map(t => t._id.toString()));

    console.log(`Found ${validTenantIds.size} valid tenants:`);
    tenants.slice(0, 10).forEach(t => console.log(`  - ${t.slug}: ${t.name}`));
    if (tenants.length > 10) console.log(`  ... and ${tenants.length - 10} more`);
    console.log('');

    // Step 2: Find and remove orphaned data from each database
    const summary = {};

    for (const [dbName, collections] of Object.entries(DATABASES)) {
      if (dbName === 'hrm_tenants') continue; // Skip tenants database

      console.log(`\nProcessing database: ${dbName}`);
      console.log('-'.repeat(50));

      const db = client.db(dbName);
      summary[dbName] = {};

      for (const collectionName of collections) {
        try {
          const collection = db.collection(collectionName);

          // Count total documents
          const totalCount = await collection.countDocuments({});

          if (totalCount === 0) {
            console.log(`  ${collectionName}: empty`);
            continue;
          }

          // Find documents with orphaned tenantId
          const allDocs = await collection.find({}, { projection: { tenantId: 1 } }).toArray();

          const orphanedIds = [];
          for (const doc of allDocs) {
            const tenantId = doc.tenantId?.toString();
            if (tenantId && !validTenantIds.has(tenantId)) {
              orphanedIds.push(doc._id);
            }
          }

          if (orphanedIds.length > 0) {
            // Delete orphaned documents
            const deleteResult = await collection.deleteMany({ _id: { $in: orphanedIds } });
            console.log(`  ${collectionName}: deleted ${deleteResult.deletedCount}/${totalCount} orphaned records`);
            summary[dbName][collectionName] = { deleted: deleteResult.deletedCount, total: totalCount };
          } else {
            console.log(`  ${collectionName}: ${totalCount} records (all valid)`);
            summary[dbName][collectionName] = { deleted: 0, total: totalCount };
          }
        } catch (error) {
          console.log(`  ${collectionName}: error - ${error.message}`);
        }
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(70));

    let totalDeleted = 0;
    for (const [dbName, collections] of Object.entries(summary)) {
      const dbDeleted = Object.values(collections).reduce((sum, c) => sum + (c.deleted || 0), 0);
      if (dbDeleted > 0) {
        console.log(`\n${dbName}:`);
        for (const [collName, stats] of Object.entries(collections)) {
          if (stats.deleted > 0) {
            console.log(`  - ${collName}: ${stats.deleted} deleted`);
            totalDeleted += stats.deleted;
          }
        }
      }
    }

    console.log(`\nTotal orphaned records deleted: ${totalDeleted}`);
    console.log('='.repeat(70));
    console.log('\nCleanup completed successfully!');

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the cleanup
cleanupOrphanedTenantData();
