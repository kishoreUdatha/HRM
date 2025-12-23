const http = require('http');

const API_GATEWAY = 'http://localhost:3000';

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_GATEWAY);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('TRIAL MANAGEMENT FEATURE TESTS');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as super admin
    console.log('\n🔐 Logging in as super admin...');
    const loginResult = await makeRequest('POST', '/api/auth/super-admin/login', {
      email: 'superadmin@hrm-platform.com',
      password: 'SuperAdmin@123',
    });

    if (!loginResult.data.success) {
      console.log('❌ Login failed:', loginResult.data.message);
      console.log('   Creating super admin first...');

      // Try to check if we need to create the super admin
      console.log('   Please ensure super admin exists in the database.');
      return;
    }

    const token = loginResult.data.accessToken;
    console.log('✅ Logged in successfully!');

    // Test 1: Get list of tenants
    console.log('\n📋 TEST 1: Fetching tenant list...');
    const listResult = await makeRequest('GET', '/api/tenants/admin/list?limit=10', null, token);

    if (!listResult.data.success) {
      console.log('❌ Failed to fetch tenants:', listResult.data);
      return;
    }

    const tenants = listResult.data.data;
    console.log(`✅ Found ${tenants.length} tenants`);

    // Find tenants for testing
    const activeTenant = tenants.find(t => t.status === 'active');
    const trialTenant = tenants.find(t => t.status === 'trial');

    console.log('\nTenant Status Summary:');
    const statusCounts = tenants.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    // Test 2: Start trial for an active tenant
    if (activeTenant) {
      console.log('\n🚀 TEST 2: Starting 14-day trial for active tenant...');
      console.log(`   Tenant: ${activeTenant.name} (${activeTenant._id})`);
      console.log(`   Current Status: ${activeTenant.status}`);
      console.log(`   Current Plan: ${activeTenant.subscription?.plan || 'N/A'}`);

      const startTrialResult = await makeRequest('POST', `/api/tenants/admin/${activeTenant._id}/start-trial`, {
        days: 14,
        plan: 'professional',
      }, token);

      if (startTrialResult.data.success) {
        console.log('✅ Trial started successfully!');
        console.log(`   New Status: ${startTrialResult.data.data.status}`);
        console.log(`   Trial Ends: ${startTrialResult.data.data.trialEndsAt}`);
        console.log(`   Plan: ${startTrialResult.data.data.subscription?.plan}`);
      } else {
        console.log('❌ Failed to start trial:', startTrialResult.data.message);
      }
    } else {
      console.log('\n⚠️ TEST 2: No active tenant found to test start trial');
    }

    // Test 3: Extend trial for a trial tenant
    // First, get updated list to find a trial tenant
    const updatedListResult = await makeRequest('GET', '/api/tenants/admin/list?limit=10&status=trial', null, token);
    const updatedTrialTenant = updatedListResult.data.data?.[0];

    if (updatedTrialTenant) {
      console.log('\n⏰ TEST 3: Extending trial by 7 days...');
      console.log(`   Tenant: ${updatedTrialTenant.name} (${updatedTrialTenant._id})`);
      console.log(`   Current Trial Ends: ${updatedTrialTenant.trialEndsAt}`);

      const extendResult = await makeRequest('PUT', `/api/tenants/admin/${updatedTrialTenant._id}/extend-trial`, {
        days: 7,
      }, token);

      if (extendResult.data.success) {
        console.log('✅ Trial extended successfully!');
        console.log(`   New Trial End: ${extendResult.data.data.trialEndsAt}`);
      } else {
        console.log('❌ Failed to extend trial:', extendResult.data.message);
      }

      // Test 4: End trial and convert to starter plan
      console.log('\n🔚 TEST 4: Ending trial and converting to starter plan...');

      const endTrialResult = await makeRequest('POST', `/api/tenants/admin/${updatedTrialTenant._id}/end-trial`, {
        convertToPlan: 'starter',
      }, token);

      if (endTrialResult.data.success) {
        console.log('✅ Trial ended successfully!');
        console.log(`   New Status: ${endTrialResult.data.data.status}`);
        console.log(`   New Plan: ${endTrialResult.data.data.subscription?.plan}`);
        console.log(`   Trial Ends At: ${endTrialResult.data.data.trialEndsAt || 'None (trial ended)'}`);
      } else {
        console.log('❌ Failed to end trial:', endTrialResult.data.message);
      }
    } else {
      console.log('\n⚠️ TEST 3 & 4: No trial tenant found');
    }

    // Test 5: Start trial with custom duration (30 days) and enterprise plan
    const freshListResult = await makeRequest('GET', '/api/tenants/admin/list?limit=10&status=active', null, token);
    const anotherActiveTenant = freshListResult.data.data?.find(t => t.status === 'active');

    if (anotherActiveTenant) {
      console.log('\n🌟 TEST 5: Starting 30-day enterprise trial...');
      console.log(`   Tenant: ${anotherActiveTenant.name}`);

      const enterpriseTrialResult = await makeRequest('POST', `/api/tenants/admin/${anotherActiveTenant._id}/start-trial`, {
        days: 30,
        plan: 'enterprise',
      }, token);

      if (enterpriseTrialResult.data.success) {
        console.log('✅ Enterprise trial started!');
        console.log(`   Duration: 30 days`);
        console.log(`   Plan: ${enterpriseTrialResult.data.data.subscription?.plan}`);
        console.log(`   Max Employees: ${enterpriseTrialResult.data.data.subscription?.maxEmployees}`);
        console.log(`   Features: ${enterpriseTrialResult.data.data.subscription?.features?.slice(0, 5).join(', ')}...`);
      } else {
        console.log('❌ Failed:', enterpriseTrialResult.data.message);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    const finalListResult = await makeRequest('GET', '/api/tenants/admin/list?limit=50', null, token);
    const finalTenants = finalListResult.data.data || [];

    const finalStatusCounts = finalTenants.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\nFinal Tenant Status Distribution:');
    Object.entries(finalStatusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    const trialTenantsFinal = finalTenants.filter(t => t.status === 'trial');
    if (trialTenantsFinal.length > 0) {
      console.log('\nActive Trials:');
      trialTenantsFinal.slice(0, 5).forEach(t => {
        const daysLeft = t.trialEndsAt
          ? Math.ceil((new Date(t.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
          : 'N/A';
        console.log(`  - ${t.name}: ${t.subscription?.plan} plan, ${daysLeft} days remaining`);
      });
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

runTests();
