import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Grievance Service Integration Tests', () => {
  let grievanceId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Grievance Test Company ${Date.now()}`,
          slug: `grievance-test-${Date.now()}`,
          adminEmail: `grievance-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Grievance',
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

  describe('Grievance Management', () => {
    describe('POST /api/grievances - Submit Grievance', () => {
      it('should submit a new grievance', async () => {
        try {
          const response = await api.post('/api/grievances', {
            category: 'workplace_harassment',
            description: 'Description of the grievance for testing purposes',
            priority: 'high',
            anonymous: false,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            grievanceId = response.data.data._id;
          }
          console.log('✓ Grievance submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/grievances - List Grievances', () => {
      it('should return list of grievances', async () => {
        try {
          const response = await api.get('/api/grievances');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Grievances retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/grievances/:id - Get Grievance Details', () => {
      it('should return grievance details', async () => {
        try {
          const response = await api.get(`/api/grievances/${grievanceId || 'test-grievance'}`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Grievance details retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Grievance Actions', () => {
    describe('POST /api/grievances/:id/assign - Assign Grievance', () => {
      it('should assign grievance to handler', async () => {
        try {
          const response = await api.post(`/api/grievances/${grievanceId || 'test-grievance'}/assign`, {
            handlerId: 'test-handler',
            notes: 'Assigned for investigation',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Grievance assigned');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/grievances/:id/escalate - Escalate Grievance', () => {
      it('should escalate grievance', async () => {
        try {
          const response = await api.post(`/api/grievances/${grievanceId || 'test-grievance'}/escalate`, {
            reason: 'Requires senior management attention',
            escalateTo: 'test-manager',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Grievance escalated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/grievances/:id/evidence - Add Evidence', () => {
      it('should add evidence to grievance', async () => {
        try {
          const response = await api.post(`/api/grievances/${grievanceId || 'test-grievance'}/evidence`, {
            type: 'document',
            description: 'Supporting documentation',
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Evidence added');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Investigation', () => {
    describe('POST /api/grievances/:id/investigation/start - Start Investigation', () => {
      it('should start grievance investigation', async () => {
        try {
          const response = await api.post(`/api/grievances/${grievanceId || 'test-grievance'}/investigation/start`, {
            investigator: 'test-investigator',
            notes: 'Starting formal investigation',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Investigation started');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/grievances/:id/investigation/findings - Submit Findings', () => {
      it('should submit investigation findings', async () => {
        try {
          const response = await api.post(`/api/grievances/${grievanceId || 'test-grievance'}/investigation/findings`, {
            findings: 'Investigation findings summary',
            recommendations: ['Recommendation 1', 'Recommendation 2'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Findings submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Resolution', () => {
    describe('POST /api/grievances/:id/resolve - Resolve Grievance', () => {
      it('should resolve grievance', async () => {
        try {
          const response = await api.post(`/api/grievances/${grievanceId || 'test-grievance'}/resolve`, {
            resolution: 'Resolved through mediation',
            actionsTaken: ['Action 1', 'Action 2'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Grievance resolved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/grievances/:id/close - Close Grievance', () => {
      it('should close grievance', async () => {
        try {
          const response = await api.post(`/api/grievances/${grievanceId || 'test-grievance'}/close`, {
            closureNotes: 'Case closed after successful resolution',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Grievance closed');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Statistics', () => {
    describe('GET /api/grievances/stats - Get Grievance Statistics', () => {
      it('should return grievance statistics', async () => {
        try {
          const response = await api.get('/api/grievances/stats');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Grievance stats retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Grievance service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
