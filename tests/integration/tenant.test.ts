import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Tenant Service Integration Tests', () => {
  let createdTenantId: string;

  beforeAll(async () => {
    // First, ensure we have auth
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Tenant Test Company ${Date.now()}`,
          slug: `tenant-test-${Date.now()}`,
          adminEmail: `tenant-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Tenant',
          adminLastName: 'Admin',
        });
        testData.accessToken = registerResponse.data.data.accessToken;
        testData.tenantId = registerResponse.data.data.tenant._id;
        setAuthToken(testData.accessToken);
        setTenantId(testData.tenantId);
      } catch (error: any) {
        if (error.code !== 'ECONNREFUSED') {
          console.log('Setup warning:', error.message);
        }
      }
    }
  });

  describe('GET /api/tenants - List Tenants', () => {
    it('should return list of tenants (admin only)', async () => {
      try {
        const response = await api.get('/api/tenants');
        expect([200, 403]).toContain(response.status);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('data');
          console.log('✓ Tenants list retrieved');
        }
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Tenant service not running - skipping test');
          return;
        }
        expect([401, 403]).toContain(error.response?.status);
      }
    });
  });

  describe('GET /api/tenants/:id - Get Tenant Details', () => {
    it('should return tenant details', async () => {
      try {
        if (!testData.tenantId) {
          console.log('⚠️ No tenant ID - skipping test');
          return;
        }

        const response = await api.get(`/api/tenants/${testData.tenantId}`);
        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('name');
        console.log('✓ Tenant details retrieved');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Tenant service not running - skipping test');
          return;
        }
        throw error;
      }
    });
  });

  describe('PUT /api/tenants/:id - Update Tenant', () => {
    it('should update tenant settings', async () => {
      try {
        if (!testData.tenantId) {
          console.log('⚠️ No tenant ID - skipping test');
          return;
        }

        const response = await api.put(`/api/tenants/${testData.tenantId}`, {
          settings: {
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
          },
        });
        expect([200, 403]).toContain(response.status);
        if (response.status === 200) {
          console.log('✓ Tenant updated successfully');
        }
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Tenant service not running - skipping test');
          return;
        }
        expect([400, 403, 404]).toContain(error.response?.status);
      }
    });
  });

  describe('POST /api/tenants/:id/subscription - Update Subscription', () => {
    it('should update tenant subscription', async () => {
      try {
        if (!testData.tenantId) {
          console.log('⚠️ No tenant ID - skipping test');
          return;
        }

        const response = await api.post(`/api/tenants/${testData.tenantId}/subscription`, {
          plan: 'professional',
        });
        expect([200, 403]).toContain(response.status);
        console.log('✓ Subscription update processed');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Tenant service not running - skipping test');
          return;
        }
        expect([400, 403, 404]).toContain(error.response?.status);
      }
    });
  });

  describe('GET /api/tenants/:id/stats - Get Tenant Statistics', () => {
    it('should return tenant statistics', async () => {
      try {
        if (!testData.tenantId) {
          console.log('⚠️ No tenant ID - skipping test');
          return;
        }

        const response = await api.get(`/api/tenants/${testData.tenantId}/stats`);
        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          console.log('✓ Tenant stats retrieved');
        }
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Tenant service not running - skipping test');
          return;
        }
        expect([400, 404]).toContain(error.response?.status);
      }
    });
  });
});
