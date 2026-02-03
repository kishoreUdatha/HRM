// Script to add a new employee to a tenant
// Usage: node scripts/add-employee.js "mongodb://..."

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.argv[2];
const TENANT_SLUG = 'smartgrow';

// Employee details
// Note: Default PIN is 4499 for admin roles (CEO, Director, Manager, etc.), 1122 for regular employees
const NEW_EMPLOYEE = {
  firstName: 'Bajibabu',
  lastName: 'Addepalli',
  phone: '9493324795',
  email: 'baji@smartgrowinfotech.com',
  selfyPunch: true,
  pin: '4499',  // Admin PIN (tenant admin)
};

if (!MONGODB_URI) {
  console.error('Error: MongoDB URI is required!');
  process.exit(1);
}

async function addEmployee() {
  try {
    // Connect to tenant database
    let tenantDbUri = MONGODB_URI;
    if (MONGODB_URI.includes('?')) {
      const [base, query] = MONGODB_URI.split('?');
      tenantDbUri = base.replace(/\/$/, '') + '/hrm_tenants?' + query;
    }

    console.log('Connecting to tenant database...');
    const tenantConn = await mongoose.createConnection(tenantDbUri);

    const tenantSchema = new mongoose.Schema({ name: String, slug: String });
    const Tenant = tenantConn.model('Tenant', tenantSchema);

    const tenant = await Tenant.findOne({ slug: TENANT_SLUG });
    if (!tenant) {
      console.error(`Tenant "${TENANT_SLUG}" not found!`);
      await tenantConn.close();
      process.exit(1);
    }
    console.log(`Found tenant: ${tenant.name} (${tenant._id})`);
    await tenantConn.close();

    // Connect to employees database
    let employeesDbUri = MONGODB_URI;
    if (MONGODB_URI.includes('?')) {
      const [base, query] = MONGODB_URI.split('?');
      employeesDbUri = base.replace(/\/$/, '') + '/hrm_employees?' + query;
    }

    console.log('Connecting to employees database...');
    const employeesConn = await mongoose.createConnection(employeesDbUri);

    // Get department (use first available)
    const departmentSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      name: String,
      code: String,
    });
    const Department = employeesConn.model('Department', departmentSchema);

    let department = await Department.findOne({ tenantId: tenant._id });
    if (!department) {
      console.log('No department found, creating default...');
      department = await Department.create({
        tenantId: tenant._id,
        name: 'General',
        code: 'GEN',
      });
    }
    console.log(`Using department: ${department.name} (${department._id})`);

    // Employee schema
    const employeeSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      employeeCode: String,
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      dateOfBirth: Date,
      gender: String,
      maritalStatus: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
      departmentId: mongoose.Schema.Types.ObjectId,
      designation: String,
      employmentType: String,
      joiningDate: Date,
      salary: {
        basic: Number,
        hra: Number,
        allowances: Number,
        deductions: Number,
        netSalary: Number,
        currency: String,
      },
      bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
      },
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
      },
      status: String,
      selfyPunch: Boolean,
      pin: String,
      faceEnrolled: Boolean,
    }, { timestamps: true });

    const Employee = employeesConn.model('Employee', employeeSchema);

    // Check for existing employee with same email or phone
    const existing = await Employee.findOne({
      tenantId: tenant._id,
      $or: [
        { email: NEW_EMPLOYEE.email },
        { phone: NEW_EMPLOYEE.phone },
      ],
    });

    if (existing) {
      console.log(`\nEmployee already exists:`);
      console.log(`  Name: ${existing.firstName} ${existing.lastName}`);
      console.log(`  Email: ${existing.email}`);
      console.log(`  Phone: ${existing.phone}`);
      console.log(`  selfyPunch: ${existing.selfyPunch}`);
      console.log(`  PIN: ${existing.pin || '1122 (default)'}`);

      // Update phone if different and enable selfyPunch
      const updates = { selfyPunch: true };
      if (existing.phone !== NEW_EMPLOYEE.phone) {
        updates.phone = NEW_EMPLOYEE.phone;
      }

      await Employee.updateOne({ _id: existing._id }, { $set: updates });
      console.log('\n✅ selfyPunch has been ENABLED!');
      if (updates.phone) {
        console.log(`✅ Phone updated to: ${NEW_EMPLOYEE.phone}`);
      }

      console.log(`\n📱 Employee can now login with:`);
      console.log(`  Company Code: ${TENANT_SLUG}`);
      console.log(`  Mobile: ${NEW_EMPLOYEE.phone}`);
      console.log(`  PIN: ${existing.pin || '1122'}`);

      await employeesConn.close();
      process.exit(0);
    }

    // Get next employee code
    const counterSchema = new mongoose.Schema({
      tenantId: String,
      sequenceName: String,
      sequenceValue: Number,
    });
    const Counter = employeesConn.model('Counter', counterSchema);

    const counter = await Counter.findOneAndUpdate(
      { tenantId: tenant._id.toString(), sequenceName: 'employee' },
      { $inc: { sequenceValue: 1 } },
      { upsert: true, new: true }
    );
    const employeeCode = `EMP${String(counter.sequenceValue).padStart(5, '0')}`;

    // Create new employee
    const newEmployee = await Employee.create({
      tenantId: tenant._id,
      employeeCode,
      firstName: NEW_EMPLOYEE.firstName,
      lastName: NEW_EMPLOYEE.lastName,
      email: NEW_EMPLOYEE.email,
      phone: NEW_EMPLOYEE.phone,
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      maritalStatus: 'single',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: '',
      },
      departmentId: department._id,
      designation: 'Employee',
      employmentType: 'full-time',
      joiningDate: new Date(),
      salary: {
        basic: 0,
        hra: 0,
        allowances: 0,
        deductions: 0,
        netSalary: 0,
        currency: 'INR',
      },
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      status: 'active',
      selfyPunch: NEW_EMPLOYEE.selfyPunch,
      pin: NEW_EMPLOYEE.pin,
      faceEnrolled: false,
    });

    console.log('\n✅ Employee created successfully!');
    console.log(`  Employee Code: ${newEmployee.employeeCode}`);
    console.log(`  Name: ${newEmployee.firstName} ${newEmployee.lastName}`);
    console.log(`  Phone: ${newEmployee.phone}`);
    console.log(`  Email: ${newEmployee.email}`);
    console.log(`  selfyPunch: ${newEmployee.selfyPunch}`);
    console.log(`  PIN: ${newEmployee.pin}`);

    console.log(`\n📱 Employee can now login with:`);
    console.log(`  Company Code: ${TENANT_SLUG}`);
    console.log(`  Mobile: ${newEmployee.phone}`);
    console.log(`  PIN: ${newEmployee.pin}`);

    await employeesConn.close();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addEmployee();
