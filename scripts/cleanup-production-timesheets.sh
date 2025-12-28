#!/bin/bash
# ===========================================
# Production Timesheet Cleanup Script
# ===========================================
# Run this script on the production server (135.171.160.105)
# to clean up orphaned timesheet data
#
# Usage: bash cleanup-production-timesheets.sh
# ===========================================

echo "==================================================="
echo "Production Timesheet Cleanup"
echo "==================================================="

# Get MongoDB credentials from docker-compose
MONGO_USER=${MONGODB_ROOT_USERNAME:-admin}
MONGO_PASS=${MONGODB_ROOT_PASSWORD:-hrm_password_2024}
MONGO_HOST="localhost"
MONGO_PORT="27017"

echo "Connecting to MongoDB..."

# Run cleanup script inside MongoDB
docker exec -i hrm-mongodb mongosh --username $MONGO_USER --password $MONGO_PASS --authenticationDatabase admin <<'EOF'

// Switch to tenants DB to get valid tenant IDs
use hrm_tenants;
const validTenants = db.tenants.find({}, {_id: 1}).toArray();
const validTenantIds = validTenants.map(t => t._id);
print(`Found ${validTenantIds.length} valid tenants`);

// Clean hrm_timesheets database
use hrm_timesheets;
print("\n--- Cleaning hrm_timesheets ---");

// Get all timesheets and check for orphans
const timesheets = db.timesheets.find({}).toArray();
const orphanedTimesheets = timesheets.filter(ts => {
    const tenantId = ts.tenantId;
    return !validTenantIds.some(vt => vt.equals(tenantId));
});
print(`Total timesheets: ${timesheets.length}`);
print(`Orphaned timesheets: ${orphanedTimesheets.length}`);

if (orphanedTimesheets.length > 0) {
    const orphanedIds = orphanedTimesheets.map(ts => ts._id);
    const result = db.timesheets.deleteMany({_id: {$in: orphanedIds}});
    print(`Deleted ${result.deletedCount} orphaned timesheets`);
}

// Clean projects
const projects = db.projects.find({}).toArray();
const orphanedProjects = projects.filter(p => {
    const tenantId = p.tenantId;
    return !validTenantIds.some(vt => vt.equals(tenantId));
});
print(`Orphaned projects: ${orphanedProjects.length}`);
if (orphanedProjects.length > 0) {
    const result = db.projects.deleteMany({_id: {$in: orphanedProjects.map(p => p._id)}});
    print(`Deleted ${result.deletedCount} orphaned projects`);
}

// Clean hrm_employees database
use hrm_employees;
print("\n--- Cleaning hrm_employees ---");

const employees = db.employees.find({}).toArray();
const orphanedEmployees = employees.filter(e => {
    const tenantId = e.tenantId;
    return !validTenantIds.some(vt => vt.equals(tenantId));
});
print(`Total employees: ${employees.length}`);
print(`Orphaned employees: ${orphanedEmployees.length}`);
if (orphanedEmployees.length > 0) {
    const result = db.employees.deleteMany({_id: {$in: orphanedEmployees.map(e => e._id)}});
    print(`Deleted ${result.deletedCount} orphaned employees`);
}

// Clean departments
const departments = db.departments.find({}).toArray();
const orphanedDepts = departments.filter(d => {
    const tenantId = d.tenantId;
    return !validTenantIds.some(vt => vt.equals(tenantId));
});
print(`Orphaned departments: ${orphanedDepts.length}`);
if (orphanedDepts.length > 0) {
    const result = db.departments.deleteMany({_id: {$in: orphanedDepts.map(d => d._id)}});
    print(`Deleted ${result.deletedCount} orphaned departments`);
}

// Clean hrm_auth database
use hrm_auth;
print("\n--- Cleaning hrm_auth ---");

const users = db.users.find({}).toArray();
const orphanedUsers = users.filter(u => {
    const tenantId = u.tenantId;
    return !validTenantIds.some(vt => vt.equals(tenantId));
});
print(`Total users: ${users.length}`);
print(`Orphaned users: ${orphanedUsers.length}`);
if (orphanedUsers.length > 0) {
    const result = db.users.deleteMany({_id: {$in: orphanedUsers.map(u => u._id)}});
    print(`Deleted ${result.deletedCount} orphaned users`);
}

// Clean hrm_attendance database
use hrm_attendance;
print("\n--- Cleaning hrm_attendance ---");

const attendances = db.attendances.find({}).toArray();
const orphanedAttendances = attendances.filter(a => {
    const tenantId = a.tenantId;
    return !validTenantIds.some(vt => vt.equals(tenantId));
});
print(`Total attendances: ${attendances.length}`);
print(`Orphaned attendances: ${orphanedAttendances.length}`);
if (orphanedAttendances.length > 0) {
    const result = db.attendances.deleteMany({_id: {$in: orphanedAttendances.map(a => a._id)}});
    print(`Deleted ${result.deletedCount} orphaned attendances`);
}

// Clean hrm_payroll database
use hrm_payroll;
print("\n--- Cleaning hrm_payroll ---");

const payrolls = db.payrolls.find({}).toArray();
const orphanedPayrolls = payrolls.filter(p => {
    const tenantId = p.tenantId;
    return !validTenantIds.some(vt => vt.equals(tenantId));
});
print(`Total payrolls: ${payrolls.length}`);
print(`Orphaned payrolls: ${orphanedPayrolls.length}`);
if (orphanedPayrolls.length > 0) {
    const result = db.payrolls.deleteMany({_id: {$in: orphanedPayrolls.map(p => p._id)}});
    print(`Deleted ${result.deletedCount} orphaned payrolls`);
}

print("\n=================================================");
print("Cleanup completed!");
print("=================================================");

EOF

echo ""
echo "Done! Restart the services to reflect changes:"
echo "docker-compose restart timesheet-service"
