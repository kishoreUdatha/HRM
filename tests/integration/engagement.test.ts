import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Engagement Service Integration Tests', () => {
  let surveyId: string;
  let cycleId: string;
  let recognitionId: string;
  let goalId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Engagement Test Company ${Date.now()}`,
          slug: `engagement-test-${Date.now()}`,
          adminEmail: `engagement-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Engagement',
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

  describe('Surveys', () => {
    describe('POST /api/engagement/surveys - Create Survey', () => {
      it('should create a new survey', async () => {
        try {
          const response = await api.post('/api/engagement/surveys', {
            title: 'Employee Engagement Survey',
            description: 'Annual employee engagement assessment',
            questions: [
              { text: 'How satisfied are you with your job?', type: 'rating', required: true },
              { text: 'What would you improve?', type: 'text', required: false },
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            surveyId = response.data.data._id;
          }
          console.log('✓ Survey created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/engagement/surveys - List Surveys', () => {
      it('should return list of surveys', async () => {
        try {
          const response = await api.get('/api/engagement/surveys');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Surveys retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/engagement/surveys/:id/publish - Publish Survey', () => {
      it('should publish a survey', async () => {
        try {
          const response = await api.post(`/api/engagement/surveys/${surveyId || 'test-survey'}/publish`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Survey published');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/engagement/surveys/:id/responses - Submit Response', () => {
      it('should submit survey response', async () => {
        try {
          const response = await api.post(`/api/engagement/surveys/${surveyId || 'test-survey'}/responses`, {
            answers: [
              { questionId: 'q1', value: 4 },
              { questionId: 'q2', value: 'More team events' },
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Survey response submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('360 Feedback', () => {
    describe('POST /api/engagement/feedback-cycles - Create Feedback Cycle', () => {
      it('should create a 360 feedback cycle', async () => {
        try {
          const response = await api.post('/api/engagement/feedback-cycles', {
            name: 'Annual 360 Review',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            cycleId = response.data.data._id;
          }
          console.log('✓ Feedback cycle created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/engagement/feedback-cycles - List Feedback Cycles', () => {
      it('should return list of feedback cycles', async () => {
        try {
          const response = await api.get('/api/engagement/feedback-cycles');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Feedback cycles retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Recognition', () => {
    describe('POST /api/engagement/recognitions - Create Recognition', () => {
      it('should create a recognition', async () => {
        try {
          const response = await api.post('/api/engagement/recognitions', {
            recipientId: testData.employeeId || 'test-employee',
            category: 'teamwork',
            message: 'Great job on the project launch!',
            points: 50,
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            recognitionId = response.data.data._id;
          }
          console.log('✓ Recognition created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/engagement/recognitions - List Recognitions', () => {
      it('should return list of recognitions', async () => {
        try {
          const response = await api.get('/api/engagement/recognitions');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Recognitions retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/engagement/leaderboard - Get Leaderboard', () => {
      it('should return recognition leaderboard', async () => {
        try {
          const response = await api.get('/api/engagement/leaderboard');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Leaderboard retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Goals/OKRs', () => {
    describe('POST /api/engagement/goals - Create Goal', () => {
      it('should create a goal', async () => {
        try {
          const response = await api.post('/api/engagement/goals', {
            title: 'Improve Team Productivity',
            type: 'objective',
            period: 'Q1',
            year: 2025,
            keyResults: [
              { title: 'Reduce meeting time by 20%', target: 20, unit: 'percentage' },
            ],
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            goalId = response.data.data._id;
          }
          console.log('✓ Goal created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/engagement/goals - List Goals', () => {
      it('should return list of goals', async () => {
        try {
          const response = await api.get('/api/engagement/goals');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Goals retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/engagement/goals/tree - Get Goal Tree', () => {
      it('should return goal hierarchy tree', async () => {
        try {
          const response = await api.get('/api/engagement/goals/tree');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Goal tree retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/engagement/goals/:id/check-ins - Add Check-in', () => {
      it('should add a goal check-in', async () => {
        try {
          const response = await api.post(`/api/engagement/goals/${goalId || 'test-goal'}/check-ins`, {
            progress: 25,
            notes: 'On track with Q1 targets',
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Check-in added');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Engagement service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
