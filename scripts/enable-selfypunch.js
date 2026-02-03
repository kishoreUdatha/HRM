// Script to enable selfyPunch for a specific employee
// Usage: MONGODB_URI="your-connection-string" node scripts/enable-selfypunch.js
// Or: node scripts/enable-selfypunch.js "mongodb://..."

const mongoose = require('mongoose');

// Get MongoDB URI from environment variable or command line argument
const MONGODB_URI = process.env.MONGODB_URI || process.argv[2];
const PHONE_NUMBER = '9493324795';
const TENANT_SLUG = 'smartgrow';

if (!MONGODB_URI) {
  console.error('Error: MongoDB URI is required!');
  console.error('Usage: MONGODB_URI="your-connection-string" node scripts/enable-selfypunch.js');
  console.error('   Or: node scripts/enable-selfypunch.js "mongodb://..."');
  process.exit(1);
}

async function enableSelfyPunch() {
  try {
    // Construct tenant database URI
    let tenantDbUri = MONGODB_URI;
    if (MONGODB_URI.includes('hrm_employees')) {
      tenantDbUri = MONGODB_URI.replace('hrm_employees', 'hrm_tenants');
    } else if (MONGODB_URI.includes('?')) {
      const [base, query] = MONGODB_URI.split('?');
      tenantDbUri = base.replace(/\/$/, '') + '/hrm_tenants?' + query;
    } else {
      tenantDbUri = MONGODB_URI.replace(/\/$/, '') + '/hrm_tenants';
    }

    console.log('Connecting to tenant database...');
    const tenantConn = await mongoose.createConnection(tenantDbUri);

    const tenantSchema = new mongoose.Schema({
      name: String,
      slug: String,
    });
    const Tenant = tenantConn.model('Tenant', tenantSchema);

    const tenant = await Tenant.findOne({ slug: TENANT_SLUG });
    if (!tenant) {
      console.error(`Tenant with slug "${TENANT_SLUG}" not found!`);
      await tenantConn.close();
      process.exit(1);
    }

    console.log(`Found tenant: ${tenant.name} (${tenant._id})`);
    await tenantConn.close();

    // Construct employees database URI
    let employeesDbUri = MONGODB_URI;
    if (!MONGODB_URI.includes('hrm_employees')) {
      if (MONGODB_URI.includes('?')) {
        const [base, query] = MONGODB_URI.split('?');
        employeesDbUri = base.replace(/\/$/, '') + '/hrm_employees?' + query;
      } else {
        employeesDbUri = MONGODB_URI.replace(/\/$/, '') + '/hrm_employees';
      }
    }

    console.log('Connecting to employees database...');
    const employeesConn = await mongoose.createConnection(employeesDbUri);

    const employeeSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      firstName: String,
      lastName: String,
      phone: String,
      email: String,
      status: String,
      selfyPunch: Boolean,
      pin: String,
    });
    const Employee = employeesConn.model('Employee', employeeSchema);

    // Find employee by phone number (flexible matching)
    const phoneDigits = PHONE_NUMBER.replace(/\D/g, '');
    const employee = await Employee.findOne({
      tenantId: tenant._id,
      $or: [
        { phone: PHONE_NUMBER },
        { phone: { $regex: phoneDigits + '$' } },
        { phone: { $regex: '\\+91' + phoneDigits } },
        { phone: { $regex: '91' + phoneDigits } },
      ],
    });

    if (!employee) {
      console.error(`Employee with phone "${PHONE_NUMBER}" not found in tenant "${TENANT_SLUG}"!`);

      // List all employees in this tenant for debugging
      const allEmployees = await Employee.find({ tenantId: tenant._id }).select('firstName lastName phone status selfyPunch');
      console.log('\nAll employees in this tenant:');
      allEmployees.forEach(emp => {
        console.log(`  - ${emp.firstName} ${emp.lastName} | Phone: ${emp.phone} | Status: ${emp.status} | SelfyPunch: ${emp.selfyPunch}`);
      });

      await employeesConn.close();
      process.exit(1);
    }

    console.log(`\nFound employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`  Phone: ${employee.phone}`);
    console.log(`  Email: ${employee.email}`);
    console.log(`  Status: ${employee.status}`);
    console.log(`  Current selfyPunch: ${employee.selfyPunch}`);
    // Determine default PIN based on designation (4499 for admins, 1122 for employees)
    const isAdminRole = ['CEO', 'CTO', 'CFO', 'COO', 'Director', 'Manager', 'HR Manager', 'Admin', 'Administrator', 'Tenant Admin'].some(
      role => (employee.designation || '').toLowerCase().includes(role.toLowerCase())
    );
    const defaultPin = isAdminRole ? '4499' : '1122';
    console.log(`  PIN: ${employee.pin || defaultPin + ' (default)'}`);

    // Enable selfyPunch
    if (employee.selfyPunch === true) {
      console.log('\nselfyPunch is already enabled for this employee!');
    } else {
      await Employee.updateOne(
        { _id: employee._id },
        { $set: { selfyPunch: true } }
      );
      console.log('\n✅ selfyPunch has been ENABLED for this employee!');
    }

    // Verify the update
    const updated = await Employee.findById(employee._id);
    console.log(`\nVerification - selfyPunch is now: ${updated.selfyPunch}`);
    console.log(`\nEmployee can now login with:`);
    console.log(`  Company Code: ${TENANT_SLUG}`);
    console.log(`  Mobile: ${employee.phone}`);
    console.log(`  PIN: ${employee.pin || defaultPin}`);

    await employeesConn.close();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

enableSelfyPunch();
