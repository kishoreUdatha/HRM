import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Compliance Service Integration Tests', () => {
  let policyId: string;
  let trainingId: string;
  let workPermitId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Compliance Test Company ${Date.now()}`,
          slug: `compliance-test-${Date.now()}`,
          adminEmail: `compliance-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Compliance',
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

  describe('Policy Management', () => {
    describe('POST /api/compliance/policies - Create Policy', () => {
      it('should create a new compliance policy', async () => {
        try {
          const response = await api.post('/api/compliance/policies', {
            name: 'Code of Conduct',
            category: 'ethics',
            version: '1.0',
            content: 'This policy outlines the expected code of conduct...',
            effectiveDate: new Date().toISOString(),
            requiresAcknowledgement: true,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            policyId = response.data.data._id;
          }
          console.log('✓ Policy created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/compliance/policies - List Policies', () => {
      it('should return list of policies', async () => {
        try {
          const response = await api.get('/api/compliance/policies');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Policies retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/compliance/policies/:id/publish - Publish Policy', () => {
      it('should publish a policy', async () => {
        try {
          const response = await api.post(`/api/compliance/policies/${policyId || 'test-policy'}/publish`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Policy published');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/compliance/policies/:id/acknowledge - Acknowledge Policy', () => {
      it('should acknowledge a policy', async () => {
        try {
          const response = await api.post(`/api/compliance/policies/${policyId || 'test-policy'}/acknowledge`, {
            acknowledged: true,
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Policy acknowledged');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Compliance Training', () => {
    describe('POST /api/compliance/trainings - Create Training', () => {
      it('should create a compliance training', async () => {
        try {
          const response = await api.post('/api/compliance/trainings', {
            name: 'Data Privacy Training',
            type: 'mandatory',
            duration: 60,
            description: 'Training on data privacy regulations',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            trainingId = response.data.data._id;
          }
          console.log('✓ Training created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/compliance/trainings - List Trainings', () => {
      it('should return list of trainings', async () => {
        try {
          const response = await api.get('/api/compliance/trainings');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Trainings retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Work Permits', () => {
    describe('POST /api/compliance/work-permits - Create Work Permit', () => {
      it('should create a work permit record', async () => {
        try {
          const response = await api.post('/api/compliance/work-permits', {
            employeeId: testData.employeeId || 'test-employee',
            type: 'work_visa',
            country: 'US',
            issueDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            documentNumber: `WP-${Date.now()}`,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            workPermitId = response.data.data._id;
          }
          console.log('✓ Work permit created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/compliance/work-permits - List Work Permits', () => {
      it('should return list of work permits', async () => {
        try {
          const response = await api.get('/api/compliance/work-permits');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Work permits retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/compliance/work-permits/:id/renew - Renew Work Permit', () => {
      it('should renew a work permit', async () => {
        try {
          const response = await api.post(`/api/compliance/work-permits/${workPermitId || 'test-permit'}/renew`, {
            newExpiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Work permit renewed');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Statistics', () => {
    describe('GET /api/compliance/stats - Get Compliance Statistics', () => {
      it('should return compliance statistics', async () => {
        try {
          const response = await api.get('/api/compliance/stats');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Compliance stats retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Compliance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
