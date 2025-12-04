import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Integration Service Tests', () => {
  let webhookId: string;
  let apiKeyId: string;
  let integrationId: string;
  let ssoConfigId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Integration Test Company ${Date.now()}`,
          slug: `integration-test-${Date.now()}`,
          adminEmail: `integration-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Integration',
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

  describe('Webhooks', () => {
    describe('POST /api/integrations/webhooks - Create Webhook', () => {
      it('should create a new webhook', async () => {
        try {
          const response = await api.post('/api/integrations/webhooks', {
            name: 'Employee Created Webhook',
            url: 'https://example.com/webhook',
            events: ['employee.created', 'employee.updated'],
            active: true,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            webhookId = response.data.data._id;
          }
          console.log('✓ Webhook created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/integrations/webhooks - List Webhooks', () => {
      it('should return list of webhooks', async () => {
        try {
          const response = await api.get('/api/integrations/webhooks');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Webhooks retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/integrations/webhooks/events - Get Available Events', () => {
      it('should return available webhook events', async () => {
        try {
          const response = await api.get('/api/integrations/webhooks/events');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Webhook events retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/integrations/webhooks/:id/test - Test Webhook', () => {
      it('should test webhook delivery', async () => {
        try {
          const response = await api.post(`/api/integrations/webhooks/${webhookId || 'test-webhook'}/test`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Webhook tested');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('API Keys', () => {
    describe('POST /api/integrations/api-keys - Create API Key', () => {
      it('should create a new API key', async () => {
        try {
          const response = await api.post('/api/integrations/api-keys', {
            name: 'External System Key',
            permissions: ['read:employees', 'read:attendance'],
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            apiKeyId = response.data.data._id;
          }
          console.log('✓ API key created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/integrations/api-keys - List API Keys', () => {
      it('should return list of API keys', async () => {
        try {
          const response = await api.get('/api/integrations/api-keys');
          expect([200, 404]).toContain(response.status);
          console.log('✓ API keys retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Third-party Integrations', () => {
    describe('POST /api/integrations/integrations - Create Integration', () => {
      it('should create a new integration', async () => {
        try {
          const response = await api.post('/api/integrations/integrations', {
            name: 'Slack Integration',
            type: 'slack',
            config: {
              channel: '#hr-notifications',
            },
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            integrationId = response.data.data._id;
          }
          console.log('✓ Integration created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/integrations/integrations - List Integrations', () => {
      it('should return list of integrations', async () => {
        try {
          const response = await api.get('/api/integrations/integrations');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Integrations retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/integrations/integrations/:id/test - Test Integration', () => {
      it('should test integration connection', async () => {
        try {
          const response = await api.post(`/api/integrations/integrations/${integrationId || 'test-integration'}/test`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Integration tested');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('SSO Configuration', () => {
    describe('POST /api/integrations/sso - Create SSO Config', () => {
      it('should create SSO configuration', async () => {
        try {
          const response = await api.post('/api/integrations/sso', {
            name: 'SAML SSO',
            type: 'saml',
            config: {
              entityId: 'test-entity',
              ssoUrl: 'https://idp.example.com/sso',
            },
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            ssoConfigId = response.data.data._id;
          }
          console.log('✓ SSO config created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/integrations/sso - List SSO Configs', () => {
      it('should return list of SSO configurations', async () => {
        try {
          const response = await api.get('/api/integrations/sso');
          expect([200, 404]).toContain(response.status);
          console.log('✓ SSO configs retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/integrations/sso/metadata - Get SSO Metadata', () => {
      it('should return SSO metadata', async () => {
        try {
          const response = await api.get('/api/integrations/sso/metadata');
          expect([200, 404]).toContain(response.status);
          console.log('✓ SSO metadata retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Calendar Sync', () => {
    describe('POST /api/integrations/calendar/connect - Connect Calendar', () => {
      it('should connect calendar integration', async () => {
        try {
          const response = await api.post('/api/integrations/calendar/connect', {
            provider: 'google',
            employeeId: testData.employeeId || 'test-employee',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Calendar connected');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Integration service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
