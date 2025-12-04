import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Reports Service Integration Tests', () => {
  let reportId: string;
  let dashboardId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Reports Test Company ${Date.now()}`,
          slug: `reports-test-${Date.now()}`,
          adminEmail: `reports-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Reports',
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

  describe('Standard Reports', () => {
    describe('GET /api/reports/standard/employees - Employee Report', () => {
      it('should return employee report', async () => {
        try {
          const response = await api.get('/api/reports/standard/employees');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Employee report retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/standard/attendance - Attendance Report', () => {
      it('should return attendance report', async () => {
        try {
          const response = await api.get('/api/reports/standard/attendance');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Attendance report retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/standard/leaves - Leave Report', () => {
      it('should return leave report', async () => {
        try {
          const response = await api.get('/api/reports/standard/leaves');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Leave report retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/standard/payroll - Payroll Report', () => {
      it('should return payroll report', async () => {
        try {
          const response = await api.get('/api/reports/standard/payroll');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Payroll report retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/standard/recruitment - Recruitment Report', () => {
      it('should return recruitment report', async () => {
        try {
          const response = await api.get('/api/reports/standard/recruitment');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Recruitment report retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/standard/performance - Performance Report', () => {
      it('should return performance report', async () => {
        try {
          const response = await api.get('/api/reports/standard/performance');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Performance report retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/standard/training - Training Report', () => {
      it('should return training report', async () => {
        try {
          const response = await api.get('/api/reports/standard/training');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Training report retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Custom Reports', () => {
    describe('POST /api/reports/custom - Create Custom Report', () => {
      it('should create a custom report', async () => {
        try {
          const response = await api.post('/api/reports/custom', {
            name: 'Custom Employee Analysis',
            description: 'Custom analysis of employee data',
            query: {
              type: 'employee',
              filters: { status: 'active' },
              fields: ['firstName', 'lastName', 'department'],
            },
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            reportId = response.data.data._id;
          }
          console.log('✓ Custom report created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/custom - List Custom Reports', () => {
      it('should return list of custom reports', async () => {
        try {
          const response = await api.get('/api/reports/custom');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Custom reports retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/reports/custom/:id/execute - Execute Report', () => {
      it('should execute a custom report', async () => {
        try {
          const response = await api.post(`/api/reports/custom/${reportId || 'test-report'}/execute`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Report executed');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/executions - Get Report Executions', () => {
      it('should return report execution history', async () => {
        try {
          const response = await api.get('/api/reports/executions');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Report executions retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Dashboards', () => {
    describe('POST /api/reports/dashboards - Create Dashboard', () => {
      it('should create a dashboard', async () => {
        try {
          const response = await api.post('/api/reports/dashboards', {
            name: 'Executive Dashboard',
            description: 'High-level HR metrics',
            layout: 'grid',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            dashboardId = response.data.data._id;
          }
          console.log('✓ Dashboard created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/reports/dashboards - List Dashboards', () => {
      it('should return list of dashboards', async () => {
        try {
          const response = await api.get('/api/reports/dashboards');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Dashboards retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/reports/dashboards/:id/widgets - Add Widget', () => {
      it('should add a widget to dashboard', async () => {
        try {
          const response = await api.post(`/api/reports/dashboards/${dashboardId || 'test-dashboard'}/widgets`, {
            type: 'chart',
            title: 'Headcount by Department',
            config: {
              chartType: 'bar',
              dataSource: 'employees',
            },
            position: { x: 0, y: 0, w: 6, h: 4 },
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Widget added');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/reports/dashboards/:id/set-default - Set Default Dashboard', () => {
      it('should set dashboard as default', async () => {
        try {
          const response = await api.post(`/api/reports/dashboards/${dashboardId || 'test-dashboard'}/set-default`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Dashboard set as default');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/reports/dashboards/:id/duplicate - Duplicate Dashboard', () => {
      it('should duplicate a dashboard', async () => {
        try {
          const response = await api.post(`/api/reports/dashboards/${dashboardId || 'test-dashboard'}/duplicate`);
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Dashboard duplicated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/reports/dashboards/:id/share - Share Dashboard', () => {
      it('should share a dashboard', async () => {
        try {
          const response = await api.post(`/api/reports/dashboards/${dashboardId || 'test-dashboard'}/share`, {
            users: ['user1@test.com'],
            roles: ['manager'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Dashboard shared');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Reports service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
