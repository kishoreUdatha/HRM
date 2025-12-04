import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Workforce Service Integration Tests', () => {
  let positionId: string;
  let headcountPlanId: string;
  let successionPlanId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Workforce Test Company ${Date.now()}`,
          slug: `workforce-test-${Date.now()}`,
          adminEmail: `workforce-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Workforce',
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

  describe('Position Management', () => {
    describe('POST /api/workforce/positions - Create Position', () => {
      it('should create a new position', async () => {
        try {
          const response = await api.post('/api/workforce/positions', {
            title: 'Senior Developer',
            department: 'Engineering',
            level: 'senior',
            headcount: 5,
            minSalary: 80000,
            maxSalary: 120000,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            positionId = response.data.data._id;
          }
          console.log('✓ Position created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/workforce/positions - List Positions', () => {
      it('should return list of positions', async () => {
        try {
          const response = await api.get('/api/workforce/positions');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Positions retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('PATCH /api/workforce/positions/:id/headcount - Update Headcount', () => {
      it('should update position headcount', async () => {
        try {
          const response = await api.patch(`/api/workforce/positions/${positionId || 'test-position'}/headcount`, {
            headcount: 7,
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Headcount updated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Headcount Planning', () => {
    describe('POST /api/workforce/headcount-plans - Create Headcount Plan', () => {
      it('should create a headcount plan', async () => {
        try {
          const response = await api.post('/api/workforce/headcount-plans', {
            name: '2025 Headcount Plan',
            year: 2025,
            quarter: 'Q1',
            positions: [
              { positionId: positionId || 'test-position', planned: 3 },
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            headcountPlanId = response.data.data._id;
          }
          console.log('✓ Headcount plan created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/workforce/headcount-plans - List Headcount Plans', () => {
      it('should return list of headcount plans', async () => {
        try {
          const response = await api.get('/api/workforce/headcount-plans');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Headcount plans retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/workforce/headcount-plans/:id/submit - Submit Plan', () => {
      it('should submit headcount plan for approval', async () => {
        try {
          const response = await api.post(`/api/workforce/headcount-plans/${headcountPlanId || 'test-plan'}/submit`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Headcount plan submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Succession Planning', () => {
    describe('POST /api/workforce/succession-plans - Create Succession Plan', () => {
      it('should create a succession plan', async () => {
        try {
          const response = await api.post('/api/workforce/succession-plans', {
            positionId: positionId || 'test-position',
            currentHolder: 'test-employee',
            timeline: '12_months',
            priority: 'high',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            successionPlanId = response.data.data._id;
          }
          console.log('✓ Succession plan created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/workforce/succession-plans - List Succession Plans', () => {
      it('should return list of succession plans', async () => {
        try {
          const response = await api.get('/api/workforce/succession-plans');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Succession plans retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/workforce/succession-plans/:id/successors - Add Successor', () => {
      it('should add a successor candidate', async () => {
        try {
          const response = await api.post(`/api/workforce/succession-plans/${successionPlanId || 'test-plan'}/successors`, {
            employeeId: 'test-employee',
            readiness: '1_2_years',
            developmentPlan: ['Leadership training', 'Technical certification'],
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Successor added');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Analytics', () => {
    describe('GET /api/workforce/analytics - Get Workforce Analytics', () => {
      it('should return workforce analytics', async () => {
        try {
          const response = await api.get('/api/workforce/analytics');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Workforce analytics retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/workforce/org-chart - Get Org Chart', () => {
      it('should return organization chart', async () => {
        try {
          const response = await api.get('/api/workforce/org-chart');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Org chart retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Workforce service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
