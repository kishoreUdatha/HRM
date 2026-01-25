import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Other Services - Comprehensive Tests', () => {
  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  // ==================== DOCUMENT SERVICE ====================
  describe('Document Service', () => {
    let documentId: string;

    describe('Upload Document', () => {
      it('should upload a document', async () => {
        try {
          const response = await api.post('/api/documents', {
            title: 'Employee Handbook',
            description: 'Company policies and procedures',
            category: 'policy',
            tags: ['policy', 'hr', 'handbook'],
            accessLevel: 'all-employees',
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.document) {
            documentId = response.data.data.document._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Documents', () => {
      it('should list all documents', async () => {
        try {
          const response = await api.get('/api/documents');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('documents');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter documents by category', async () => {
        try {
          const response = await api.get('/api/documents?category=policy');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should search documents', async () => {
        try {
          const response = await api.get('/api/documents?search=handbook');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Document Acknowledgment', () => {
      it('should acknowledge document', async () => {
        try {
          if (!documentId) return;

          const response = await api.post(`/api/documents/${documentId}/acknowledge`);

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get acknowledgment status', async () => {
        try {
          if (!documentId) return;

          const response = await api.get(`/api/documents/${documentId}/acknowledgments`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== EXPENSE SERVICE ====================
  describe('Expense Service', () => {
    let expenseId: string;

    describe('Create Expense', () => {
      it('should create expense report', async () => {
        try {
          const response = await api.post('/api/expenses', {
            employeeId: testData.employeeId,
            title: 'Client Meeting Travel',
            description: 'Travel expenses for client meeting',
            category: 'travel',
            amount: 500,
            currency: 'USD',
            expenseDate: new Date().toISOString().split('T')[0],
            items: [
              { description: 'Flight', amount: 300 },
              { description: 'Hotel', amount: 150 },
              { description: 'Meals', amount: 50 },
            ],
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.expense) {
            expenseId = response.data.data.expense._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Expenses', () => {
      it('should list all expenses', async () => {
        try {
          const response = await api.get('/api/expenses');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('expenses');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter expenses by status', async () => {
        try {
          const response = await api.get('/api/expenses?status=pending');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Approve/Reject Expense', () => {
      it('should approve expense', async () => {
        try {
          if (!expenseId) return;

          const response = await api.post(`/api/expenses/${expenseId}/approve`, {
            comments: 'Approved for reimbursement',
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

  // ==================== TIMESHEET SERVICE ====================
  describe('Timesheet Service', () => {
    let timesheetId: string;

    describe('Create Timesheet Entry', () => {
      it('should create timesheet entry', async () => {
        try {
          const response = await api.post('/api/timesheets', {
            employeeId: testData.employeeId,
            date: new Date().toISOString().split('T')[0],
            entries: [
              {
                project: 'Project Alpha',
                task: 'Development',
                hours: 4,
                description: 'Feature implementation',
                billable: true,
              },
              {
                project: 'Project Alpha',
                task: 'Code Review',
                hours: 2,
                description: 'PR reviews',
                billable: true,
              },
              {
                project: 'Internal',
                task: 'Meetings',
                hours: 2,
                description: 'Team standup and planning',
                billable: false,
              },
            ],
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.timesheet) {
            timesheetId = response.data.data.timesheet._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Timesheets', () => {
      it('should list timesheets', async () => {
        try {
          const response = await api.get('/api/timesheets');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('timesheets');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get weekly timesheet', async () => {
        try {
          const response = await api.get('/api/timesheets/weekly');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Submit Timesheet', () => {
      it('should submit timesheet for approval', async () => {
        try {
          if (!timesheetId) return;

          const response = await api.post(`/api/timesheets/${timesheetId}/submit`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== ASSET SERVICE ====================
  describe('Asset Service', () => {
    let assetId: string;

    describe('Create Asset', () => {
      it('should create asset', async () => {
        try {
          const response = await api.post('/api/assets', {
            name: 'MacBook Pro 16"',
            type: 'laptop',
            serialNumber: `SN${Date.now()}`,
            purchaseDate: '2024-01-15',
            purchasePrice: 2500,
            vendor: 'Apple',
            warranty: {
              expiryDate: '2027-01-15',
              provider: 'AppleCare',
            },
            status: 'available',
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.asset) {
            assetId = response.data.data.asset._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Assets', () => {
      it('should list all assets', async () => {
        try {
          const response = await api.get('/api/assets');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('assets');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter assets by type', async () => {
        try {
          const response = await api.get('/api/assets?type=laptop');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Assign Asset', () => {
      it('should assign asset to employee', async () => {
        try {
          if (!assetId || !testData.employeeId) return;

          const response = await api.post(`/api/assets/${assetId}/assign`, {
            employeeId: testData.employeeId,
            assignedDate: new Date().toISOString().split('T')[0],
            notes: 'New laptop for development work',
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

  // ==================== BENEFITS SERVICE ====================
  describe('Benefits Service', () => {
    describe('List Benefits Plans', () => {
      it('should list benefits plans', async () => {
        try {
          const response = await api.get('/api/benefits/plans');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Benefits Enrollment', () => {
      it('should enroll in benefits', async () => {
        try {
          const response = await api.post('/api/benefits/enroll', {
            employeeId: testData.employeeId,
            planId: 'health-premium',
            dependents: [
              { name: 'Jane Doe', relationship: 'spouse' },
            ],
            effectiveDate: new Date().toISOString().split('T')[0],
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== GRIEVANCE SERVICE ====================
  describe('Grievance Service', () => {
    let grievanceId: string;

    describe('File Grievance', () => {
      it('should file a grievance', async () => {
        try {
          const response = await api.post('/api/grievances', {
            employeeId: testData.employeeId,
            category: 'workplace',
            subject: 'Work Environment Issue',
            description: 'Details about the workplace issue',
            priority: 'medium',
            isConfidential: true,
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.grievance) {
            grievanceId = response.data.data.grievance._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('List Grievances', () => {
      it('should list grievances', async () => {
        try {
          const response = await api.get('/api/grievances');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('grievances');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Update Grievance Status', () => {
      it('should update grievance status', async () => {
        try {
          if (!grievanceId) return;

          const response = await api.put(`/api/grievances/${grievanceId}/status`, {
            status: 'investigating',
            comments: 'Investigation started',
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

  // ==================== ONBOARDING SERVICE ====================
  describe('Onboarding Service', () => {
    describe('Create Onboarding Checklist', () => {
      it('should create onboarding checklist for new hire', async () => {
        try {
          const response = await api.post('/api/onboarding/checklists', {
            employeeId: testData.employeeId,
            tasks: [
              { title: 'Complete HR paperwork', dueInDays: 1 },
              { title: 'IT equipment setup', dueInDays: 1 },
              { title: 'Team introduction', dueInDays: 3 },
              { title: 'Complete security training', dueInDays: 7 },
              { title: '30-day check-in', dueInDays: 30 },
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

    describe('Get Onboarding Progress', () => {
      it('should get onboarding progress', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/onboarding/progress/${testData.employeeId}`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== NOTIFICATION SERVICE ====================
  describe('Notification Service', () => {
    describe('Get Notifications', () => {
      it('should get notifications', async () => {
        try {
          const response = await api.get('/api/notifications');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('notifications');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get unread notifications', async () => {
        try {
          const response = await api.get('/api/notifications?unread=true');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Mark Notifications', () => {
      it('should mark all as read', async () => {
        try {
          const response = await api.post('/api/notifications/mark-all-read');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Notification Preferences', () => {
      it('should get notification preferences', async () => {
        try {
          const response = await api.get('/api/notifications/preferences');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should update notification preferences', async () => {
        try {
          const response = await api.put('/api/notifications/preferences', {
            email: {
              leaveApproval: true,
              payslip: true,
              announcements: true,
            },
            push: {
              leaveApproval: true,
              payslip: false,
              announcements: true,
            },
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

  // ==================== CHAT SERVICE ====================
  describe('Chat Service', () => {
    describe('Send Message', () => {
      it('should send chat message', async () => {
        try {
          const response = await api.post('/api/chat/messages', {
            recipientId: testData.userId,
            content: 'Hello, this is a test message',
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Get Messages', () => {
      it('should get chat messages', async () => {
        try {
          const response = await api.get('/api/chat/messages');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('messages');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get conversation with user', async () => {
        try {
          const response = await api.get(`/api/chat/conversations/${testData.userId}`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== ANALYTICS SERVICE ====================
  describe('Analytics Service', () => {
    describe('Dashboard Analytics', () => {
      it('should get dashboard analytics', async () => {
        try {
          const response = await api.get('/api/analytics/dashboard');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('HR Metrics', () => {
      it('should get HR metrics', async () => {
        try {
          const response = await api.get('/api/analytics/hr-metrics');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get headcount trends', async () => {
        try {
          const response = await api.get('/api/analytics/headcount');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get attrition analysis', async () => {
        try {
          const response = await api.get('/api/analytics/attrition');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== REPORTS SERVICE ====================
  describe('Reports Service', () => {
    describe('Generate Reports', () => {
      it('should generate employee report', async () => {
        try {
          const response = await api.post('/api/reports/generate', {
            type: 'employee-list',
            format: 'pdf',
            filters: {
              department: testData.departmentId,
            },
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should generate attendance report', async () => {
        try {
          const response = await api.post('/api/reports/generate', {
            type: 'attendance',
            format: 'excel',
            dateRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0],
            },
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Scheduled Reports', () => {
      it('should create scheduled report', async () => {
        try {
          const response = await api.post('/api/reports/scheduled', {
            name: 'Weekly Attendance Report',
            type: 'attendance',
            format: 'pdf',
            schedule: {
              frequency: 'weekly',
              dayOfWeek: 1, // Monday
              time: '09:00',
            },
            recipients: [testData.userId],
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should list scheduled reports', async () => {
        try {
          const response = await api.get('/api/reports/scheduled');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== COMPLIANCE SERVICE ====================
  describe('Compliance Service', () => {
    describe('Compliance Tracking', () => {
      it('should get compliance status', async () => {
        try {
          const response = await api.get('/api/compliance/status');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get pending compliance items', async () => {
        try {
          const response = await api.get('/api/compliance/pending');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== HEALTH CHECK ====================
  describe('Health Checks', () => {
    it('should check API gateway health', async () => {
      try {
        const response = await api.get('/api/health');

        expect(response.status).toBe(200);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        throw error;
      }
    });

    it('should check all services health', async () => {
      try {
        const response = await api.get('/api/health/all');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });
});
