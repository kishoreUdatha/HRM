/**
 * Comprehensive Database Seed Script
 * Creates 50 records for each major table in the HRM system
 *
 * Usage: node scripts/seed-comprehensive.js
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

// Database names for different services
const DATABASES = {
  tenant: 'hrm_tenants',
  auth: 'hrm_auth',
  employee: 'hrm_employees',
  attendance: 'hrm_attendance',
  leave: 'hrm_leaves',
  payroll: 'hrm_payroll',
};

// Sample data generators
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Turner', 'Phillips', 'Evans', 'Parker', 'Edwards', 'Collins'
];

const cities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'San Francisco', 'Columbus', 'Indianapolis', 'Fort Worth', 'Charlotte', 'Seattle',
  'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Portland'
];

const states = [
  'NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'GA', 'NC',
  'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD'
];

const designations = [
  'Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'Engineering Manager',
  'Product Manager', 'Project Manager', 'Business Analyst', 'QA Engineer',
  'DevOps Engineer', 'Data Analyst', 'Data Scientist', 'UX Designer',
  'UI Designer', 'HR Manager', 'HR Executive', 'Finance Manager',
  'Accountant', 'Marketing Manager', 'Sales Executive', 'Operations Manager',
  'Customer Support', 'Content Writer', 'Graphic Designer', 'System Administrator',
  'Network Engineer', 'Security Analyst', 'Full Stack Developer', 'Frontend Developer',
  'Backend Developer', 'Mobile Developer'
];

const skills = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'React', 'Angular', 'Vue.js',
  'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Docker',
  'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'Agile', 'Scrum', 'REST APIs',
  'GraphQL', 'Machine Learning', 'Data Analysis', 'Excel', 'PowerBI', 'Tableau',
  'Project Management', 'Communication', 'Leadership', 'Problem Solving'
];

const leaveReasons = [
  'Family emergency', 'Medical appointment', 'Personal work', 'Vacation trip',
  'Moving to new house', 'Wedding ceremony', 'Religious occasion', 'Child care',
  'Mental health day', 'Home renovation', 'Parent-teacher meeting', 'Jury duty',
  'Passport renewal', 'Visa appointment', 'Bank work', 'Government office visit',
  'Health checkup', 'Dental appointment', 'Eye examination', 'Relative wedding'
];

const bankNames = [
  'Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank', 'US Bank',
  'Capital One', 'PNC Bank', 'TD Bank', 'BB&T', 'SunTrust'
];

// Helper functions
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generatePhone() {
  return `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`;
}

function generateAccountNumber() {
  return `${randomInt(1000, 9999)}${randomInt(1000, 9999)}${randomInt(1000, 9999)}`;
}

function generateIFSC() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return `${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}0${randomInt(100000, 999999)}`;
}

function generateZipCode() {
  return `${randomInt(10000, 99999)}`;
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Main seed function
async function seed() {
  console.log('='.repeat(60));
  console.log('HRM Comprehensive Database Seeding Script');
  console.log('='.repeat(60));
  console.log('');

  const connectionString = `mongodb://${MONGODB_USER}:${MONGODB_PASS}@${MONGODB_URI.replace('mongodb://', '')}?authSource=admin`;

  let client;
  try {
    client = new MongoClient(connectionString);
    await client.connect();
    console.log('Connected to MongoDB successfully!\n');

    // Create Tenant
    console.log('1. Creating Tenant...');
    const tenantDb = client.db(DATABASES.tenant);
    const tenantId = new ObjectId();

    await tenantDb.collection('tenants').deleteMany({});
    await tenantDb.collection('tenants').insertOne({
      _id: tenantId,
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      domain: 'acme.hrm.com',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'YYYY-MM-DD',
        currency: 'USD',
        language: 'en',
        workingDays: [1, 2, 3, 4, 5],
        workingHours: { start: '09:00', end: '18:00' },
        leavePolicy: {
          casualLeaves: 12,
          sickLeaves: 12,
          annualLeaves: 15,
          maternityLeaves: 90,
          paternityLeaves: 10,
          carryForward: true,
          maxCarryForward: 5
        },
        attendanceSettings: {
          allowRemoteCheckIn: true,
          requireGeolocation: false,
          allowFlexibleHours: true,
          graceTimeMins: 15,
          halfDayHours: 4,
          fullDayHours: 8
        }
      },
      subscription: {
        plan: 'enterprise',
        maxEmployees: 10000,
        maxAdmins: 100,
        features: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access', 'custom_integrations', 'sso', 'audit_logs'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingCycle: 'yearly',
        amount: 9999,
        currency: 'USD'
      },
      billing: {
        companyName: 'Acme Corporation Inc.',
        address: '123 Business Ave, New York, NY 10001',
        taxId: 'US123456789',
        email: 'billing@acme.com',
        phone: '+1-555-123-4567'
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('   Created 1 tenant\n');

    // Create Departments
    console.log('2. Creating Departments...');
    const employeeDb = client.db(DATABASES.employee);

    await employeeDb.collection('departments').deleteMany({});

    const departmentData = [
      { name: 'Engineering', code: 'ENG', description: 'Software development and engineering' },
      { name: 'Product', code: 'PROD', description: 'Product management and strategy' },
      { name: 'Design', code: 'DES', description: 'UX/UI design team' },
      { name: 'Human Resources', code: 'HR', description: 'HR and people operations' },
      { name: 'Finance', code: 'FIN', description: 'Finance and accounting' },
      { name: 'Marketing', code: 'MKT', description: 'Marketing and communications' },
      { name: 'Sales', code: 'SALES', description: 'Sales and business development' },
      { name: 'Operations', code: 'OPS', description: 'Operations and logistics' },
      { name: 'Customer Support', code: 'CS', description: 'Customer service and support' },
      { name: 'Legal', code: 'LEGAL', description: 'Legal and compliance' }
    ];

    const departments = departmentData.map(d => ({
      _id: new ObjectId(),
      tenantId,
      ...d,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await employeeDb.collection('departments').insertMany(departments);
    console.log(`   Created ${departments.length} departments\n`);

    // Create Shifts
    console.log('3. Creating Shifts...');
    const attendanceDb = client.db(DATABASES.attendance);

    await attendanceDb.collection('shifts').deleteMany({});

    const shiftData = [
      { name: 'Day Shift', code: 'DAY', startTime: '09:00', endTime: '18:00', isDefault: true },
      { name: 'Morning Shift', code: 'MORN', startTime: '06:00', endTime: '15:00', isDefault: false },
      { name: 'Evening Shift', code: 'EVE', startTime: '14:00', endTime: '23:00', isDefault: false },
      { name: 'Night Shift', code: 'NIGHT', startTime: '22:00', endTime: '07:00', isDefault: false },
      { name: 'Flexible Shift', code: 'FLEX', startTime: '08:00', endTime: '17:00', isDefault: false }
    ];

    const shifts = shiftData.map(s => ({
      _id: new ObjectId(),
      tenantId,
      ...s,
      breakDuration: 60,
      graceMinutes: 15,
      workingDays: [1, 2, 3, 4, 5],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await attendanceDb.collection('shifts').insertMany(shifts);
    console.log(`   Created ${shifts.length} shifts\n`);

    // Create Leave Types
    console.log('4. Creating Leave Types...');
    const leaveDb = client.db(DATABASES.leave);

    await leaveDb.collection('leavetypes').deleteMany({});

    const leaveTypeData = [
      { name: 'Annual Leave', code: 'ANNUAL', defaultDays: 15, maxDays: 20, carryForward: true, isPaid: true },
      { name: 'Sick Leave', code: 'SICK', defaultDays: 12, maxDays: 15, carryForward: false, isPaid: true },
      { name: 'Casual Leave', code: 'CASUAL', defaultDays: 12, maxDays: 12, carryForward: false, isPaid: true },
      { name: 'Maternity Leave', code: 'MAT', defaultDays: 90, maxDays: 180, carryForward: false, isPaid: true, applicableGender: 'female' },
      { name: 'Paternity Leave', code: 'PAT', defaultDays: 10, maxDays: 15, carryForward: false, isPaid: true, applicableGender: 'male' },
      { name: 'Unpaid Leave', code: 'UNPAID', defaultDays: 0, maxDays: 30, carryForward: false, isPaid: false }
    ];

    const leaveTypes = leaveTypeData.map(lt => ({
      _id: new ObjectId(),
      tenantId,
      ...lt,
      maxCarryForwardDays: lt.carryForward ? 5 : 0,
      requiresApproval: true,
      minDaysNotice: 1,
      allowHalfDay: true,
      allowNegativeBalance: false,
      applicableGender: lt.applicableGender || 'all',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await leaveDb.collection('leavetypes').insertMany(leaveTypes);
    console.log(`   Created ${leaveTypes.length} leave types\n`);

    // Create Counter for employee codes
    await employeeDb.collection('counters').deleteMany({});
    await employeeDb.collection('counters').insertOne({
      _id: `${tenantId}_employee`,
      seq: 50
    });

    // Create Employees (50)
    console.log('5. Creating 50 Employees...');
    await employeeDb.collection('employees').deleteMany({});

    const employees = [];
    const usedEmails = new Set();

    for (let i = 0; i < 50; i++) {
      let firstName, lastName, email;

      // Ensure unique email
      do {
        firstName = randomElement(firstNames);
        lastName = randomElement(lastNames);
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@acme.com`;
      } while (usedEmails.has(email));
      usedEmails.add(email);

      const department = randomElement(departments);
      const shift = randomElement(shifts);
      const gender = randomElement(['male', 'female', 'other']);
      const joiningDate = randomDate(new Date(2020, 0, 1), new Date(2024, 6, 1));
      const basicSalary = randomInt(40000, 150000);
      const hra = Math.round(basicSalary * 0.4);
      const allowances = randomInt(5000, 20000);
      const deductions = randomInt(2000, 10000);

      employees.push({
        _id: new ObjectId(),
        tenantId,
        employeeCode: `EMP${String(i + 1).padStart(5, '0')}`,
        firstName,
        lastName,
        email,
        phone: generatePhone(),
        dateOfBirth: randomDate(new Date(1970, 0, 1), new Date(2000, 11, 31)),
        gender,
        maritalStatus: randomElement(['single', 'married', 'divorced', 'widowed']),
        address: {
          street: `${randomInt(100, 9999)} ${randomElement(['Main St', 'Oak Ave', 'Park Blvd', 'Elm St', 'Maple Dr', 'Cedar Lane'])}`,
          city: randomElement(cities),
          state: randomElement(states),
          country: 'USA',
          zipCode: generateZipCode()
        },
        departmentId: department._id,
        designation: randomElement(designations),
        employmentType: randomElement(['full-time', 'full-time', 'full-time', 'part-time', 'contract', 'intern']),
        joiningDate,
        shiftId: shift._id,
        salary: {
          basic: basicSalary,
          hra,
          allowances,
          deductions,
          netSalary: basicSalary + hra + allowances - deductions,
          currency: 'USD'
        },
        bankDetails: {
          bankName: randomElement(bankNames),
          accountNumber: generateAccountNumber(),
          ifscCode: generateIFSC(),
          accountHolderName: `${firstName} ${lastName}`
        },
        emergencyContact: {
          name: `${randomElement(firstNames)} ${lastName}`,
          relationship: randomElement(['Spouse', 'Parent', 'Sibling', 'Friend']),
          phone: generatePhone()
        },
        status: randomElement(['active', 'active', 'active', 'active', 'inactive', 'on-leave']),
        skills: randomElements(skills, randomInt(3, 8)),
        documents: [],
        createdAt: joiningDate,
        updatedAt: new Date()
      });
    }

    await employeeDb.collection('employees').insertMany(employees);
    console.log(`   Created ${employees.length} employees\n`);

    // Create Users (50)
    console.log('6. Creating 50 Users...');
    const authDb = client.db(DATABASES.auth);

    await authDb.collection('users').deleteMany({});

    const hashedPassword = await hashPassword('Password123!');
    const roles = ['employee', 'employee', 'employee', 'employee', 'manager', 'hr', 'tenant_admin'];

    const users = employees.map((emp, index) => ({
      _id: new ObjectId(),
      tenantId,
      email: emp.email,
      password: hashedPassword,
      firstName: emp.firstName,
      lastName: emp.lastName,
      role: index === 0 ? 'tenant_admin' : randomElement(roles),
      permissions: [],
      employeeId: emp._id,
      isActive: true,
      status: 'active',
      isEmailVerified: true,
      refreshTokens: [],
      createdAt: emp.createdAt,
      updatedAt: new Date()
    }));

    await authDb.collection('users').insertMany(users);
    console.log(`   Created ${users.length} users\n`);

    // Create Attendance Records (50 records per day for last 30 days = ~1500 records)
    console.log('7. Creating Attendance Records (50 employees x 30 days)...');
    await attendanceDb.collection('attendances').deleteMany({});

    const attendanceRecords = [];
    const today = new Date();

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      for (const emp of employees) {
        if (emp.status === 'inactive') continue;

        const rand = Math.random();
        let status, checkIn, checkOut, workHours = 0;

        if (rand < 0.85) {
          // Present (85%)
          const isLate = Math.random() < 0.1;
          status = isLate ? 'late' : 'present';

          checkIn = new Date(date);
          checkIn.setHours(isLate ? randomInt(9, 10) : randomInt(8, 9), randomInt(0, 59), 0, 0);

          checkOut = new Date(date);
          checkOut.setHours(randomInt(17, 19), randomInt(0, 59), 0, 0);

          workHours = (checkOut - checkIn) / (1000 * 60 * 60) - 1; // Minus 1 hour break
        } else if (rand < 0.92) {
          // Absent (7%)
          status = 'absent';
        } else if (rand < 0.97) {
          // Half day (5%)
          status = 'half_day';
          checkIn = new Date(date);
          checkIn.setHours(9, randomInt(0, 30), 0, 0);
          checkOut = new Date(date);
          checkOut.setHours(13, randomInt(0, 30), 0, 0);
          workHours = 4;
        } else {
          // On leave (3%)
          status = 'on_leave';
        }

        attendanceRecords.push({
          _id: new ObjectId(),
          tenantId,
          employeeId: emp._id,
          date,
          checkIn,
          checkOut,
          status,
          workHours: Math.max(0, workHours),
          overtimeHours: workHours > 8 ? workHours - 8 : 0,
          breakDuration: 60,
          shiftId: emp.shiftId,
          createdAt: date,
          updatedAt: date
        });
      }
    }

    // Insert in batches for better performance
    const batchSize = 500;
    for (let i = 0; i < attendanceRecords.length; i += batchSize) {
      await attendanceDb.collection('attendances').insertMany(
        attendanceRecords.slice(i, i + batchSize)
      );
    }
    console.log(`   Created ${attendanceRecords.length} attendance records\n`);

    // Create Leave Requests (50)
    console.log('8. Creating 50 Leave Requests...');
    await leaveDb.collection('leaverequests').deleteMany({});

    const leaveStatuses = ['pending', 'approved', 'approved', 'approved', 'rejected', 'cancelled'];
    const leaveRequests = [];

    for (let i = 0; i < 50; i++) {
      const emp = randomElement(employees);
      const leaveType = randomElement(leaveTypes.filter(lt =>
        lt.applicableGender === 'all' || lt.applicableGender === emp.gender
      ));

      const startDate = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31));
      const days = randomInt(1, 5);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);

      const status = randomElement(leaveStatuses);
      const approver = randomElement(users.filter(u => u.role === 'hr' || u.role === 'tenant_admin' || u.role === 'manager'));

      leaveRequests.push({
        _id: new ObjectId(),
        tenantId,
        employeeId: emp._id,
        leaveTypeId: leaveType._id,
        startDate,
        endDate,
        days,
        isHalfDay: days === 0.5,
        reason: randomElement(leaveReasons),
        status,
        approvedBy: status === 'approved' || status === 'rejected' ? approver?._id : undefined,
        approvedAt: status === 'approved' || status === 'rejected' ? new Date() : undefined,
        rejectionReason: status === 'rejected' ? 'Leave quota exhausted or insufficient notice period' : undefined,
        attachments: [],
        createdAt: randomDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000), startDate),
        updatedAt: new Date()
      });
    }

    await leaveDb.collection('leaverequests').insertMany(leaveRequests);
    console.log(`   Created ${leaveRequests.length} leave requests\n`);

    // Create Leave Balances (50 employees x 6 leave types = 300 records)
    console.log('9. Creating Leave Balances...');
    await leaveDb.collection('leavebalances').deleteMany({});

    const leaveBalances = [];
    const currentYear = new Date().getFullYear();

    for (const emp of employees) {
      for (const lt of leaveTypes) {
        if (lt.applicableGender !== 'all' && lt.applicableGender !== emp.gender) continue;

        const used = randomInt(0, Math.min(lt.defaultDays, 10));
        leaveBalances.push({
          _id: new ObjectId(),
          tenantId,
          employeeId: emp._id,
          leaveTypeId: lt._id,
          year: currentYear,
          totalDays: lt.defaultDays,
          usedDays: used,
          pendingDays: randomInt(0, 3),
          carryForwardDays: lt.carryForward ? randomInt(0, 5) : 0,
          createdAt: new Date(currentYear, 0, 1),
          updatedAt: new Date()
        });
      }
    }

    await leaveDb.collection('leavebalances').insertMany(leaveBalances);
    console.log(`   Created ${leaveBalances.length} leave balances\n`);

    // Create Payroll Records (50 employees x 12 months = 600 records)
    console.log('10. Creating Payroll Records (50 employees x 12 months)...');
    const payrollDb = client.db(DATABASES.payroll);

    await payrollDb.collection('payrolls').deleteMany({});

    const payrollRecords = [];
    const payrollStatuses = ['paid', 'paid', 'paid', 'paid', 'processed', 'draft'];

    for (const emp of employees) {
      for (let month = 1; month <= 12; month++) {
        const payPeriodStart = new Date(currentYear, month - 1, 1);
        const payPeriodEnd = new Date(currentYear, month, 0);

        const baseSalary = emp.salary.basic / 12;
        const hra = emp.salary.hra / 12;
        const allowances = emp.salary.allowances / 12;
        const workingDays = 22;
        const presentDays = randomInt(18, 22);
        const leaveDays = randomInt(0, 3);
        const lopDays = workingDays - presentDays - leaveDays;
        const overtimeHours = randomInt(0, 20);
        const overtimePay = overtimeHours * (baseSalary / 176); // Assuming 176 hours/month

        const earnings = [
          { name: 'House Rent Allowance', code: 'HRA', type: 'earning', amount: Math.round(hra), isTaxable: false },
          { name: 'Special Allowance', code: 'SA', type: 'earning', amount: Math.round(allowances * 0.5), isTaxable: true },
          { name: 'Transport Allowance', code: 'TA', type: 'earning', amount: Math.round(allowances * 0.3), isTaxable: false },
          { name: 'Medical Allowance', code: 'MA', type: 'earning', amount: Math.round(allowances * 0.2), isTaxable: false }
        ];

        const pfDeduction = Math.round(baseSalary * 0.12);
        const professionalTax = 200;
        const incomeTax = Math.round(baseSalary * randomInt(5, 20) / 100);

        const deductions = [
          { name: 'Provident Fund', code: 'PF', type: 'deduction', amount: pfDeduction, isTaxable: false },
          { name: 'Professional Tax', code: 'PT', type: 'deduction', amount: professionalTax, isTaxable: false }
        ];

        const grossSalary = Math.round(baseSalary + earnings.reduce((s, e) => s + e.amount, 0) + overtimePay);
        const totalDeductions = Math.round(deductions.reduce((s, d) => s + d.amount, 0) + incomeTax);
        const netSalary = Math.round(grossSalary - totalDeductions);

        payrollRecords.push({
          _id: new ObjectId(),
          tenantId,
          employeeId: emp._id,
          month,
          year: currentYear,
          payPeriodStart,
          payPeriodEnd,
          baseSalary: Math.round(baseSalary),
          earnings,
          deductions,
          grossSalary,
          totalDeductions,
          netSalary,
          taxableIncome: Math.round(baseSalary + earnings.filter(e => e.isTaxable).reduce((s, e) => s + e.amount, 0)),
          incomeTax,
          workingDays,
          presentDays,
          leaveDays,
          lopDays: Math.max(0, lopDays),
          overtimeHours,
          overtimePay: Math.round(overtimePay),
          status: month <= new Date().getMonth() + 1 ? randomElement(payrollStatuses) : 'draft',
          processedAt: month <= new Date().getMonth() ? payPeriodEnd : undefined,
          paidAt: month <= new Date().getMonth() ? new Date(payPeriodEnd.getTime() + 5 * 24 * 60 * 60 * 1000) : undefined,
          paymentReference: month <= new Date().getMonth() ? `PAY-${currentYear}-${String(month).padStart(2, '0')}-${String(employees.indexOf(emp) + 1).padStart(4, '0')}` : undefined,
          createdAt: payPeriodStart,
          updatedAt: new Date()
        });
      }
    }

    // Insert in batches
    for (let i = 0; i < payrollRecords.length; i += batchSize) {
      await payrollDb.collection('payrolls').insertMany(
        payrollRecords.slice(i, i + batchSize)
      );
    }
    console.log(`   Created ${payrollRecords.length} payroll records\n`);

    // Create Salary Structures (5)
    console.log('11. Creating Salary Structures...');
    await payrollDb.collection('salarystructures').deleteMany({});

    const salaryStructures = [
      { name: 'Entry Level', code: 'ENTRY', baseSalary: 40000, components: ['HRA', 'TA', 'MA'] },
      { name: 'Mid Level', code: 'MID', baseSalary: 70000, components: ['HRA', 'TA', 'MA', 'SA'] },
      { name: 'Senior Level', code: 'SENIOR', baseSalary: 100000, components: ['HRA', 'TA', 'MA', 'SA', 'BONUS'] },
      { name: 'Lead Level', code: 'LEAD', baseSalary: 130000, components: ['HRA', 'TA', 'MA', 'SA', 'BONUS', 'STOCK'] },
      { name: 'Executive', code: 'EXEC', baseSalary: 180000, components: ['HRA', 'TA', 'MA', 'SA', 'BONUS', 'STOCK', 'CAR'] }
    ].map(ss => ({
      _id: new ObjectId(),
      tenantId,
      ...ss,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await payrollDb.collection('salarystructures').insertMany(salaryStructures);
    console.log(`   Created ${salaryStructures.length} salary structures\n`);

    // Create Notifications (50)
    console.log('12. Creating 50 Notifications...');
    const notificationDb = client.db('hrm_notifications');

    await notificationDb.collection('notifications').deleteMany({});

    const notificationTypes = [
      { type: 'leave_approved', title: 'Leave Request Approved', message: 'Your leave request has been approved' },
      { type: 'leave_rejected', title: 'Leave Request Rejected', message: 'Your leave request has been rejected' },
      { type: 'payroll_processed', title: 'Payroll Processed', message: 'Your salary has been processed' },
      { type: 'attendance_reminder', title: 'Attendance Reminder', message: 'Please mark your attendance' },
      { type: 'review_due', title: 'Performance Review Due', message: 'Your performance review is due' },
      { type: 'document_uploaded', title: 'Document Uploaded', message: 'A new document has been uploaded' },
      { type: 'birthday_reminder', title: 'Birthday Reminder', message: 'A colleague has a birthday today' },
      { type: 'policy_update', title: 'Policy Update', message: 'Company policies have been updated' }
    ];

    const notifications = [];
    for (let i = 0; i < 50; i++) {
      const notifType = randomElement(notificationTypes);
      const user = randomElement(users);

      notifications.push({
        _id: new ObjectId(),
        tenantId,
        userId: user._id,
        type: notifType.type,
        title: notifType.title,
        message: notifType.message,
        isRead: Math.random() > 0.5,
        metadata: {},
        createdAt: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        updatedAt: new Date()
      });
    }

    await notificationDb.collection('notifications').insertMany(notifications);
    console.log(`   Created ${notifications.length} notifications\n`);

    // Create Job Postings (10)
    console.log('13. Creating 10 Job Postings...');
    await employeeDb.collection('jobpostings').deleteMany({});

    const jobPostings = [];
    const jobStatuses = ['open', 'open', 'open', 'closed', 'draft'];

    for (let i = 0; i < 10; i++) {
      const dept = randomElement(departments);
      jobPostings.push({
        _id: new ObjectId(),
        tenantId,
        title: `${randomElement(designations)} - ${dept.name}`,
        departmentId: dept._id,
        description: `We are looking for a talented professional to join our ${dept.name} team.`,
        requirements: randomElements(skills, 5).join(', '),
        responsibilities: 'Work on exciting projects, collaborate with team members, deliver high-quality solutions.',
        location: randomElement(cities),
        employmentType: randomElement(['full-time', 'part-time', 'contract']),
        experienceLevel: randomElement(['entry', 'mid', 'senior', 'lead']),
        salaryRange: {
          min: randomInt(50000, 80000),
          max: randomInt(90000, 150000),
          currency: 'USD'
        },
        status: randomElement(jobStatuses),
        postedDate: randomDate(new Date(2024, 0, 1), new Date()),
        closingDate: randomDate(new Date(), new Date(2025, 5, 30)),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await employeeDb.collection('jobpostings').insertMany(jobPostings);
    console.log(`   Created ${jobPostings.length} job postings\n`);

    // Create Job Applications (50)
    console.log('14. Creating 50 Job Applications...');
    await employeeDb.collection('jobapplications').deleteMany({});

    const applicationStatuses = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];
    const jobApplications = [];

    for (let i = 0; i < 50; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);

      jobApplications.push({
        _id: new ObjectId(),
        tenantId,
        jobPostingId: randomElement(jobPostings)._id,
        candidateName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: generatePhone(),
        resumeUrl: `/resumes/${firstName.toLowerCase()}_${lastName.toLowerCase()}_resume.pdf`,
        coverLetter: 'I am excited to apply for this position and believe my skills match your requirements.',
        currentCompany: randomElement(['TechCorp', 'DataSystems', 'CloudWorks', 'InnovateTech', 'Digital Solutions']),
        experience: randomInt(1, 15),
        skills: randomElements(skills, randomInt(4, 8)),
        status: randomElement(applicationStatuses),
        appliedDate: randomDate(new Date(2024, 0, 1), new Date()),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await employeeDb.collection('jobapplications').insertMany(jobApplications);
    console.log(`   Created ${jobApplications.length} job applications\n`);

    // Create Performance Reviews (50)
    console.log('15. Creating 50 Performance Reviews...');
    await employeeDb.collection('performancereviews').deleteMany({});

    const reviewStatuses = ['draft', 'in_progress', 'completed', 'acknowledged'];
    const performanceReviews = [];

    for (let i = 0; i < 50; i++) {
      const emp = randomElement(employees);
      const reviewer = randomElement(users.filter(u => u.role === 'manager' || u.role === 'hr'));

      performanceReviews.push({
        _id: new ObjectId(),
        tenantId,
        employeeId: emp._id,
        reviewerId: reviewer?._id,
        reviewPeriod: {
          start: new Date(2024, 0, 1),
          end: new Date(2024, 11, 31)
        },
        ratings: {
          productivity: randomInt(3, 5),
          quality: randomInt(3, 5),
          teamwork: randomInt(3, 5),
          communication: randomInt(3, 5),
          initiative: randomInt(3, 5),
          overall: randomInt(3, 5)
        },
        goals: [
          { description: 'Complete project milestones', achieved: Math.random() > 0.3 },
          { description: 'Improve technical skills', achieved: Math.random() > 0.3 },
          { description: 'Mentor junior team members', achieved: Math.random() > 0.5 }
        ],
        feedback: 'Great performance throughout the review period. Continue focusing on growth areas.',
        employeeComments: 'Thank you for the feedback. I will work on the improvement areas.',
        status: randomElement(reviewStatuses),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await employeeDb.collection('performancereviews').insertMany(performanceReviews);
    console.log(`   Created ${performanceReviews.length} performance reviews\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('Seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  - Tenants: 1`);
    console.log(`  - Departments: ${departments.length}`);
    console.log(`  - Shifts: ${shifts.length}`);
    console.log(`  - Leave Types: ${leaveTypes.length}`);
    console.log(`  - Employees: ${employees.length}`);
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Attendance Records: ${attendanceRecords.length}`);
    console.log(`  - Leave Requests: ${leaveRequests.length}`);
    console.log(`  - Leave Balances: ${leaveBalances.length}`);
    console.log(`  - Payroll Records: ${payrollRecords.length}`);
    console.log(`  - Salary Structures: ${salaryStructures.length}`);
    console.log(`  - Notifications: ${notifications.length}`);
    console.log(`  - Job Postings: ${jobPostings.length}`);
    console.log(`  - Job Applications: ${jobApplications.length}`);
    console.log(`  - Performance Reviews: ${performanceReviews.length}`);
    console.log('\nDefault login credentials:');
    console.log(`  Email: ${employees[0].email}`);
    console.log(`  Password: Password123!`);
    console.log(`  Role: tenant_admin`);

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
seed().catch(console.error);
