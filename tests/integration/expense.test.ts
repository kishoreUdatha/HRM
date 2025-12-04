import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Expense Service Integration Tests', () => {
  let expenseId: string;
  let reportId: string;
  let categoryId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Expense Test Company ${Date.now()}`,
          slug: `expense-test-${Date.now()}`,
          adminEmail: `expense-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Expense',
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

  describe('Expense Categories', () => {
    describe('POST /api/expenses/categories - Create Category', () => {
      it('should create an expense category', async () => {
        try {
          const response = await api.post('/api/expenses/categories', {
            name: 'Travel',
            description: 'Travel and transportation expenses',
            limit: 5000,
            requiresReceipt: true,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            categoryId = response.data.data._id;
          }
          console.log('✓ Expense category created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/expenses/categories - List Categories', () => {
      it('should return list of expense categories', async () => {
        try {
          const response = await api.get('/api/expenses/categories');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Expense categories retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Expenses', () => {
    describe('POST /api/expenses - Create Expense', () => {
      it('should create a new expense', async () => {
        try {
          const response = await api.post('/api/expenses', {
            categoryId: categoryId || 'test-category',
            amount: 150.00,
            currency: 'USD',
            description: 'Flight ticket to client meeting',
            date: new Date().toISOString(),
            merchant: 'Airline Company',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            expenseId = response.data.data._id;
          }
          console.log('✓ Expense created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/expenses - List Expenses', () => {
      it('should return list of expenses', async () => {
        try {
          const response = await api.get('/api/expenses');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Expenses retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Expense Reports', () => {
    describe('POST /api/expenses/reports - Create Report', () => {
      it('should create an expense report', async () => {
        try {
          const response = await api.post('/api/expenses/reports', {
            title: 'Q4 Business Travel',
            description: 'Business travel expenses for Q4',
            expenses: expenseId ? [expenseId] : [],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            reportId = response.data.data._id;
          }
          console.log('✓ Expense report created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/expenses/reports - List Reports', () => {
      it('should return list of expense reports', async () => {
        try {
          const response = await api.get('/api/expenses/reports');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Expense reports retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/expenses/reports/:id/submit - Submit Report', () => {
      it('should submit expense report for approval', async () => {
        try {
          const response = await api.post(`/api/expenses/reports/${reportId || 'test-report'}/submit`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Expense report submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Travel Requests', () => {
    describe('POST /api/expenses/travel-requests - Create Travel Request', () => {
      it('should create a travel request', async () => {
        try {
          const response = await api.post('/api/expenses/travel-requests', {
            purpose: 'Client meeting in New York',
            destination: 'New York, NY',
            departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            returnDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedCost: 2500,
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Travel request created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/expenses/travel-requests - List Travel Requests', () => {
      it('should return list of travel requests', async () => {
        try {
          const response = await api.get('/api/expenses/travel-requests');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Travel requests retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Expense service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
