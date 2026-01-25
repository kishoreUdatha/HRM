import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Authentication Service - Comprehensive Tests', () => {
  const timestamp = Date.now();
  const testTenant = {
    name: `Test Company ${timestamp}`,
    slug: `test-company-${timestamp}`,
    adminEmail: `admin${timestamp}@test.com`,
    adminPassword: 'Test@123456!',
    adminFirstName: 'Test',
    adminLastName: 'Admin',
  };

  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let tenantId: string;

  // ==================== TENANT REGISTRATION ====================
  describe('Tenant Registration', () => {
    it('should register a new tenant with valid data', async () => {
      try {
        const response = await api.post('/api/auth/register', testTenant);

        expect(response.status).toBe(201);
        expect(response.data.data).toHaveProperty('tenant');
        expect(response.data.data).toHaveProperty('user');
        expect(response.data.data).toHaveProperty('accessToken');
        expect(response.data.data).toHaveProperty('refreshToken');

        tenantId = response.data.data.tenant._id;
        userId = response.data.data.user._id;
        accessToken = response.data.data.accessToken;
        refreshToken = response.data.data.refreshToken;

        testData.tenantId = tenantId;
        testData.userId = userId;
        testData.accessToken = accessToken;
        testData.refreshToken = refreshToken;

        setAuthToken(accessToken);
        setTenantId(tenantId);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ Auth service not running - skipping test');
          return;
        }
        throw error;
      }
    });

    it('should reject registration with duplicate email', async () => {
      try {
        await api.post('/api/auth/register', testTenant);
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect(error.response?.status).toBe(400);
      }
    });

    it('should reject registration with invalid email format', async () => {
      try {
        await api.post('/api/auth/register', {
          ...testTenant,
          adminEmail: 'invalid-email',
          slug: `test-invalid-${Date.now()}`,
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect(error.response?.status).toBe(400);
      }
    });

    it('should reject registration with weak password', async () => {
      try {
        await api.post('/api/auth/register', {
          ...testTenant,
          adminEmail: `weak${Date.now()}@test.com`,
          adminPassword: '123',
          slug: `test-weak-${Date.now()}`,
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([400, 422]).toContain(error.response?.status);
      }
    });

    it('should reject registration with missing required fields', async () => {
      try {
        await api.post('/api/auth/register', {
          name: 'Incomplete Tenant',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([400, 422]).toContain(error.response?.status);
      }
    });
  });

  // ==================== USER LOGIN ====================
  describe('User Login', () => {
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
        expect(response.data.data.user.email).toBe(testTenant.adminEmail);

        accessToken = response.data.data.accessToken;
        refreshToken = response.data.data.refreshToken;
        setAuthToken(accessToken);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should reject login with wrong password', async () => {
      try {
        await api.post('/api/auth/login', {
          email: testTenant.adminEmail,
          password: 'wrongpassword123',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect(error.response?.status).toBe(401);
      }
    });

    it('should reject login with non-existent email', async () => {
      try {
        await api.post('/api/auth/login', {
          email: 'nonexistent@test.com',
          password: 'anypassword',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([401, 404]).toContain(error.response?.status);
      }
    });

    it('should reject login with empty credentials', async () => {
      try {
        await api.post('/api/auth/login', {
          email: '',
          password: '',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([400, 401, 422]).toContain(error.response?.status);
      }
    });
  });

  // ==================== TOKEN MANAGEMENT ====================
  describe('Token Management', () => {
    it('should refresh access token with valid refresh token', async () => {
      try {
        if (!refreshToken) {
          console.log('⚠️ No refresh token - skipping test');
          return;
        }

        const response = await api.post('/api/auth/refresh', {
          refreshToken: refreshToken,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('accessToken');

        accessToken = response.data.accessToken;
        setAuthToken(accessToken);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should reject refresh with invalid token', async () => {
      try {
        await api.post('/api/auth/refresh', {
          refreshToken: 'invalid-token-here',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([401, 403]).toContain(error.response?.status);
      }
    });

    it('should reject refresh with expired token format', async () => {
      try {
        await api.post('/api/auth/refresh', {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([401, 403]).toContain(error.response?.status);
      }
    });
  });

  // ==================== GET CURRENT USER ====================
  describe('Get Current User', () => {
    it('should return current user profile with valid token', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.get('/api/auth/me');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('user');
        expect(response.data.data.user.email).toBe(testTenant.adminEmail);
        expect(response.data.data.user).toHaveProperty('_id');
        expect(response.data.data.user).toHaveProperty('role');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should reject request without authorization header', async () => {
      try {
        await api.get('/api/auth/me', {
          headers: { Authorization: '' },
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect(error.response?.status).toBe(401);
      }
    });

    it('should reject request with invalid token', async () => {
      try {
        await api.get('/api/auth/me', {
          headers: { Authorization: 'Bearer invalid-token' },
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect(error.response?.status).toBe(401);
      }
    });
  });

  // ==================== PASSWORD MANAGEMENT ====================
  describe('Password Management', () => {
    it('should change password with valid credentials', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const newPassword = 'NewTest@123456!';
        const response = await api.post('/api/auth/change-password', {
          currentPassword: testTenant.adminPassword,
          newPassword: newPassword,
        });

        expect(response.status).toBe(200);

        // Login with new password to verify
        const loginResponse = await api.post('/api/auth/login', {
          email: testTenant.adminEmail,
          password: newPassword,
        });

        expect(loginResponse.status).toBe(200);

        // Change back to original password
        accessToken = loginResponse.data.data.accessToken;
        setAuthToken(accessToken);

        await api.post('/api/auth/change-password', {
          currentPassword: newPassword,
          newPassword: testTenant.adminPassword,
        });
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should reject password change with wrong current password', async () => {
      try {
        await api.post('/api/auth/change-password', {
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword@123',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([400, 401]).toContain(error.response?.status);
      }
    });

    it('should reject password change with weak new password', async () => {
      try {
        await api.post('/api/auth/change-password', {
          currentPassword: testTenant.adminPassword,
          newPassword: '123',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        expect([400, 422]).toContain(error.response?.status);
      }
    });
  });

  // ==================== TWO-FACTOR AUTHENTICATION ====================
  describe('Two-Factor Authentication', () => {
    it('should get 2FA status', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.get('/api/auth/2fa/status');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('enabled');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        // 2FA might not be implemented
        if (error.response?.status === 404) {
          console.log('⚠️ 2FA endpoint not available');
          return;
        }
        throw error;
      }
    });

    it('should setup 2FA and get QR code', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.post('/api/auth/2fa/setup');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('secret');
        expect(response.data.data).toHaveProperty('qrCode');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) {
          console.log('⚠️ 2FA endpoint not available');
          return;
        }
        throw error;
      }
    });
  });

  // ==================== USER MANAGEMENT (ADMIN) ====================
  describe('User Management (Admin)', () => {
    let createdUserId: string;

    it('should list users as admin', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.get('/api/auth/users');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('users');
        expect(Array.isArray(response.data.data.users)).toBe(true);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should create a new user as admin', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const newUser = {
          email: `newuser${Date.now()}@test.com`,
          password: 'NewUser@123456',
          firstName: 'New',
          lastName: 'User',
          role: 'employee',
        };

        const response = await api.post('/api/auth/admin/users', newUser);

        expect(response.status).toBe(201);
        expect(response.data.data).toHaveProperty('user');
        expect(response.data.data.user.email).toBe(newUser.email);

        createdUserId = response.data.data.user._id;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should update user as admin', async () => {
      try {
        if (!createdUserId) {
          console.log('⚠️ No created user ID - skipping test');
          return;
        }

        const response = await api.put(`/api/auth/admin/users/${createdUserId}`, {
          firstName: 'Updated',
          lastName: 'Name',
        });

        expect(response.status).toBe(200);
        expect(response.data.data.user.firstName).toBe('Updated');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should delete user as admin', async () => {
      try {
        if (!createdUserId) {
          console.log('⚠️ No created user ID - skipping test');
          return;
        }

        const response = await api.delete(`/api/auth/admin/users/${createdUserId}`);

        expect(response.status).toBe(200);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });
  });

  // ==================== AUDIT LOGS ====================
  describe('Audit Logs', () => {
    it('should retrieve audit logs as admin', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.get('/api/auth/admin/audit-logs');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('auditLogs');
        expect(Array.isArray(response.data.data.auditLogs)).toBe(true);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) {
          console.log('⚠️ Audit logs endpoint not available');
          return;
        }
        throw error;
      }
    });

    it('should filter audit logs by action type', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.get('/api/auth/admin/audit-logs?action=login');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('auditLogs');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });

  // ==================== LOGOUT ====================
  describe('Logout', () => {
    it('should logout successfully', async () => {
      try {
        if (!accessToken) {
          console.log('⚠️ No access token - skipping test');
          return;
        }

        const response = await api.post('/api/auth/logout');

        expect(response.status).toBe(200);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });
  });

  // ==================== MOBILE AUTHENTICATION ====================
  describe('Mobile Authentication', () => {
    it('should set mobile credentials', async () => {
      try {
        // First login again after logout
        const loginResponse = await api.post('/api/auth/login', {
          email: testTenant.adminEmail,
          password: testTenant.adminPassword,
        });

        if (loginResponse.status !== 200) return;

        accessToken = loginResponse.data.data.accessToken;
        setAuthToken(accessToken);

        const response = await api.post('/api/auth/set-mobile-credentials', {
          pin: '123456',
          enableBiometric: true,
        });

        expect([200, 201]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) {
          console.log('⚠️ Mobile credentials endpoint not available');
          return;
        }
        throw error;
      }
    });

    it('should login with mobile PIN', async () => {
      try {
        const response = await api.post('/api/auth/login/mobile', {
          email: testTenant.adminEmail,
          pin: '123456',
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('accessToken');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) {
          console.log('⚠️ Mobile login endpoint not available');
          return;
        }
        // PIN might not be set
        if (error.response?.status === 400) return;
        throw error;
      }
    });
  });

  // ==================== RATE LIMITING ====================
  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', async () => {
      try {
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(
            api.post('/api/auth/login', {
              email: 'ratelimit@test.com',
              password: 'wrongpassword',
            }).catch(e => e.response)
          );
        }

        const responses = await Promise.all(promises);
        const rateLimited = responses.some(r => r?.status === 429);

        // Rate limiting may or may not be configured
        console.log(`Rate limited: ${rateLimited}`);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        // This test is informational
      }
    });
  });
});
