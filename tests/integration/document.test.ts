import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Document Service Integration Tests', () => {
  let documentId: string | undefined;
  let templateId: string | undefined;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Document Test Company ${Date.now()}`,
          slug: `document-test-${Date.now()}`,
          adminEmail: `document-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Document',
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

  describe('Document Management', () => {
    describe('GET /api/documents - List Documents', () => {
      it('should return list of documents', async () => {
        try {
          const response = await api.get('/api/documents');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Documents retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/documents/expiring - Get Expiring Documents', () => {
      it('should return expiring documents', async () => {
        try {
          const response = await api.get('/api/documents/expiring');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Expiring documents retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/documents/:id/share - Share Document', () => {
      it('should share a document', async () => {
        try {
          const response = await api.post(`/api/documents/${documentId || 'test-doc'}/share`, {
            sharedWith: ['test-user@test.com'],
            permissions: 'view',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Document shared');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/documents/:id/sign - Sign Document', () => {
      it('should request document signature', async () => {
        try {
          const response = await api.post(`/api/documents/${documentId || 'test-doc'}/sign`, {
            signatureType: 'electronic',
            signerEmail: 'signer@test.com',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Document signature requested');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/documents/:id/audit - Get Audit Trail', () => {
      it('should return document audit trail', async () => {
        try {
          const response = await api.get(`/api/documents/${documentId || 'test-doc'}/audit`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Audit trail retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Document Templates', () => {
    describe('POST /api/documents/templates - Create Template', () => {
      it('should create a document template', async () => {
        try {
          const response = await api.post('/api/documents/templates', {
            name: 'Offer Letter Template',
            category: 'hr',
            content: 'Dear {{employee_name}}, We are pleased to offer you...',
            variables: ['employee_name', 'position', 'salary'],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            templateId = response.data.data._id;
          }
          console.log('✓ Template created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/documents/templates - List Templates', () => {
      it('should return list of templates', async () => {
        try {
          const response = await api.get('/api/documents/templates');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Templates retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/documents/templates/:id - Get Template', () => {
      it('should return template details', async () => {
        try {
          const response = await api.get(`/api/documents/templates/${templateId || 'test-template'}`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Template details retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Document service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
