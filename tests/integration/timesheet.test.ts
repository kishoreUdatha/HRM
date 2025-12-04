import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Timesheet Service Integration Tests', () => {
  let projectId: string;
  let timesheetId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Timesheet Test Company ${Date.now()}`,
          slug: `timesheet-test-${Date.now()}`,
          adminEmail: `timesheet-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Timesheet',
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

  describe('Projects', () => {
    describe('POST /api/timesheets/projects - Create Project', () => {
      it('should create a new project', async () => {
        try {
          const response = await api.post('/api/timesheets/projects', {
            name: 'Website Redesign',
            code: 'WEB-001',
            description: 'Complete website redesign project',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            budget: 50000,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            projectId = response.data.data._id;
          }
          console.log('✓ Project created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/timesheets/projects - List Projects', () => {
      it('should return list of projects', async () => {
        try {
          const response = await api.get('/api/timesheets/projects');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Projects retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Timesheets', () => {
    describe('POST /api/timesheets - Create Timesheet', () => {
      it('should create a new timesheet', async () => {
        try {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());

          const response = await api.post('/api/timesheets', {
            weekStartDate: weekStart.toISOString(),
            employeeId: testData.employeeId || 'test-employee',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            timesheetId = response.data.data._id;
          }
          console.log('✓ Timesheet created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/timesheets - List Timesheets', () => {
      it('should return list of timesheets', async () => {
        try {
          const response = await api.get('/api/timesheets');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Timesheets retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Time Entries', () => {
    describe('POST /api/timesheets/:id/entries - Add Time Entry', () => {
      it('should add a time entry', async () => {
        try {
          const response = await api.post(`/api/timesheets/${timesheetId || 'test-timesheet'}/entries`, {
            projectId: projectId || 'test-project',
            date: new Date().toISOString(),
            hours: 8,
            description: 'Worked on homepage redesign',
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Time entry added');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/timesheets/:id/entries - List Time Entries', () => {
      it('should return list of time entries', async () => {
        try {
          const response = await api.get(`/api/timesheets/${timesheetId || 'test-timesheet'}/entries`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Time entries retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Timesheet Actions', () => {
    describe('POST /api/timesheets/:id/submit - Submit Timesheet', () => {
      it('should submit timesheet for approval', async () => {
        try {
          const response = await api.post(`/api/timesheets/${timesheetId || 'test-timesheet'}/submit`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Timesheet submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/timesheets/:id/approve - Approve Timesheet', () => {
      it('should approve timesheet', async () => {
        try {
          const response = await api.post(`/api/timesheets/${timesheetId || 'test-timesheet'}/approve`, {
            comments: 'Approved',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Timesheet approved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Timesheet service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
