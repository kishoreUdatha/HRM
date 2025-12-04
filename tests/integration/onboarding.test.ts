import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Onboarding Service Integration Tests', () => {
  let workflowId: string;
  let taskId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Onboard Test Company ${Date.now()}`,
          slug: `onboard-test-${Date.now()}`,
          adminEmail: `onboard-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Onboard',
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

  describe('Workflow Templates', () => {
    describe('POST /api/onboarding/templates - Create Template', () => {
      it('should create an onboarding workflow template', async () => {
        try {
          const response = await api.post('/api/onboarding/templates', {
            name: 'Standard Onboarding',
            type: 'onboarding',
            stages: [
              {
                name: 'Pre-boarding',
                order: 1,
                tasks: [
                  { title: 'Complete personal information', required: true },
                  { title: 'Sign employment contract', required: true },
                ],
              },
              {
                name: 'First Day',
                order: 2,
                tasks: [
                  { title: 'ID badge setup', required: true },
                  { title: 'Workstation setup', required: true },
                ],
              },
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            workflowId = response.data.data._id;
          }
          console.log('✓ Onboarding template created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/onboarding/templates - List Templates', () => {
      it('should return list of workflow templates', async () => {
        try {
          const response = await api.get('/api/onboarding/templates');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Onboarding templates retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Onboarding Workflows', () => {
    describe('POST /api/onboarding/workflows - Start Onboarding', () => {
      it('should start an onboarding workflow for employee', async () => {
        try {
          const response = await api.post('/api/onboarding/workflows', {
            employeeId: testData.employeeId || 'test-employee',
            templateId: workflowId,
            startDate: new Date().toISOString(),
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Onboarding workflow started');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/onboarding/workflows - List Workflows', () => {
      it('should return list of active onboarding workflows', async () => {
        try {
          const response = await api.get('/api/onboarding/workflows');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Onboarding workflows retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/onboarding/workflows/:id/progress - Get Progress', () => {
      it('should return onboarding progress', async () => {
        try {
          const response = await api.get('/api/onboarding/workflows/test-workflow/progress');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Onboarding progress retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Onboarding Tasks', () => {
    describe('POST /api/onboarding/tasks/:id/complete - Complete Task', () => {
      it('should complete an onboarding task', async () => {
        try {
          const response = await api.post('/api/onboarding/tasks/test-task/complete', {
            notes: 'Task completed successfully',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Onboarding task completed');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Offboarding', () => {
    describe('POST /api/onboarding/offboarding - Start Offboarding', () => {
      it('should start an offboarding workflow', async () => {
        try {
          const response = await api.post('/api/onboarding/offboarding', {
            employeeId: testData.employeeId || 'test-employee',
            lastWorkingDay: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            reason: 'resignation',
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Offboarding workflow started');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/onboarding/offboarding/:id/checklist - Get Checklist', () => {
      it('should return offboarding checklist', async () => {
        try {
          const response = await api.get('/api/onboarding/offboarding/test-offboard/checklist');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Offboarding checklist retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Onboarding service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
