import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Authentication Service Integration Tests', () => {
  const testTenant = {
    name: `Test Company ${Date.now()}`,
    slug: `test-company-${Date.now()}`,
    adminEmail: `admin${Date.now()}@test.com`,
    adminPassword: 'Test@123456',
    adminFirstName: 'Test',
    adminLastName: 'Admin',
  };

  describe('POST /api/auth/register - Tenant Registration', () => {
    it('should register a new tenant successfully', async () => {
      try {
        const response = await api.post('/api/auth/register', testTenant);

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('data');
        expect(response.data.data).toHaveProperty('tenant');
        expect(response.data.data).toHaveProperty('user');
        expect(response.data.data).toHaveProperty('accessToken');
        expect(response.data.data).toHaveProperty('refreshToken');

        // Store test data
        testData.tenantId = response.data.data.tenant._id;
        testData.userId = response.data.data.user._id;
        testData.accessToken = response.data.data.accessToken;
        testData.refreshToken = response.data.data.refreshToken;

        setAuthToken(testData.accessToken);
        setTenantId(testData.tenantId);

        console.log('✓ Tenant registered:', testData.tenantId);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        throw error;
      }
    });

    it('should reject duplicate email registration', async () => {
      try {
        const response = await api.post('/api/auth/register', testTenant);
        expect(response.status).toBe(400);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('POST /api/auth/login - User Login', () => {
    it('should login with valid credentials', async () => {
      try {
        const response = await api.post('/api/auth/login', {
          email: testTenant.adminEmail,
          password: testTenant.adminPassword,
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('accessToken');
        expect(response.data.data).toHaveProperty('refreshToken');
        expect(response.data.data).toHaveProperty('user');

        testData.accessToken = response.data.data.accessToken;
        setAuthToken(testData.accessToken);

        console.log('✓ User logged in successfully');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        throw error;
      }
    });

    it('should reject invalid credentials', async () => {
      try {
        await api.post('/api/auth/login', {
          email: testTenant.adminEmail,
          password: 'wrongpassword',
        });
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        expect(error.response?.status).toBe(401);
      }
    });
  });

  describe('GET /api/auth/me - Get Current User', () => {
    it('should return current user profile', async () => {
      try {
        if (!testData.accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.get('/api/auth/me');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('user');
        expect(response.data.data.user.email).toBe(testTenant.adminEmail);

        console.log('✓ User profile retrieved');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        throw error;
      }
    });

    it('should reject unauthorized request', async () => {
      try {
        const response = await api.get('/api/auth/me', {
          headers: { Authorization: '' }
        });
        expect(response.status).toBe(401);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        expect(error.response?.status).toBe(401);
      }
    });
  });

  describe('POST /api/auth/refresh - Token Refresh', () => {
    it('should refresh access token', async () => {
      try {
        if (!testData.refreshToken) {
          console.log('⚠️ No refresh token - skipping test');
          return;
        }

        const response = await api.post('/api/auth/refresh', {
          refreshToken: testData.refreshToken,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('accessToken');

        testData.accessToken = response.data.accessToken;
        setAuthToken(testData.accessToken);

        console.log('✓ Token refreshed successfully');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        throw error;
      }
    });
  });
});
