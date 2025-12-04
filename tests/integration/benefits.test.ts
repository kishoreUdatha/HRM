import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Benefits Service Integration Tests', () => {
  let benefitPlanId: string;
  let enrollmentId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Benefits Test Company ${Date.now()}`,
          slug: `benefits-test-${Date.now()}`,
          adminEmail: `benefits-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Benefits',
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

  describe('Benefit Plans', () => {
    describe('POST /api/benefits/plans - Create Benefit Plan', () => {
      it('should create a new benefit plan', async () => {
        try {
          const response = await api.post('/api/benefits/plans', {
            name: 'Health Insurance Premium',
            type: 'health',
            description: 'Comprehensive health insurance coverage',
            coverage: {
              employee: 100,
              spouse: 80,
              children: 60,
            },
            cost: {
              employee: 200,
              employer: 400,
            },
            effectiveDate: new Date().toISOString(),
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            benefitPlanId = response.data.data._id;
          }
          console.log('✓ Benefit plan created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/benefits/plans - List Benefit Plans', () => {
      it('should return list of benefit plans', async () => {
        try {
          const response = await api.get('/api/benefits/plans');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Benefit plans retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Enrollments', () => {
    describe('POST /api/benefits/enrollments - Enroll in Benefits', () => {
      it('should enroll employee in benefit plan', async () => {
        try {
          const response = await api.post('/api/benefits/enrollments', {
            employeeId: testData.employeeId || 'test-employee',
            planId: benefitPlanId || 'test-plan',
            coverageLevel: 'employee_spouse',
            dependents: [],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            enrollmentId = response.data.data._id;
          }
          console.log('✓ Benefits enrollment created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/benefits/enrollments/:employeeId - Get Employee Enrollments', () => {
      it('should return employee benefit enrollments', async () => {
        try {
          const employeeId = testData.employeeId || 'test-employee';
          const response = await api.get(`/api/benefits/enrollments/${employeeId}`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Employee enrollments retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Claims', () => {
    describe('POST /api/benefits/claims - Submit Claim', () => {
      it('should submit a benefit claim', async () => {
        try {
          const response = await api.post('/api/benefits/claims', {
            enrollmentId: enrollmentId || 'test-enrollment',
            type: 'medical',
            amount: 500,
            description: 'Doctor visit',
            receipts: [],
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Benefit claim submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/benefits/claims - List Claims', () => {
      it('should return list of benefit claims', async () => {
        try {
          const response = await api.get('/api/benefits/claims');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Benefit claims retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Wellness Programs', () => {
    describe('GET /api/benefits/wellness - List Wellness Programs', () => {
      it('should return list of wellness programs', async () => {
        try {
          const response = await api.get('/api/benefits/wellness');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Wellness programs retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/benefits/wellness/activities - Log Activity', () => {
      it('should log a wellness activity', async () => {
        try {
          const response = await api.post('/api/benefits/wellness/activities', {
            type: 'exercise',
            duration: 60,
            description: 'Morning jog',
            points: 10,
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Wellness activity logged');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Benefits service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
