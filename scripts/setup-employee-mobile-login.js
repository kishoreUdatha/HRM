/**
 * Script to set up mobile login credentials for all employees across all tenants
 * This creates auth users for employees if they don't exist and sets up mobile/PIN login
 *
 * Usage: node scripts/setup-employee-mobile-login.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const AUTH_DB_URI = process.env.AUTH_DB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/hrm_auth?authSource=admin';
const EMPLOYEE_DB_URI = process.env.EMPLOYEE_DB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/hrm_employees?authSource=admin';

// Default PINs: 4499 for admin roles, 1122 for regular employees
const DEFAULT_ADMIN_PIN = '4499';
const DEFAULT_EMPLOYEE_PIN = '1122';
const DEFAULT_PASSWORD = 'Employee@123';
const ADMIN_DESIGNATIONS = ['CEO', 'CTO', 'CFO', 'COO', 'Director', 'Manager', 'HR Manager', 'Admin', 'Administrator', 'Tenant Admin'];

async function setupEmployeeMobileLogin() {
  const authClient = new MongoClient(AUTH_DB_URI);
  const employeeClient = new MongoClient(EMPLOYEE_DB_URI);

  try {
    await authClient.connect();
    await employeeClient.connect();
    console.log('Connected to MongoDB databases');

    const authDb = authClient.db();
    const employeeDb = employeeClient.db();

    const usersCollection = authDb.collection('users');
    const employeesCollection = employeeDb.collection('employees');

    // Hash the default PINs and password
    const pinSalt = await bcrypt.genSalt(10);
    const hashedAdminPin = await bcrypt.hash(DEFAULT_ADMIN_PIN, pinSalt);
    const hashedEmployeePin = await bcrypt.hash(DEFAULT_EMPLOYEE_PIN, pinSalt);

    const passwordSalt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, passwordSalt);

    // Helper function to check if designation is admin-level
    const isAdminDesignation = (designation) => {
      return ADMIN_DESIGNATIONS.some(role =>
        (designation || '').toLowerCase().includes(role.toLowerCase())
      );
    };

    // Get all employees
    const employees = await employeesCollection.find({ status: 'active' }).toArray();
    console.log(`Found ${employees.length} active employees across all tenants`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const results = [];

    for (const employee of employees) {
      // Normalize phone number - keep only digits and ensure 10 digits
      let mobileNumber = (employee.phone || '').replace(/[^0-9]/g, '');
      if (mobileNumber.length > 10) {
        mobileNumber = mobileNumber.slice(-10); // Take last 10 digits
      }
      if (mobileNumber.length < 10) {
        // Generate a unique mobile number if phone is invalid
        mobileNumber = `90${employee._id.toString().slice(-8)}`;
      }

      // Determine PIN based on designation
      const isAdmin = isAdminDesignation(employee.designation);
      const hashedPin = isAdmin ? hashedAdminPin : hashedEmployeePin;
      const plainPin = isAdmin ? DEFAULT_ADMIN_PIN : DEFAULT_EMPLOYEE_PIN;

      // Check if user already exists for this employee
      let user = null;

      if (employee.userId) {
        user = await usersCollection.findOne({ _id: new ObjectId(employee.userId) });
      }

      if (!user) {
        // Try to find by email and tenantId
        user = await usersCollection.findOne({
          email: employee.email.toLowerCase(),
          tenantId: employee.tenantId
        });
      }

      if (user) {
        // Update existing user with mobile credentials
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              mobileNumber: mobileNumber,
              pin: hashedPin,
              employeeId: employee._id
            }
          }
        );

        // Update employee with userId if not set
        if (!employee.userId) {
          await employeesCollection.updateOne(
            { _id: employee._id },
            { $set: { userId: user._id } }
          );
        }

        results.push({
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          mobile: mobileNumber,
          pin: plainPin,
          designation: employee.designation,
          status: 'updated'
        });
        updated++;
      } else {
        // Create new user for employee
        const newUser = {
          tenantId: employee.tenantId,
          email: employee.email.toLowerCase(),
          password: hashedPassword,
          mobileNumber: mobileNumber,
          pin: hashedPin,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: 'employee',
          permissions: ['profile:read', 'profile:write', 'attendance:read', 'leaves:read', 'leaves:write'],
          employeeId: employee._id,
          isActive: true,
          status: 'active',
          isEmailVerified: false,
          refreshTokens: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const insertResult = await usersCollection.insertOne(newUser);

        // Update employee with userId
        await employeesCollection.updateOne(
          { _id: employee._id },
          { $set: { userId: insertResult.insertedId } }
        );

        results.push({
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          mobile: mobileNumber,
          pin: plainPin,
          designation: employee.designation,
          status: 'created'
        });
        created++;
      }
    }

    console.log(`\n========== RESULTS ==========`);
    console.log(`Created: ${created} new user accounts`);
    console.log(`Updated: ${updated} existing user accounts`);
    console.log(`Skipped: ${skipped}`);
    console.log(`\nDefault PIN for admin roles: ${DEFAULT_ADMIN_PIN}`);
    console.log(`Default PIN for employees: ${DEFAULT_EMPLOYEE_PIN}`);
    console.log(`Default Password (for web): ${DEFAULT_PASSWORD}`);

    console.log(`\n========== EMPLOYEE LOGIN CREDENTIALS ==========`);
    console.log('Mobile Number\t\tPIN\tName\t\t\t\tDesignation\t\tStatus');
    console.log('-'.repeat(120));

    results.forEach(r => {
      const name = `${r.name}`.padEnd(24);
      const designation = `${r.designation || 'N/A'}`.padEnd(20);
      console.log(`${r.mobile}\t\t${r.pin}\t${name}\t${designation}\t${r.status}`);
    });

    console.log('\n========== SUMMARY ==========');
    console.log('All employees can now login to the mobile app using:');
    console.log('- Their mobile number (shown above)');
    console.log(`- PIN: ${DEFAULT_ADMIN_PIN} for admin designations (${ADMIN_DESIGNATIONS.join(', ')})`);
    console.log(`- PIN: ${DEFAULT_EMPLOYEE_PIN} for regular employees`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await authClient.close();
    await employeeClient.close();
  }
}

setupEmployeeMobileLogin();
