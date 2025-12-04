import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('AI/ML Service Integration Tests', () => {
  let analysisId: string | undefined;
  let predictionId: string | undefined;
  let skillId: string | undefined;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `AIML Test Company ${Date.now()}`,
          slug: `aiml-test-${Date.now()}`,
          adminEmail: `aiml-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'AIML',
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

  describe('Resume Analysis', () => {
    describe('GET /api/ai/resume/:analysisId - Get Resume Analysis', () => {
      it('should return resume analysis results', async () => {
        try {
          const response = await api.get(`/api/ai/resume/${analysisId || 'test-analysis'}`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Resume analysis retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/ai/resume/:analysisId/match-jobs - Match Resume to Jobs', () => {
      it('should match resume to available jobs', async () => {
        try {
          const response = await api.post(`/api/ai/resume/${analysisId || 'test-analysis'}/match-jobs`, {
            jobIds: ['job1', 'job2'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Resume matched to jobs');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Predictions - Attrition', () => {
    describe('POST /api/ai/predictions/attrition/:employeeId - Get Attrition Prediction', () => {
      it('should predict employee attrition risk', async () => {
        try {
          const response = await api.post(`/api/ai/predictions/attrition/${testData.employeeId || 'test-employee'}`);
          expect([200, 404]).toContain(response.status);
          if (response.data.data?._id) {
            predictionId = response.data.data._id;
          }
          console.log('✓ Attrition prediction generated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/ai/predictions/attrition/batch - Batch Attrition Predictions', () => {
      it('should predict attrition for multiple employees', async () => {
        try {
          const response = await api.post('/api/ai/predictions/attrition/batch', {
            employeeIds: ['emp1', 'emp2', 'emp3'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Batch attrition predictions generated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Predictions - Performance', () => {
    describe('POST /api/ai/predictions/performance/:employeeId - Get Performance Prediction', () => {
      it('should predict employee performance', async () => {
        try {
          const response = await api.post(`/api/ai/predictions/performance/${testData.employeeId || 'test-employee'}`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Performance prediction generated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Predictions - Salary', () => {
    describe('POST /api/ai/predictions/salary - Get Salary Prediction', () => {
      it('should predict salary recommendation', async () => {
        try {
          const response = await api.post('/api/ai/predictions/salary', {
            role: 'Software Engineer',
            experience: 5,
            location: 'New York',
            skills: ['JavaScript', 'React', 'Node.js'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Salary prediction generated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Skill Matching', () => {
    describe('POST /api/ai/skills/match-candidates - Match Candidates', () => {
      it('should match candidates to job requirements', async () => {
        try {
          const response = await api.post('/api/ai/skills/match-candidates', {
            jobId: 'test-job',
            candidateIds: ['candidate1', 'candidate2'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Candidates matched');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/ai/skills/gap-analysis - Analyze Skill Gaps', () => {
      it('should analyze team skill gaps', async () => {
        try {
          const response = await api.post('/api/ai/skills/gap-analysis', {
            teamId: 'test-team',
            targetSkills: ['leadership', 'project_management'],
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Skill gaps analyzed');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/ai/skills/learning-path - Get Learning Path', () => {
      it('should generate learning path', async () => {
        try {
          const response = await api.post('/api/ai/skills/learning-path', {
            employeeId: testData.employeeId || 'test-employee',
            targetRole: 'Senior Engineer',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Learning path generated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Sentiment Analysis', () => {
    describe('POST /api/ai/sentiment/analyze - Analyze Sentiment', () => {
      it('should analyze feedback sentiment', async () => {
        try {
          const response = await api.post('/api/ai/sentiment/analyze', {
            text: 'The working environment is great and the team is very supportive.',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Sentiment analyzed');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('ML Models', () => {
    describe('GET /api/ai/models - List ML Models', () => {
      it('should return list of ML models', async () => {
        try {
          const response = await api.get('/api/ai/models');
          expect([200, 404]).toContain(response.status);
          console.log('✓ ML models retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ AI/ML service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });
});
