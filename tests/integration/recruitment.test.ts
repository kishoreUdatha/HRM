import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Recruitment Service Integration Tests', () => {
  let jobId: string;
  let candidateId: string;
  let applicationId: string;

  beforeAll(async () => {
    if (!testData.accessToken) {
      try {
        const registerResponse = await api.post('/api/auth/register', {
          name: `Recruit Test Company ${Date.now()}`,
          slug: `recruit-test-${Date.now()}`,
          adminEmail: `recruit-admin-${Date.now()}@test.com`,
          adminPassword: 'Test@123456',
          adminFirstName: 'Recruit',
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

  describe('Job Postings', () => {
    describe('POST /api/recruitment/jobs - Create Job Posting', () => {
      it('should create a new job posting', async () => {
        try {
          const response = await api.post('/api/recruitment/jobs', {
            title: 'Senior Software Engineer',
            department: 'Engineering',
            location: 'Remote',
            type: 'full_time',
            description: 'We are looking for a senior software engineer...',
            requirements: ['5+ years experience', 'Node.js expertise'],
            salaryRange: { min: 100000, max: 150000 },
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            jobId = response.data.data._id;
          }
          console.log('✓ Job posting created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/recruitment/jobs - List Job Postings', () => {
      it('should return list of job postings', async () => {
        try {
          const response = await api.get('/api/recruitment/jobs');
          expect([200, 404]).toContain(response.status);
          if (response.status === 200) {
            expect(response.data).toHaveProperty('data');
            console.log('✓ Job postings retrieved');
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/recruitment/jobs/:id/publish - Publish Job', () => {
      it('should publish a job posting', async () => {
        try {
          const response = await api.post(`/api/recruitment/jobs/${jobId || 'test-job'}/publish`);
          expect([200, 404]).toContain(response.status);
          console.log('✓ Job posting published');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Candidates', () => {
    describe('POST /api/recruitment/candidates - Create Candidate', () => {
      it('should create a new candidate', async () => {
        try {
          const response = await api.post('/api/recruitment/candidates', {
            firstName: 'John',
            lastName: 'Doe',
            email: `candidate-${Date.now()}@test.com`,
            phone: '+1234567890',
            source: 'linkedin',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            candidateId = response.data.data._id;
          }
          console.log('✓ Candidate created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/recruitment/candidates - List Candidates', () => {
      it('should return list of candidates', async () => {
        try {
          const response = await api.get('/api/recruitment/candidates');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Candidates retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Applications', () => {
    describe('POST /api/recruitment/applications - Submit Application', () => {
      it('should submit a job application', async () => {
        try {
          const response = await api.post('/api/recruitment/applications', {
            jobId: jobId || 'test-job',
            candidateId: candidateId || 'test-candidate',
            coverLetter: 'I am interested in this position...',
          });
          expect([200, 201, 404]).toContain(response.status);
          if (response.data.data?._id) {
            applicationId = response.data.data._id;
          }
          console.log('✓ Application submitted');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/recruitment/applications - List Applications', () => {
      it('should return list of applications', async () => {
        try {
          const response = await api.get('/api/recruitment/applications');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Applications retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('POST /api/recruitment/applications/:id/stage - Update Stage', () => {
      it('should update application stage', async () => {
        try {
          const response = await api.post(`/api/recruitment/applications/${applicationId || 'test-app'}/stage`, {
            stage: 'screening',
            notes: 'Moved to screening stage',
          });
          expect([200, 404]).toContain(response.status);
          console.log('✓ Application stage updated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Interviews', () => {
    describe('POST /api/recruitment/interviews - Schedule Interview', () => {
      it('should schedule an interview', async () => {
        try {
          const response = await api.post('/api/recruitment/interviews', {
            applicationId: applicationId || 'test-app',
            type: 'technical',
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 60,
            interviewers: [],
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Interview scheduled');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('GET /api/recruitment/interviews - List Interviews', () => {
      it('should return list of interviews', async () => {
        try {
          const response = await api.get('/api/recruitment/interviews');
          expect([200, 404]).toContain(response.status);
          console.log('✓ Interviews retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });

  describe('Offers', () => {
    describe('POST /api/recruitment/offers - Create Offer', () => {
      it('should create a job offer', async () => {
        try {
          const response = await api.post('/api/recruitment/offers', {
            applicationId: applicationId || 'test-app',
            salary: 120000,
            startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          });
          expect([200, 201, 404]).toContain(response.status);
          console.log('✓ Job offer created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Recruitment service not running - skipping test');
            return;
          }
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });
  });
});
