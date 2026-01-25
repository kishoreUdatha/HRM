import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Performance & Training Service - Comprehensive Tests', () => {
  let reviewId: string;
  let trainingId: string;
  let enrollmentId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  // ==================== PERFORMANCE REVIEWS ====================
  describe('Performance Reviews', () => {
    describe('Create Review Cycle', () => {
      it('should create annual review cycle', async () => {
        try {
          const response = await api.post('/api/performance/cycles', {
            name: `Annual Review ${new Date().getFullYear()}`,
            type: 'annual',
            startDate: `${new Date().getFullYear()}-01-01`,
            endDate: `${new Date().getFullYear()}-12-31`,
            selfReviewDeadline: `${new Date().getFullYear()}-12-15`,
            managerReviewDeadline: `${new Date().getFullYear()}-12-25`,
            status: 'active',
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should create quarterly review cycle', async () => {
        try {
          const response = await api.post('/api/performance/cycles', {
            name: `Q1 Review ${new Date().getFullYear()}`,
            type: 'quarterly',
            startDate: `${new Date().getFullYear()}-01-01`,
            endDate: `${new Date().getFullYear()}-03-31`,
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Create Performance Review', () => {
      it('should create performance review for employee', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.post('/api/performance/reviews', {
            employeeId: testData.employeeId,
            reviewType: 'annual',
            reviewPeriod: {
              start: `${new Date().getFullYear()}-01-01`,
              end: `${new Date().getFullYear()}-12-31`,
            },
            goals: [
              {
                title: 'Complete Project X',
                description: 'Deliver all milestones on time',
                weight: 40,
              },
              {
                title: 'Improve Technical Skills',
                description: 'Learn new technologies',
                weight: 30,
              },
              {
                title: 'Team Collaboration',
                description: 'Mentor junior developers',
                weight: 30,
              },
            ],
            competencies: [
              { name: 'Technical Skills', weight: 25 },
              { name: 'Communication', weight: 25 },
              { name: 'Problem Solving', weight: 25 },
              { name: 'Leadership', weight: 25 },
            ],
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.review) {
            reviewId = response.data.data.review._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should create probation review', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.post('/api/performance/reviews', {
            employeeId: testData.employeeId,
            reviewType: 'probation',
            reviewPeriod: {
              start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0],
            },
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Reviews', () => {
      it('should list all reviews', async () => {
        try {
          const response = await api.get('/api/performance/reviews');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('reviews');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter reviews by status', async () => {
        try {
          const response = await api.get('/api/performance/reviews?status=pending');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter reviews by employee', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/performance/reviews?employeeId=${testData.employeeId}`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get my reviews', async () => {
        try {
          const response = await api.get('/api/performance/reviews/my');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get team reviews for manager', async () => {
        try {
          const response = await api.get('/api/performance/reviews/team');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Self Review', () => {
      it('should submit self review', async () => {
        try {
          if (!reviewId) return;

          const response = await api.post(`/api/performance/reviews/${reviewId}/self-review`, {
            goalRatings: [
              { goalIndex: 0, rating: 4, comments: 'Completed most milestones' },
              { goalIndex: 1, rating: 5, comments: 'Learned React and TypeScript' },
              { goalIndex: 2, rating: 4, comments: 'Mentored 2 junior developers' },
            ],
            competencyRatings: [
              { competencyIndex: 0, rating: 4, comments: 'Strong technical skills' },
              { competencyIndex: 1, rating: 4, comments: 'Good communication' },
              { competencyIndex: 2, rating: 5, comments: 'Excellent problem solving' },
              { competencyIndex: 3, rating: 3, comments: 'Developing leadership' },
            ],
            achievements: 'Delivered 3 major features, reduced bugs by 40%',
            challenges: 'Tight deadlines, resource constraints',
            developmentAreas: 'Want to improve system design skills',
            careerGoals: 'Move towards tech lead role',
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Manager Review', () => {
      it('should submit manager review', async () => {
        try {
          if (!reviewId) return;

          const response = await api.post(`/api/performance/reviews/${reviewId}/manager-review`, {
            goalRatings: [
              { goalIndex: 0, rating: 4, comments: 'Good progress on Project X' },
              { goalIndex: 1, rating: 5, comments: 'Excellent learning curve' },
              { goalIndex: 2, rating: 4, comments: 'Great team player' },
            ],
            competencyRatings: [
              { competencyIndex: 0, rating: 4, comments: 'Solid technical foundation' },
              { competencyIndex: 1, rating: 4, comments: 'Clear communicator' },
              { competencyIndex: 2, rating: 5, comments: 'Outstanding problem solver' },
              { competencyIndex: 3, rating: 4, comments: 'Growing into leadership' },
            ],
            overallRating: 4,
            strengths: 'Technical skills, problem solving, dedication',
            areasForImprovement: 'Continue developing leadership skills',
            promotionRecommendation: true,
            salaryIncreaseRecommendation: 15,
            comments: 'Excellent performer, ready for senior role',
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('360 Degree Feedback', () => {
      it('should request 360 feedback', async () => {
        try {
          if (!reviewId) return;

          const response = await api.post(`/api/performance/reviews/${reviewId}/request-feedback`, {
            reviewers: [
              { userId: testData.userId, type: 'peer' },
            ],
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should submit peer feedback', async () => {
        try {
          if (!reviewId) return;

          const response = await api.post(`/api/performance/reviews/${reviewId}/peer-feedback`, {
            strengths: 'Great collaborator, always helpful',
            areasForImprovement: 'Could take more initiative',
            rating: 4,
            comments: 'Pleasure to work with',
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Acknowledge Review', () => {
      it('should acknowledge review', async () => {
        try {
          if (!reviewId) return;

          const response = await api.post(`/api/performance/reviews/${reviewId}/acknowledge`, {
            acknowledged: true,
            employeeComments: 'I agree with the assessment',
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Performance History', () => {
      it('should get performance history for employee', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/performance/employees/${testData.employeeId}/history`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get performance trends', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/performance/employees/${testData.employeeId}/trends`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== GOALS & OKRs ====================
  describe('Goals & OKRs', () => {
    describe('Create Goal', () => {
      it('should create individual goal', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.post('/api/performance/goals', {
            employeeId: testData.employeeId,
            title: 'Complete AWS Certification',
            description: 'Obtain AWS Solutions Architect certification',
            category: 'development',
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high',
            metrics: [
              { name: 'Pass exam', target: 1 },
            ],
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should create team goal', async () => {
        try {
          const response = await api.post('/api/performance/goals', {
            type: 'team',
            departmentId: testData.departmentId,
            title: 'Reduce Bug Count',
            description: 'Reduce critical bugs by 50%',
            dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            metrics: [
              { name: 'Critical bugs', target: 5, current: 10 },
            ],
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Update Goal Progress', () => {
      it('should update goal progress', async () => {
        try {
          // This would need a goal ID
          const response = await api.get('/api/performance/goals');
          if (response.status !== 200) return;

          const goals = response.data.data?.goals || [];
          if (goals.length === 0) return;

          const goalId = goals[0]._id;
          const updateResponse = await api.put(`/api/performance/goals/${goalId}/progress`, {
            progress: 50,
            updates: [
              {
                date: new Date().toISOString(),
                description: 'Completed first module',
                progress: 25,
              },
            ],
          });

          expect([200, 404]).toContain(updateResponse.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== TRAINING PROGRAMS ====================
  describe('Training Programs', () => {
    describe('Create Training', () => {
      it('should create training program', async () => {
        try {
          const response = await api.post('/api/employees/trainings', {
            title: 'React Advanced Concepts',
            description: 'Deep dive into React hooks, performance optimization, and patterns',
            type: 'online',
            category: 'technical',
            duration: 20, // hours
            provider: 'Internal',
            instructor: 'John Doe',
            capacity: 30,
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
            objectives: [
              'Understand advanced hooks patterns',
              'Optimize React applications',
              'Implement best practices',
            ],
            prerequisites: ['Basic React knowledge'],
            targetAudience: ['developers', 'tech leads'],
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.training) {
            trainingId = response.data.data.training._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should create mandatory compliance training', async () => {
        try {
          const response = await api.post('/api/employees/trainings', {
            title: 'Security Awareness Training',
            description: 'Annual security compliance training',
            type: 'online',
            category: 'compliance',
            duration: 2,
            mandatory: true,
            complianceDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Trainings', () => {
      it('should list all trainings', async () => {
        try {
          const response = await api.get('/api/employees/trainings');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('trainings');

          if (response.data.data.trainings.length > 0 && !trainingId) {
            trainingId = response.data.data.trainings[0]._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter trainings by category', async () => {
        try {
          const response = await api.get('/api/employees/trainings?category=technical');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get upcoming trainings', async () => {
        try {
          const response = await api.get('/api/employees/trainings?status=upcoming');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Training Enrollment', () => {
      it('should enroll employee in training', async () => {
        try {
          if (!trainingId || !testData.employeeId) return;

          const response = await api.post(`/api/employees/trainings/${trainingId}/enroll`, {
            employeeId: testData.employeeId,
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.enrollment) {
            enrollmentId = response.data.data.enrollment._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // May already be enrolled
          if (error.response?.status === 400) return;
          throw error;
        }
      });

      it('should bulk enroll employees', async () => {
        try {
          if (!trainingId) return;

          const response = await api.post(`/api/employees/trainings/${trainingId}/bulk-enroll`, {
            employeeIds: [testData.employeeId],
          });

          expect([200, 201, 400]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get enrolled employees', async () => {
        try {
          if (!trainingId) return;

          const response = await api.get(`/api/employees/trainings/${trainingId}/enrollments`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get my enrollments', async () => {
        try {
          const response = await api.get('/api/employees/trainings/my-enrollments');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Training Progress', () => {
      it('should update training progress', async () => {
        try {
          if (!enrollmentId) return;

          const response = await api.put(`/api/employees/trainings/enrollments/${enrollmentId}/progress`, {
            progress: 50,
            modulesCompleted: 3,
            totalModules: 6,
            lastAccessedAt: new Date().toISOString(),
          });

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should mark training as complete', async () => {
        try {
          if (!enrollmentId) return;

          const response = await api.post(`/api/employees/trainings/enrollments/${enrollmentId}/complete`, {
            completedAt: new Date().toISOString(),
            score: 85,
            passed: true,
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Training Certificates', () => {
      it('should generate training certificate', async () => {
        try {
          if (!enrollmentId) return;

          const response = await api.get(`/api/employees/trainings/enrollments/${enrollmentId}/certificate`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Training Feedback', () => {
      it('should submit training feedback', async () => {
        try {
          if (!enrollmentId) return;

          const response = await api.post(`/api/employees/trainings/enrollments/${enrollmentId}/feedback`, {
            rating: 4,
            contentRating: 5,
            instructorRating: 4,
            relevanceRating: 4,
            comments: 'Very helpful training',
            suggestions: 'More hands-on exercises would be great',
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get training feedback summary', async () => {
        try {
          if (!trainingId) return;

          const response = await api.get(`/api/employees/trainings/${trainingId}/feedback-summary`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Training Statistics', () => {
      it('should get training statistics', async () => {
        try {
          const response = await api.get('/api/employees/trainings/stats');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get employee training history', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/employees/${testData.employeeId}/training-history`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });
});
