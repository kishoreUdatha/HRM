// Seed script for all databases
// Run with: docker exec hrm-mongodb mongosh -u admin -p hrm_password_2024 --authenticationDatabase admin < seed-all-dbs.js

// Create a common tenant ID
const tenantId = ObjectId();
print("Tenant ID: " + tenantId.toString());

// ===================== TENANT DATABASE =====================
db = db.getSiblingDB("hrm_tenants");

// Drop existing data
db.tenants.deleteMany({});

// Create tenant
db.tenants.insertOne({
  _id: tenantId,
  name: "Acme Corporation",
  slug: "acme",
  domain: "acme.local",
  settings: {
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    currency: "INR",
    language: "en",
    workingDays: [1, 2, 3, 4, 5],
    workingHours: { start: "09:00", end: "18:00" }
  },
  subscription: {
    plan: "enterprise",
    maxEmployees: 500,
    features: ["payroll", "attendance", "leaves", "analytics"],
    startDate: new Date(),
    endDate: new Date("2025-12-31")
  },
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
});
print("Created tenant in hrm_tenants");

// ===================== EMPLOYEES DATABASE =====================
db = db.getSiblingDB("hrm_employees");

// Drop existing data
db.employees.deleteMany({});
db.departments.deleteMany({});

// Create departments
const depts = db.departments.insertMany([
  { tenantId: tenantId.toString(), name: "Executive", code: "EXEC", description: "Executive Leadership", status: "active", createdAt: new Date(), updatedAt: new Date() },
  { tenantId: tenantId.toString(), name: "Engineering", code: "ENG", description: "Software Development", status: "active", createdAt: new Date(), updatedAt: new Date() },
  { tenantId: tenantId.toString(), name: "Human Resources", code: "HR", description: "People Operations", status: "active", createdAt: new Date(), updatedAt: new Date() },
  { tenantId: tenantId.toString(), name: "Finance", code: "FIN", description: "Finance & Accounting", status: "active", createdAt: new Date(), updatedAt: new Date() },
  { tenantId: tenantId.toString(), name: "Sales", code: "SALES", description: "Sales & Marketing", status: "active", createdAt: new Date(), updatedAt: new Date() }
]);

const execDept = depts.insertedIds[0].toString();
const engDept = depts.insertedIds[1].toString();
const hrDept = depts.insertedIds[2].toString();
const finDept = depts.insertedIds[3].toString();
const salesDept = depts.insertedIds[4].toString();
print("Created 5 departments in hrm_employees");

