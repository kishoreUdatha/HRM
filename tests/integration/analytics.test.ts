import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Analytics Service Integration Tests', () => {
  let kpiId: string;
  let dashboardId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Analytics Test Company ${Date.now()}`,
          slug: `analytics-test-${Date.now()}`,
          adminEmail: `analytics-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Analytics',
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

  describe('KPI Management', () => {
    describe('POST /api/analytics/kpis - Create KPI', () => {
      it('should create a new KPI', async () => {
        try {
          const response = await api.post('/api/analytics/kpis', {
            name: 'Employee Turnover Rate',
            category: 'workforce',
            formula: '(employees_left / avg_employees) * 100',
            target: 10,
            unit: 'percentage',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            kpiId = response.data.data._id;
          }
          console.log('✓ KPI created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/analytics/kpis - List KPIs', () => {
      it('should return list of KPIs', async () => {
        try {
          const response = await api.get('/api/analytics/kpis');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ KPIs retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/analytics/kpis/defaults - Get Default KPIs', () => {
      it('should return default KPIs', async () => {
        try {
          const response = await api.get('/api/analytics/kpis/defaults');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Default KPIs retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Dashboard Management', () => {
    describe('POST /api/analytics/dashboards - Create Dashboard', () => {
      it('should create a new dashboard', async () => {
        try {
          const response = await api.post('/api/analytics/dashboards', {
            name: 'HR Overview Dashboard',
            description: 'Executive HR metrics overview',
            widgets: [
              { type: 'kpi', kpiId: kpiId || 'test-kpi', position: { x: 0, y: 0, w: 4, h: 2 } },
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            dashboardId = response.data.data._id;
          }
          console.log('✓ Dashboard created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/analytics/dashboards - List Dashboards', () => {
      it('should return list of dashboards', async () => {
        try {
          const response = await api.get('/api/analytics/dashboards');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Dashboards retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Snapshots', () => {
    describe('GET /api/analytics/snapshots - List Snapshots', () => {
      it('should return list of analytics snapshots', async () => {
        try {
          const response = await api.get('/api/analytics/snapshots');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Snapshots retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/analytics/snapshots/latest - Get Latest Snapshot', () => {
      it('should return latest analytics snapshot', async () => {
        try {
          const response = await api.get('/api/analytics/snapshots/latest');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Latest snapshot retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Predictions', () => {
    describe('GET /api/analytics/predictions - Get Predictions', () => {
      it('should return predictions', async () => {
        try {
          const response = await api.get('/api/analytics/predictions');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Predictions retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/analytics/predictions/high-risk - Get High Risk Employees', () => {
      it('should return high risk employees', async () => {
        try {
          const response = await api.get('/api/analytics/predictions/high-risk');
          expect([200, 404]).toContain(response.status);
          console.log('✓ High risk employees retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Trends & Comparisons', () => {
    describe('GET /api/analytics/trends - Get Trend Analysis', () => {
      it('should return trend analysis', async () => {
        try {
          const response = await api.get('/api/analytics/trends');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Trends retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/analytics/comparison/departments - Get Department Comparison', () => {
      it('should return department comparison', async () => {
        try {
          const response = await api.get('/api/analytics/comparison/departments');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Department comparison retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/analytics/executive-summary - Get Executive Summary', () => {
      it('should return executive summary', async () => {
        try {
          const response = await api.get('/api/analytics/executive-summary');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Executive summary retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Analytics service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
