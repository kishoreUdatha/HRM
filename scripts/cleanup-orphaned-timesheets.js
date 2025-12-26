/**
 * Cleanup Orphaned Timesheets Script
 *
 * This script removes timesheet records that don't have corresponding employees.
 * It connects to both the employees and timesheets databases, finds orphaned records,
 * and removes them.
 *
 * Usage:
 *   MONGODB_URI=<your-connection-string> node cleanup-orphaned-timesheets.js
 *
 * For internal MongoDB (in AKS cluster):
 *   MONGODB_URI="mongodb://root:HRM_MongoDB_2024_Secure!@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin" node cleanup-orphaned-timesheets.js
 */

const { MongoClient, ObjectId } = require('mongodb');

// Get MongoDB URI from environment or use default local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/?authSource=admin';

// Database names
const EMPLOYEES_DB = 'hrm_employees';
const TIMESHEETS_DB = 'hrm_timesheets';

async function cleanupOrphanedTimesheets() {
  let client = null;

  try {
    console.log('='.repeat(60));
    console.log('Orphaned Timesheet Cleanup Script');
    console.log('='.repeat(60));
    console.log(`\nConnecting to MongoDB...`);

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected successfully!\n');

    // Get database references
    const employeesDb = client.db(EMPLOYEES_DB);
    const timesheetsDb = client.db(TIMESHEETS_DB);

    // Get collections
    const employeesCollection = employeesDb.collection('employees');
    const timesheetsCollection = timesheetsDb.collection('timesheets');
    const timeEntriesCollection = timesheetsDb.collection('timeentries');
    const projectsCollection = timesheetsDb.collection('projects');

    // Step 1: Get all valid employee IDs
    console.log('Step 1: Fetching all valid employee IDs...');
    const employees = await employeesCollection.find({}, { projection: { _id: 1 } }).toArray();
    const validEmployeeIds = new Set(employees.map(e => e._id.toString()));
    console.log(`Found ${validEmployeeIds.size} valid employees\n`);

    // Step 2: Get all timesheets
    console.log('Step 2: Analyzing timesheets...');
    const allTimesheets = await timesheetsCollection.find({}).toArray();
    console.log(`Total timesheets in database: ${allTimesheets.length}`);

    // Step 3: Find orphaned timesheets (employee IDs that don't exist)
    const orphanedTimesheets = [];
    const validTimesheets = [];

    for (const timesheet of allTimesheets) {
      const employeeId = timesheet.employeeId?.toString();
      if (!employeeId || !validEmployeeIds.has(employeeId)) {
        orphanedTimesheets.push(timesheet);
      } else {
        validTimesheets.push(timesheet);
      }
    }

    console.log(`Valid timesheets: ${validTimesheets.length}`);
    console.log(`Orphaned timesheets: ${orphanedTimesheets.length}\n`);

    // Step 4: Show orphaned timesheet details
    if (orphanedTimesheets.length > 0) {
      console.log('Orphaned Timesheet Details:');
      console.log('-'.repeat(60));
      for (const ts of orphanedTimesheets) {
        console.log(`  ID: ${ts._id}`);
        console.log(`  Employee ID: ${ts.employeeId || 'NULL'}`);
        console.log(`  Week: ${ts.weekStartDate ? new Date(ts.weekStartDate).toLocaleDateString() : 'N/A'} - ${ts.weekEndDate ? new Date(ts.weekEndDate).toLocaleDateString() : 'N/A'}`);
        console.log(`  Status: ${ts.status || 'N/A'}`);
        console.log(`  Total Hours: ${ts.totalHours || 0}`);
        console.log('-'.repeat(60));
      }
    }

    // Step 5: Delete orphaned timesheets
    if (orphanedTimesheets.length > 0) {
      console.log('\nStep 3: Deleting orphaned timesheets...');
      const orphanedIds = orphanedTimesheets.map(ts => ts._id);
      const deleteResult = await timesheetsCollection.deleteMany({ _id: { $in: orphanedIds } });
      console.log(`Deleted ${deleteResult.deletedCount} orphaned timesheets\n`);
    } else {
      console.log('\nNo orphaned timesheets to delete.\n');
    }

    // Step 6: Check and clean orphaned time entries
    console.log('Step 4: Analyzing time entries...');
    const allTimeEntries = await timeEntriesCollection.find({}).toArray();
    console.log(`Total time entries in database: ${allTimeEntries.length}`);

    const orphanedTimeEntries = allTimeEntries.filter(te => {
      const employeeId = te.employeeId?.toString();
      return !employeeId || !validEmployeeIds.has(employeeId);
    });

    console.log(`Orphaned time entries: ${orphanedTimeEntries.length}`);

    if (orphanedTimeEntries.length > 0) {
      console.log('\nDeleting orphaned time entries...');
      const orphanedEntryIds = orphanedTimeEntries.map(te => te._id);
      const deleteEntriesResult = await timeEntriesCollection.deleteMany({ _id: { $in: orphanedEntryIds } });
      console.log(`Deleted ${deleteEntriesResult.deletedCount} orphaned time entries\n`);
    }

    // Step 7: Clean orphaned project members
    console.log('Step 5: Cleaning orphaned project members...');
    const projects = await projectsCollection.find({}).toArray();
    let cleanedProjectsCount = 0;

    for (const project of projects) {
      let hasOrphanedMembers = false;

      // Check manager
      if (project.managerId && !validEmployeeIds.has(project.managerId.toString())) {
        hasOrphanedMembers = true;
      }

      // Check members
      const validMembers = (project.members || []).filter(m => {
        const memberId = m.employeeId?.toString();
        return memberId && validEmployeeIds.has(memberId);
      });

      if (project.members && validMembers.length !== project.members.length) {
        hasOrphanedMembers = true;
      }

      if (hasOrphanedMembers) {
        await projectsCollection.updateOne(
          { _id: project._id },
          {
            $set: {
              members: validMembers,
              // Only update managerId if it's orphaned
              ...(project.managerId && !validEmployeeIds.has(project.managerId.toString()) ? { managerId: null } : {})
            }
          }
        );
        cleanedProjectsCount++;
      }
    }

    console.log(`Cleaned ${cleanedProjectsCount} projects with orphaned members\n`);

    // Final summary
    console.log('='.repeat(60));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Valid employees: ${validEmployeeIds.size}`);
    console.log(`Timesheets remaining: ${validTimesheets.length}`);
    console.log(`Orphaned timesheets deleted: ${orphanedTimesheets.length}`);
    console.log(`Orphaned time entries deleted: ${orphanedTimeEntries.length}`);
    console.log(`Projects cleaned: ${cleanedProjectsCount}`);
    console.log('='.repeat(60));

    // Show remaining valid timesheets
    if (validTimesheets.length > 0) {
      console.log('\nRemaining Valid Timesheets:');
      console.log('-'.repeat(60));

      // Get employee names for valid timesheets
      const employeeIds = [...new Set(validTimesheets.map(ts => ts.employeeId?.toString()).filter(Boolean))];
      const employeeDetails = await employeesCollection.find(
        { _id: { $in: employeeIds.map(id => new ObjectId(id)) } },
        { projection: { _id: 1, firstName: 1, lastName: 1, employeeCode: 1 } }
      ).toArray();

      const employeeMap = new Map(employeeDetails.map(e => [e._id.toString(), e]));

      for (const ts of validTimesheets) {
        const emp = employeeMap.get(ts.employeeId?.toString());
        const empName = emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeCode})` : 'Unknown';
        console.log(`  ${empName}`);
        console.log(`    Week: ${ts.weekStartDate ? new Date(ts.weekStartDate).toLocaleDateString() : 'N/A'} - ${ts.weekEndDate ? new Date(ts.weekEndDate).toLocaleDateString() : 'N/A'}`);
        console.log(`    Status: ${ts.status || 'N/A'}, Hours: ${ts.totalHours || 0}`);
        console.log('-'.repeat(60));
      }
    }

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
cleanupOrphanedTimesheets();