// Create CEO
const ceo = db.employees.insertOne({
  tenantId: tenantId.toString(),
  employeeCode: "EMP001",
  firstName: "Rajesh",
  lastName: "Kumar",
  email: "rajesh.kumar@acme.local",
  phone: "+91-9876543210",
  dateOfBirth: new Date("1975-05-15"),
  gender: "male",
  maritalStatus: "married",
  departmentId: execDept,
  designation: "Chief Executive Officer",
  employmentType: "full-time",
  joiningDate: new Date("2010-01-01"),
  status: "active",
  salary: { basic: 500000, hra: 200000, allowances: 100000, deductions: 50000, netSalary: 750000, currency: "INR" },
  address: { street: "123 MG Road", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560001" },
  createdAt: new Date(),
  updatedAt: new Date()
});
const ceoId = ceo.insertedId.toString();

// Create CTO reporting to CEO
const cto = db.employees.insertOne({
  tenantId: tenantId.toString(),
  employeeCode: "EMP002",
  firstName: "Priya",
  lastName: "Sharma",
  email: "priya.sharma@acme.local",
  phone: "+91-9876543211",
  dateOfBirth: new Date("1980-08-20"),
  gender: "female",
  maritalStatus: "married",
  departmentId: engDept,
  designation: "Chief Technology Officer",
  employmentType: "full-time",
  joiningDate: new Date("2012-03-15"),
  reportingManagerId: ceoId,
  status: "active",
  salary: { basic: 400000, hra: 160000, allowances: 80000, deductions: 40000, netSalary: 600000, currency: "INR" },
  address: { street: "456 Brigade Road", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560025" },
  createdAt: new Date(),
  updatedAt: new Date()
});
const ctoId = cto.insertedId.toString();

// Create HR Director
const hrDir = db.employees.insertOne({
  tenantId: tenantId.toString(),
  employeeCode: "EMP003",
  firstName: "Amit",
  lastName: "Patel",
  email: "amit.patel@acme.local",
  phone: "+91-9876543212",
  dateOfBirth: new Date("1982-03-10"),
  gender: "male",
  maritalStatus: "single",
  departmentId: hrDept,
  designation: "HR Director",
  employmentType: "full-time",
  joiningDate: new Date("2014-06-01"),
  reportingManagerId: ceoId,
  status: "active",
  salary: { basic: 300000, hra: 120000, allowances: 60000, deductions: 30000, netSalary: 450000, currency: "INR" },
  address: { street: "789 Koramangala", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560034" },
  createdAt: new Date(),
  updatedAt: new Date()
});
const hrDirId = hrDir.insertedId.toString();

// Create CFO
const cfo = db.employees.insertOne({
  tenantId: tenantId.toString(),
  employeeCode: "EMP004",
  firstName: "Sneha",
  lastName: "Reddy",
  email: "sneha.reddy@acme.local",
  phone: "+91-9876543213",
  dateOfBirth: new Date("1978-11-25"),
  gender: "female",
  maritalStatus: "married",
  departmentId: finDept,
  designation: "Chief Financial Officer",
  employmentType: "full-time",
  joiningDate: new Date("2013-09-01"),
  reportingManagerId: ceoId,
  status: "active",
  salary: { basic: 380000, hra: 152000, allowances: 76000, deductions: 38000, netSalary: 570000, currency: "INR" },
  address: { street: "321 Indiranagar", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560038" },
  createdAt: new Date(),
  updatedAt: new Date()
});
const cfoId = cfo.insertedId.toString();

// Create Engineering Manager
const engMgr = db.employees.insertOne({
  tenantId: tenantId.toString(),
  employeeCode: "EMP005",
  firstName: "Vikram",
  lastName: "Singh",
  email: "vikram.singh@acme.local",
  phone: "+91-9876543214",
  dateOfBirth: new Date("1985-07-18"),
  gender: "male",
  maritalStatus: "married",
  departmentId: engDept,
  designation: "Engineering Manager",
  employmentType: "full-time",
  joiningDate: new Date("2016-02-15"),
  reportingManagerId: ctoId,
  status: "active",
  salary: { basic: 250000, hra: 100000, allowances: 50000, deductions: 25000, netSalary: 375000, currency: "INR" },
  address: { street: "555 HSR Layout", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560102" },
  createdAt: new Date(),
  updatedAt: new Date()
});
const engMgrId = engMgr.insertedId.toString();

// Create developers
db.employees.insertMany([
  {
    tenantId: tenantId.toString(),
    employeeCode: "EMP006",
    firstName: "Arjun",
    lastName: "Menon",
    email: "arjun.menon@acme.local",
    phone: "+91-9876543215",
    dateOfBirth: new Date("1990-04-12"),
    gender: "male",
    maritalStatus: "single",
    departmentId: engDept,
    designation: "Senior Software Engineer",
    employmentType: "full-time",
    joiningDate: new Date("2018-07-01"),
    reportingManagerId: engMgrId,
    status: "active",
    salary: { basic: 150000, hra: 60000, allowances: 30000, deductions: 15000, netSalary: 225000, currency: "INR" },
    address: { street: "111 Whitefield", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560066" },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenantId: tenantId.toString(),
    employeeCode: "EMP007",
    firstName: "Kavitha",
    lastName: "Nair",
    email: "kavitha.nair@acme.local",
    phone: "+91-9876543216",
    dateOfBirth: new Date("1992-09-28"),
    gender: "female",
    maritalStatus: "single",
    departmentId: engDept,
    designation: "Senior Software Engineer",
    employmentType: "full-time",
    joiningDate: new Date("2019-03-15"),
    reportingManagerId: engMgrId,
    status: "active",
    salary: { basic: 145000, hra: 58000, allowances: 29000, deductions: 14500, netSalary: 217500, currency: "INR" },
    address: { street: "222 Electronic City", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560100" },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenantId: tenantId.toString(),
    employeeCode: "EMP008",
    firstName: "Rahul",
    lastName: "Verma",
    email: "rahul.verma@acme.local",
    phone: "+91-9876543217",
    dateOfBirth: new Date("1993-12-05"),
    gender: "male",
    maritalStatus: "single",
    departmentId: engDept,
    designation: "Software Engineer",
    employmentType: "full-time",
    joiningDate: new Date("2020-01-10"),
    reportingManagerId: engMgrId,
    status: "active",
    salary: { basic: 100000, hra: 40000, allowances: 20000, deductions: 10000, netSalary: 150000, currency: "INR" },
    address: { street: "333 Marathahalli", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560037" },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// HR Manager
db.employees.insertOne({
  tenantId: tenantId.toString(),
  employeeCode: "EMP009",
  firstName: "Divya",
  lastName: "Gupta",
  email: "divya.gupta@acme.local",
  phone: "+91-9876543218",
  dateOfBirth: new Date("1991-06-22"),
  gender: "female",
  maritalStatus: "married",
  departmentId: hrDept,
  designation: "HR Manager",
  employmentType: "full-time",
  joiningDate: new Date("2017-08-01"),
  reportingManagerId: hrDirId,
  status: "active",
  salary: { basic: 120000, hra: 48000, allowances: 24000, deductions: 12000, netSalary: 180000, currency: "INR" },
  address: { street: "444 JP Nagar", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560078" },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Finance Manager
db.employees.insertOne({
  tenantId: tenantId.toString(),
  employeeCode: "EMP010",
  firstName: "Sanjay",
  lastName: "Rao",
  email: "sanjay.rao@acme.local",
  phone: "+91-9876543219",
  dateOfBirth: new Date("1988-02-14"),
  gender: "male",
  maritalStatus: "married",
  departmentId: finDept,
  designation: "Finance Manager",
  employmentType: "full-time",
  joiningDate: new Date("2015-11-01"),
  reportingManagerId: cfoId,
  status: "active",
  salary: { basic: 130000, hra: 52000, allowances: 26000, deductions: 13000, netSalary: 195000, currency: "INR" },
  address: { street: "666 Jayanagar", city: "Bangalore", state: "Karnataka", country: "India", zipCode: "560041" },
  createdAt: new Date(),
  updatedAt: new Date()
});

print("Created 10 employees in hrm_employees");

// Print summary
print("");
print("=== Sample Data Created Successfully ===");
print("Tenant ID: " + tenantId.toString());
print("Tenant: Acme Corporation (slug: acme)");
print("Departments: 5");
print("Employees: 10 (with reporting hierarchy)");
print("");
print("Organization Structure:");
print("CEO (Rajesh Kumar)");
print("  +-- CTO (Priya Sharma)");
print("  |     +-- Engineering Manager (Vikram Singh)");
print("  |           +-- Senior Software Engineer (Arjun Menon)");
print("  |           +-- Senior Software Engineer (Kavitha Nair)");
print("  |           +-- Software Engineer (Rahul Verma)");
print("  +-- HR Director (Amit Patel)");
print("  |     +-- HR Manager (Divya Gupta)");
print("  +-- CFO (Sneha Reddy)");
print("        +-- Finance Manager (Sanjay Rao)");
print("");
print("Now register an admin user with this tenant ID:");
print("curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"admin@acme.local\",\"password\":\"admin123\",\"firstName\":\"Admin\",\"lastName\":\"User\",\"tenantId\":\"" + tenantId.toString() + "\",\"role\":\"tenant_admin\"}'");
