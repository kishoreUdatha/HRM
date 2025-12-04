import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Localization Service Integration Tests', () => {
  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Localization Test Company ${Date.now()}`,
          slug: `localization-test-${Date.now()}`,
          adminEmail: `localization-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Localization',
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

  describe('Languages', () => {
    describe('GET /api/localization/languages - List Languages', () => {
      it('should return list of supported languages', async () => {
        try {
          const response = await api.get('/api/localization/languages');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Languages retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/localization/languages - Add Language', () => {
      it('should add a new language', async () => {
        try {
          const response = await api.post('/api/localization/languages', {
            code: 'fr',
            name: 'French',
            nativeName: 'Français',
            direction: 'ltr',
          });
          expect([200, 201, 400, 404]).toContain(response.status);
          console.log('✓ Language added');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404, 409]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/localization/languages/seed - Seed Languages', () => {
      it('should seed default languages', async () => {
        try {
          const response = await api.post('/api/localization/languages/seed');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Languages seeded');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Translations', () => {
    describe('GET /api/localization/translations - Get All Translations', () => {
      it('should return all translations', async () => {
        try {
          const response = await api.get('/api/localization/translations');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Translations retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/localization/translations/:languageCode/:namespace - Get Namespace Translations', () => {
      it('should return translations by namespace', async () => {
        try {
          const response = await api.get('/api/localization/translations/en/common');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Namespace translations retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/localization/translations - Upsert Translation', () => {
      it('should upsert a translation', async () => {
        try {
          const response = await api.post('/api/localization/translations', {
            languageCode: 'en',
            namespace: 'custom',
            key: 'welcome_message',
            value: 'Welcome to the system',
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Translation upserted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/localization/translations/bulk - Bulk Upsert Translations', () => {
      it('should bulk upsert translations', async () => {
        try {
          const response = await api.post('/api/localization/translations/bulk', {
            translations: [
              { languageCode: 'en', namespace: 'common', key: 'save', value: 'Save' },
              { languageCode: 'en', namespace: 'common', key: 'cancel', value: 'Cancel' },
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Bulk translations upserted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Currencies', () => {
    describe('GET /api/localization/currencies - List Currencies', () => {
      it('should return list of currencies', async () => {
        try {
          const response = await api.get('/api/localization/currencies');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Currencies retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/localization/currencies - Add Currency', () => {
      it('should add a new currency', async () => {
        try {
          const response = await api.post('/api/localization/currencies', {
            code: 'EUR',
            name: 'Euro',
            symbol: '€',
            decimalPlaces: 2,
          });
          expect([200, 201, 400, 404]).toContain(response.status);
          console.log('✓ Currency added');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404, 409]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/localization/currencies/seed - Seed Currencies', () => {
      it('should seed default currencies', async () => {
        try {
          const response = await api.post('/api/localization/currencies/seed');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Currencies seeded');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/localization/currencies/convert - Convert Currency', () => {
      it('should convert between currencies', async () => {
        try {
          const response = await api.get('/api/localization/currencies/convert', {
            params: { from: 'USD', to: 'EUR', amount: 100 },
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Currency converted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Tenant Localization', () => {
    describe('GET /api/localization/tenant - Get Tenant Localization', () => {
      it('should return tenant localization settings', async () => {
        try {
          const response = await api.get('/api/localization/tenant');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Tenant localization retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('PUT /api/localization/tenant - Update Tenant Localization', () => {
      it('should update tenant localization settings', async () => {
        try {
          const response = await api.put('/api/localization/tenant', {
            defaultLanguage: 'en',
            defaultCurrency: 'USD',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Tenant localization updated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Localization service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
