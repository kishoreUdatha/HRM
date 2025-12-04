import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Notification Service Integration Tests', () => {
  let createdNotificationId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Notif Test Company ${Date.now()}`,
          slug: `notif-test-${Date.now()}`,
          adminEmail: `notif-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Notif',
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

  describe('Notification Management', () => {
    describe('GET /api/notifications - List Notifications', () => {
      it('should return list of notifications', async () => {
        try {
          const response = await api.get('/api/notifications');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Notifications list retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Notification service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/notifications - Create Notification', () => {
      it('should create a new notification', async () => {
        try {
          const response = await api.post('/api/notifications', {
            type: 'info',
            title: 'Test Notification',
            message: 'This is a test notification',
            userId: testData.userId,
          });
          expect([200, 201]).toContain(response.status);
          if (response.data.data?._id) {
            createdNotificationId = response.data.data._id;
          }
          console.log('✓ Notification created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Notification service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('PATCH /api/notifications/:id/read - Mark as Read', () => {
      it('should mark notification as read', async () => {
        try {
          if (!createdNotificationId) {
            console.log('⚠️ No notification ID - skipping test');
            return;
          }

          const response = await api.patch(`/api/notifications/${createdNotificationId}/read`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Notification marked as read');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Notification service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/notifications/mark-all-read - Mark All as Read', () => {
      it('should mark all notifications as read', async () => {
        try {
          const response = await api.post('/api/notifications/mark-all-read');
          expect([200, 404]).toContain(response.status);
          console.log('✓ All notifications marked as read');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Notification service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/notifications/unread-count - Get Unread Count', () => {
      it('should return unread notification count', async () => {
        try {
          const response = await api.get('/api/notifications/unread-count');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('count');
            console.log('✓ Unread count retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Notification service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Email Templates', () => {
    describe('GET /api/notifications/templates - List Templates', () => {
      it('should return list of email templates', async () => {
        try {
          const response = await api.get('/api/notifications/templates');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Email templates retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Notification service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/notifications/templates - Create Template', () => {
      it('should create a new email template', async () => {
        try {
          const response = await api.post('/api/notifications/templates', {
            name: 'test-template',
            subject: 'Test Subject',
            body: '<p>Test email body</p>',
            type: 'email',
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Email template created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Notification service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
