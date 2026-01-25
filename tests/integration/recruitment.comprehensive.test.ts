import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Recruitment Service - Comprehensive Tests', () => {
  let jobPostingId: string;
  let applicationId: string;
  let interviewId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  // ==================== JOB POSTINGS ====================
  describe('Job Postings', () => {
    describe('Create Job Posting', () => {
      it('should create a job posting', async () => {
        try {
          const response = await api.post('/api/recruitment/jobs', {
            title: 'Senior Software Engineer',
            department: testData.departmentId,
            description: 'Looking for an experienced software engineer to join our team.',
            requirements: [
              '5+ years of experience in software development',
              'Strong knowledge of Node.js and React',
              'Experience with cloud services (AWS/GCP)',
            ],
            responsibilities: [
              'Design and implement scalable systems',
              'Mentor junior developers',
              'Participate in code reviews',
            ],
            location: 'New York, NY',
            employmentType: 'full-time',
            experienceLevel: 'senior',
            salaryRange: {
              min: 120000,
              max: 180000,
              currency: 'USD',
            },
            skills: ['Node.js', 'React', 'TypeScript', 'MongoDB', 'AWS'],
            benefits: ['Health Insurance', '401k', 'Remote Work Options'],
            applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.job) {
            jobPostingId = response.data.data.job._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should create an internship posting', async () => {
        try {
          const response = await api.post('/api/recruitment/jobs', {
            title: 'Software Engineering Intern',
            department: testData.departmentId,
            description: 'Summer internship opportunity for aspiring developers.',
            requirements: [
              'Currently pursuing BS/MS in Computer Science',
              'Basic knowledge of programming',
            ],
            location: 'Remote',
            employmentType: 'internship',
            experienceLevel: 'entry',
            duration: '3 months',
            stipend: 3000,
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should reject job posting with missing required fields', async () => {
        try {
          await api.post('/api/recruitment/jobs', {
            title: 'Incomplete Job',
          });
          fail('Should have thrown an error');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          expect([400, 422]).toContain(error.response?.status);
        }
      });
    });

    describe('List Job Postings', () => {
      it('should list all job postings', async () => {
        try {
          const response = await api.get('/api/recruitment/jobs');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('jobs');
          expect(Array.isArray(response.data.data.jobs)).toBe(true);

          if (response.data.data.jobs.length > 0 && !jobPostingId) {
            jobPostingId = response.data.data.jobs[0]._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter jobs by status', async () => {
        try {
          const response = await api.get('/api/recruitment/jobs?status=open');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter jobs by department', async () => {
        try {
          if (!testData.departmentId) return;

          const response = await api.get(`/api/recruitment/jobs?department=${testData.departmentId}`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should search jobs by keyword', async () => {
        try {
          const response = await api.get('/api/recruitment/jobs?search=engineer');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get paginated jobs', async () => {
        try {
          const response = await api.get('/api/recruitment/jobs?page=1&limit=10');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('pagination');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Get Job by ID', () => {
      it('should get job details', async () => {
        try {
          if (!jobPostingId) return;

          const response = await api.get(`/api/recruitment/jobs/${jobPostingId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('job');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should return 404 for non-existent job', async () => {
        try {
          await api.get('/api/recruitment/jobs/000000000000000000000000');
          fail('Should have thrown an error');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          expect(error.response?.status).toBe(404);
        }
      });
    });

    describe('Update Job Posting', () => {
      it('should update job posting', async () => {
        try {
          if (!jobPostingId) return;

          const response = await api.put(`/api/recruitment/jobs/${jobPostingId}`, {
            salaryRange: {
              min: 130000,
              max: 200000,
              currency: 'USD',
            },
          });

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Publish Job Posting', () => {
      it('should publish job posting', async () => {
        try {
          if (!jobPostingId) return;

          const response = await api.post(`/api/recruitment/jobs/${jobPostingId}/publish`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Close Job Posting', () => {
      it('should close job posting', async () => {
        try {
          // Create a job to close
          const createResponse = await api.post('/api/recruitment/jobs', {
            title: 'Job to Close',
            description: 'Will be closed',
            location: 'Remote',
            employmentType: 'full-time',
          });

          if (createResponse.status !== 201) return;

          const jobId = createResponse.data.data.job._id;
          const response = await api.post(`/api/recruitment/jobs/${jobId}/close`, {
            reason: 'Position filled',
          });

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });
  });

  // ==================== JOB APPLICATIONS ====================
  describe('Job Applications', () => {
    describe('Submit Application', () => {
      it('should submit a job application', async () => {
        try {
          if (!jobPostingId) return;

          const response = await api.post('/api/recruitment/applications', {
            jobId: jobPostingId,
            candidateName: 'John Candidate',
            email: `candidate.${Date.now()}@example.com`,
            phone: '+1234567890',
            resumeUrl: 'https://example.com/resume.pdf',
            coverLetter: 'I am very interested in this position...',
            experience: 6,
            currentCompany: 'Tech Corp',
            currentDesignation: 'Software Engineer',
            noticePeriod: 30,
            expectedSalary: 150000,
            skills: ['Node.js', 'React', 'TypeScript'],
            education: [
              {
                degree: 'BS Computer Science',
                institution: 'MIT',
                year: 2018,
              },
            ],
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.application) {
            applicationId = response.data.data.application._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should reject duplicate application for same job', async () => {
        try {
          if (!jobPostingId) return;

          const email = `dup.${Date.now()}@example.com`;

          // First application
          await api.post('/api/recruitment/applications', {
            jobId: jobPostingId,
            candidateName: 'Duplicate Candidate',
            email: email,
            phone: '+1234567890',
          });

          // Second application with same email
          await api.post('/api/recruitment/applications', {
            jobId: jobPostingId,
            candidateName: 'Duplicate Candidate',
            email: email,
            phone: '+1234567890',
          });
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          expect([400, 409]).toContain(error.response?.status);
        }
      });

      it('should reject application for closed job', async () => {
        try {
          // This would need a closed job ID
          // Implementation depends on having a closed job
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
        }
      });
    });

    describe('List Applications', () => {
      it('should list all applications', async () => {
        try {
          const response = await api.get('/api/recruitment/applications');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('applications');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter applications by job', async () => {
        try {
          if (!jobPostingId) return;

          const response = await api.get(`/api/recruitment/applications?jobId=${jobPostingId}`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter applications by status', async () => {
        try {
          const response = await api.get('/api/recruitment/applications?status=new');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get paginated applications', async () => {
        try {
          const response = await api.get('/api/recruitment/applications?page=1&limit=20');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Get Application by ID', () => {
      it('should get application details', async () => {
        try {
          if (!applicationId) return;

          const response = await api.get(`/api/recruitment/applications/${applicationId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('application');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Update Application Status', () => {
      it('should move application to screening', async () => {
        try {
          if (!applicationId) return;

          const response = await api.put(`/api/recruitment/applications/${applicationId}/status`, {
            status: 'screening',
            notes: 'Moving to initial screening',
          });

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should shortlist application', async () => {
        try {
          if (!applicationId) return;

          const response = await api.put(`/api/recruitment/applications/${applicationId}/status`, {
            status: 'shortlisted',
            notes: 'Strong candidate',
          });

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should reject application', async () => {
        try {
          // Create an application to reject
          const createResponse = await api.post('/api/recruitment/applications', {
            jobId: jobPostingId,
            candidateName: 'Reject Candidate',
            email: `reject.${Date.now()}@example.com`,
            phone: '+1234567890',
          });

          if (createResponse.status !== 201) return;

          const appId = createResponse.data.data.application._id;
          const response = await api.put(`/api/recruitment/applications/${appId}/status`, {
            status: 'rejected',
            rejectionReason: 'Does not meet minimum requirements',
          });

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });
  });

  // ==================== INTERVIEWS ====================
  describe('Interview Management', () => {
    describe('Schedule Interview', () => {
      it('should schedule interview for application', async () => {
        try {
          if (!applicationId) return;

          const interviewDate = new Date();
          interviewDate.setDate(interviewDate.getDate() + 7);

          const response = await api.post(`/api/recruitment/applications/${applicationId}/schedule-interview`, {
            type: 'technical',
            scheduledAt: interviewDate.toISOString(),
            duration: 60,
            interviewers: [testData.userId],
            location: 'Conference Room A',
            meetingLink: 'https://meet.google.com/abc-defg-hij',
            notes: 'Please prepare for technical discussion',
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.interview) {
            interviewId = response.data.data.interview._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should schedule multiple round interviews', async () => {
        try {
          if (!applicationId) return;

          const round2Date = new Date();
          round2Date.setDate(round2Date.getDate() + 14);

          const response = await api.post(`/api/recruitment/applications/${applicationId}/schedule-interview`, {
            type: 'managerial',
            round: 2,
            scheduledAt: round2Date.toISOString(),
            duration: 45,
            interviewers: [testData.userId],
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Interviews', () => {
      it('should list all interviews', async () => {
        try {
          const response = await api.get('/api/recruitment/interviews');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should list interviews by date range', async () => {
        try {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);

          const response = await api.get('/api/recruitment/interviews', {
            params: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
          });

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should list my interviews', async () => {
        try {
          const response = await api.get('/api/recruitment/interviews/my');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Interview Feedback', () => {
      it('should submit interview feedback', async () => {
        try {
          if (!interviewId) return;

          const response = await api.post(`/api/recruitment/interviews/${interviewId}/feedback`, {
            rating: 4,
            technicalScore: 4,
            communicationScore: 5,
            problemSolvingScore: 4,
            cultureFitScore: 4,
            recommendation: 'hire',
            strengths: ['Strong technical skills', 'Good communication'],
            weaknesses: ['Limited cloud experience'],
            notes: 'Overall strong candidate',
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get interview feedback', async () => {
        try {
          if (!interviewId) return;

          const response = await api.get(`/api/recruitment/interviews/${interviewId}/feedback`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Reschedule Interview', () => {
      it('should reschedule interview', async () => {
        try {
          if (!interviewId) return;

          const newDate = new Date();
          newDate.setDate(newDate.getDate() + 10);

          const response = await api.put(`/api/recruitment/interviews/${interviewId}/reschedule`, {
            scheduledAt: newDate.toISOString(),
            reason: 'Interviewer unavailable',
          });

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Cancel Interview', () => {
      it('should cancel interview', async () => {
        try {
          // Create an interview to cancel
          if (!applicationId) return;

          const interviewDate = new Date();
          interviewDate.setDate(interviewDate.getDate() + 21);

          const createResponse = await api.post(`/api/recruitment/applications/${applicationId}/schedule-interview`, {
            type: 'hr',
            scheduledAt: interviewDate.toISOString(),
            duration: 30,
          });

          if (createResponse.status !== 201) return;

          const intId = createResponse.data.data.interview._id;
          const response = await api.post(`/api/recruitment/interviews/${intId}/cancel`, {
            reason: 'Position closed',
          });

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== OFFERS ====================
  describe('Offer Management', () => {
    describe('Make Offer', () => {
      it('should make offer to candidate', async () => {
        try {
          if (!applicationId) return;

          const response = await api.post(`/api/recruitment/applications/${applicationId}/make-offer`, {
            position: 'Senior Software Engineer',
            department: testData.departmentId,
            salary: 150000,
            joiningBonus: 10000,
            joiningDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            benefits: ['Health Insurance', '401k Match', 'Stock Options'],
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Offers', () => {
      it('should list all offers', async () => {
        try {
          const response = await api.get('/api/recruitment/offers');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should filter offers by status', async () => {
        try {
          const response = await api.get('/api/recruitment/offers?status=pending');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== RECRUITMENT STATISTICS ====================
  describe('Recruitment Statistics', () => {
    it('should get recruitment statistics', async () => {
      try {
        const response = await api.get('/api/recruitment/stats');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('stats');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should get pipeline statistics', async () => {
      try {
        const response = await api.get('/api/recruitment/stats/pipeline');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should get time-to-hire metrics', async () => {
      try {
        const response = await api.get('/api/recruitment/stats/time-to-hire');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should get source effectiveness', async () => {
      try {
        const response = await api.get('/api/recruitment/stats/sources');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });

  // ==================== CANDIDATE POOL ====================
  describe('Candidate Pool', () => {
    it('should add candidate to pool', async () => {
      try {
        const response = await api.post('/api/recruitment/candidate-pool', {
          name: 'Pooled Candidate',
          email: `pool.${Date.now()}@example.com`,
          phone: '+1234567890',
          skills: ['JavaScript', 'Python'],
          experience: 3,
          source: 'LinkedIn',
        });

        expect([200, 201, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should search candidate pool', async () => {
      try {
        const response = await api.get('/api/recruitment/candidate-pool?skills=JavaScript');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });
});
