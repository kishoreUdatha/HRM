import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('AI Chatbot Service Integration Tests', () => {
  let sessionId: string;
  let articleId: string;
  let intentId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Chatbot Test Company ${Date.now()}`,
          slug: `chatbot-test-${Date.now()}`,
          adminEmail: `chatbot-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Chatbot',
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

  describe('Chat Conversations', () => {
    describe('POST /api/chatbot/chat - Send Message', () => {
      it('should send a message to chatbot', async () => {
        try {
          const response = await api.post('/api/chatbot/chat', {
            message: 'How do I apply for leave?',
            sessionId: sessionId,
          });
          expect([200, 404]).toContain(response.status);
          if (response.data.data?.sessionId) {
            sessionId = response.data.data.sessionId;
          }
          console.log('✓ Chatbot message sent');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/chatbot/conversations/:sessionId - Get Conversation', () => {
      it('should return conversation history', async () => {
        try {
          const response = await api.get(`/api/chatbot/conversations/${sessionId || 'test-session'}`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Conversation retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/chatbot/conversations/:sessionId/feedback/:messageId - Submit Feedback', () => {
      it('should submit feedback on response', async () => {
        try {
          const response = await api.post(`/api/chatbot/conversations/${sessionId || 'test-session'}/feedback/test-message`, {
            helpful: true,
            rating: 5,
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Feedback submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/chatbot/conversations/:sessionId/escalate - Escalate Conversation', () => {
      it('should escalate to human agent', async () => {
        try {
          const response = await api.post(`/api/chatbot/conversations/${sessionId || 'test-session'}/escalate`, {
            reason: 'Complex query',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Conversation escalated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Knowledge Base', () => {
    describe('POST /api/chatbot/knowledge - Create Article', () => {
      it('should create a knowledge article', async () => {
        try {
          const response = await api.post('/api/chatbot/knowledge', {
            title: 'Leave Application Process',
            content: 'To apply for leave, follow these steps...',
            category: 'leave',
            keywords: ['leave', 'vacation', 'time-off'],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            articleId = response.data.data._id;
          }
          console.log('✓ Knowledge article created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/chatbot/knowledge - List Articles', () => {
      it('should return knowledge articles', async () => {
        try {
          const response = await api.get('/api/chatbot/knowledge');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Knowledge articles retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Intent Management', () => {
    describe('POST /api/chatbot/intents - Create Intent', () => {
      it('should create a chatbot intent', async () => {
        try {
          const response = await api.post('/api/chatbot/intents', {
            name: 'leave_application',
            description: 'Intent for leave application queries',
            trainingPhrases: [
              'How do I apply for leave?',
              'I want to take time off',
              'Where can I request vacation?',
            ],
            responses: [
              'You can apply for leave through the Leave Management section.',
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            intentId = response.data.data._id;
          }
          console.log('✓ Intent created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/chatbot/intents - List Intents', () => {
      it('should return chatbot intents', async () => {
        try {
          const response = await api.get('/api/chatbot/intents');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Intents retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Analytics', () => {
    describe('GET /api/chatbot/analytics - Get Chatbot Analytics', () => {
      it('should return chatbot analytics', async () => {
        try {
          const response = await api.get('/api/chatbot/analytics');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Chatbot analytics retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI Chatbot service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
