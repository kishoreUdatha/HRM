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

const DEFAULT_PIN = '1122';
const DEFAULT_PASSWORD = 'Employee@123';

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

    // Hash the default PIN and password
    const pinSalt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(DEFAULT_PIN, pinSalt);

    const passwordSalt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, passwordSalt);

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
          status: 'created'
        });
        created++;
      }
    }

    console.log(`\n========== RESULTS ==========`);
    console.log(`Created: ${created} new user accounts`);
    console.log(`Updated: ${updated} existing user accounts`);
    console.log(`Skipped: ${skipped}`);
    console.log(`\nDefault PIN for all employees: ${DEFAULT_PIN}`);
    console.log(`Default Password (for web): ${DEFAULT_PASSWORD}`);

    console.log(`\n========== EMPLOYEE LOGIN CREDENTIALS ==========`);
    console.log('Mobile Number\t\tName\t\t\t\tEmail\t\t\t\tStatus');
    console.log('-'.repeat(100));

    results.forEach(r => {
      const name = `${r.name}`.padEnd(24);
      const email = `${r.email}`.padEnd(32);
      console.log(`${r.mobile}\t\t${name}\t${email}\t${r.status}`);
    });

    console.log('\n========== SUMMARY ==========');
    console.log('All employees can now login to the mobile app using:');
    console.log('- Their mobile number (shown above)');
    console.log(`- PIN: ${DEFAULT_PIN}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await authClient.close();
    await employeeClient.close();
  }
}

setupEmployeeMobileLogin();
