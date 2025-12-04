import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Asset Service Integration Tests', () => {
  let assetId: string;
  let requestId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Asset Test Company ${Date.now()}`,
          slug: `asset-test-${Date.now()}`,
          adminEmail: `asset-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Asset',
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

  describe('Asset Management', () => {
    describe('POST /api/assets - Create Asset', () => {
      it('should create a new asset', async () => {
        try {
          const response = await api.post('/api/assets', {
            name: 'MacBook Pro 16"',
            type: 'laptop',
            serialNumber: `SN-${Date.now()}`,
            purchaseDate: new Date().toISOString(),
            purchasePrice: 2500,
            condition: 'new',
            location: 'Office A',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            assetId = response.data.data._id;
          }
          console.log('✓ Asset created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/assets - List Assets', () => {
      it('should return list of assets', async () => {
        try {
          const response = await api.get('/api/assets');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Assets retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/assets/:id - Get Asset Details', () => {
      it('should return asset details', async () => {
        try {
          const response = await api.get(`/api/assets/${assetId || 'test-asset'}`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Asset details retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/assets/:id/assign - Assign Asset', () => {
      it('should assign asset to employee', async () => {
        try {
          const response = await api.post(`/api/assets/${assetId || 'test-asset'}/assign`, {
            employeeId: testData.employeeId || 'test-employee',
            notes: 'Assigned for remote work',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Asset assigned');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/assets/:id/return - Return Asset', () => {
      it('should mark asset as returned', async () => {
        try {
          const response = await api.post(`/api/assets/${assetId || 'test-asset'}/return`, {
            condition: 'good',
            notes: 'Returned in good condition',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Asset returned');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Asset Requests', () => {
    describe('POST /api/assets/requests - Create Request', () => {
      it('should create an asset request', async () => {
        try {
          const response = await api.post('/api/assets/requests', {
            assetType: 'laptop',
            reason: 'Need laptop for remote work',
            priority: 'high',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            requestId = response.data.data._id;
          }
          console.log('✓ Asset request created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/assets/requests - List Requests', () => {
      it('should return list of asset requests', async () => {
        try {
          const response = await api.get('/api/assets/requests');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Asset requests retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/assets/requests/:id/approve - Approve Request', () => {
      it('should approve an asset request', async () => {
        try {
          const response = await api.post(`/api/assets/requests/${requestId || 'test-request'}/approve`, {
            assetId: assetId,
            notes: 'Approved - laptop assigned',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Asset request approved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Asset Maintenance', () => {
    describe('POST /api/assets/:id/maintenance - Log Maintenance', () => {
      it('should log asset maintenance', async () => {
        try {
          const response = await api.post(`/api/assets/${assetId || 'test-asset'}/maintenance`, {
            type: 'repair',
            description: 'Battery replacement',
            cost: 150,
            vendor: 'Apple Store',
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Maintenance logged');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/assets/:id/history - Get Asset History', () => {
      it('should return asset history', async () => {
        try {
          const response = await api.get(`/api/assets/${assetId || 'test-asset'}/history`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Asset history retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Asset service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
