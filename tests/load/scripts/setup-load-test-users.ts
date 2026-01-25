/**
 * Script to set up load test users
 * Run this before executing load tests
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface TestUser {
  email: string;
  password: string;
}

const users: TestUser[] = [];

// Generate 50 test users
for (let i = 1; i <= 50; i++) {
  users.push({
    email: `loadtest${i}@hrm.test`,
    password: 'LoadTest@123456',
  });
}

async function createTenant() {
  console.log('Creating load test tenant...');

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      name: 'Load Test Company',
      slug: `load-test-company-${Date.now()}`,
      adminEmail: 'loadtest-admin@hrm.test',
      adminPassword: 'LoadTest@123456',
      adminFirstName: 'Load',
      adminLastName: 'Test',
    });

    if (response.status === 201) {
      console.log('✓ Tenant created successfully');
      return {
        tenantId: response.data.data.tenant._id,
        accessToken: response.data.data.accessToken,
        adminUser: response.data.data.user,
      };
    }
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('⚠ Tenant may already exist, trying to login...');

      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'loadtest-admin@hrm.test',
        password: 'LoadTest@123456',
      });

      if (loginResponse.status === 200) {
        console.log('✓ Logged in to existing tenant');
        return {
          tenantId: loginResponse.data.data.user.tenantId,
          accessToken: loginResponse.data.data.accessToken,
          adminUser: loginResponse.data.data.user,
        };
      }
    }
    throw error;
  }
}

async function createUsers(tenantId: string, accessToken: string) {
  console.log(`Creating ${users.length} test users...`);

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json',
    },
  });

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      await api.post('/api/auth/admin/users', {
        email: user.email,
        password: user.password,
        firstName: `LoadTest`,
        lastName: `User${user.email.match(/\d+/)?.[0] || ''}`,
        role: 'employee',
      });
      created++;
      process.stdout.write(`\r✓ Created ${created} users, skipped ${skipped}...`);
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        skipped++;
        process.stdout.write(`\r✓ Created ${created} users, skipped ${skipped}...`);
      } else {
        console.error(`\n✗ Failed to create user ${user.email}:`, error.message);
      }
    }
  }

  console.log(`\n✓ User setup complete: ${created} created, ${skipped} already existed`);
}

async function createEmployees(tenantId: string, accessToken: string) {
  console.log('Creating employee records for test users...');

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json',
    },
  });

  // First create a department
  let departmentId: string | undefined;
  try {
    const deptResponse = await api.post('/api/departments', {
      name: 'Load Test Department',
      code: 'LTD',
      description: 'Department for load testing',
    });
    departmentId = deptResponse.data.data?.department?._id;
    console.log('✓ Department created');
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('⚠ Department may already exist');
      try {
        const deptList = await api.get('/api/departments');
        const loadTestDept = deptList.data.data?.departments?.find((d: any) => d.code === 'LTD');
        departmentId = loadTestDept?._id;
      } catch {
        console.log('⚠ Could not fetch departments');
      }
    }
  }

  // Create employees
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= 50; i++) {
    try {
      await api.post('/api/employees', {
        firstName: 'LoadTest',
        lastName: `User${i}`,
        email: `loadtest${i}@hrm.test`,
        phone: `+1${String(i).padStart(10, '0')}`,
        position: 'Test Employee',
        employmentType: 'full-time',
        joiningDate: '2024-01-01',
        department: departmentId,
      });
      created++;
      process.stdout.write(`\r✓ Created ${created} employees, skipped ${skipped}...`);
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        skipped++;
        process.stdout.write(`\r✓ Created ${created} employees, skipped ${skipped}...`);
      } else {
        console.error(`\n✗ Failed to create employee ${i}:`, error.message);
      }
    }
  }

  console.log(`\n✓ Employee setup complete: ${created} created, ${skipped} already existed`);
}

async function main() {
  console.log('=================================');
  console.log('HRM Load Test Setup Script');
  console.log('=================================\n');

  try {
    const { tenantId, accessToken } = await createTenant();
    console.log(`Tenant ID: ${tenantId}\n`);

    await createUsers(tenantId, accessToken);
    await createEmployees(tenantId, accessToken);

    console.log('\n=================================');
    console.log('✓ Load test setup complete!');
    console.log('=================================');
    console.log('\nYou can now run load tests with:');
    console.log('  npm run test:load');
    console.log('  npm run test:load:concurrent');
    console.log('  npm run test:load:stress');
    console.log('=================================\n');
  } catch (error: any) {
    console.error('\n✗ Setup failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Make sure the HRM API is running on', API_BASE_URL);
    }
    process.exit(1);
  }
}

main();
