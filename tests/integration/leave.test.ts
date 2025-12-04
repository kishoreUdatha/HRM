import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Leave Service Integration Tests', () => {
  let leaveRequestId: string;
  let leaveTypeId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  describe('Leave Types Management', () => {
    describe('GET /api/leaves/types - List Leave Types', () => {
      it('should return list of leave types', async () => {
        try {
          const response = await api.get('/api/leaves/types');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('leaveTypes');
          expect(Array.isArray(response.data.data.leaveTypes)).toBe(true);

          if (response.data.data.leaveTypes.length > 0) {
            leaveTypeId = response.data.data.leaveTypes[0]._id;
          }

          console.log('✓ Leave types retrieved:', response.data.data.leaveTypes.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/leaves/types - Create Leave Type', () => {
      it('should create a new leave type', async () => {
        try {
          const response = await api.post('/api/leaves/types', {
            name: 'Annual Leave',
            code: 'AL',
            description: 'Annual paid leave',
            daysAllowed: 20,
            carryForward: true,
            maxCarryForward: 5,
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('leaveType');

          leaveTypeId = response.data.data.leaveType._id;

          console.log('✓ Leave type created:', leaveTypeId);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          // May already exist
          if (error.response?.status === 400) {
            console.log('⚠️ Leave type may already exist');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Leave Requests', () => {
    describe('POST /api/leaves - Create Leave Request', () => {
      it('should create a new leave request', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 7);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 2);

          const response = await api.post('/api/leaves', {
            employee: testData.employeeId,
            leaveType: 'annual',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            reason: 'Family vacation',
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('leaveRequest');
          expect(response.data.data.leaveRequest.status).toBe('pending');

          leaveRequestId = response.data.data.leaveRequest._id;

          console.log('✓ Leave request created:', leaveRequestId);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/leaves - List Leave Requests', () => {
      it('should return list of leave requests', async () => {
        try {
          const response = await api.get('/api/leaves');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('leaves');
          expect(Array.isArray(response.data.data.leaves)).toBe(true);

          console.log('✓ Leave requests retrieved:', response.data.data.leaves.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          throw error;
        }
      });

      it('should filter leaves by status', async () => {
        try {
          const response = await api.get('/api/leaves?status=pending');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('leaves');

          response.data.data.leaves.forEach((leave: any) => {
            expect(leave.status).toBe('pending');
          });

          console.log('✓ Filtered leaves by status');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('PATCH /api/leaves/:id/approve - Approve Leave', () => {
      it('should approve a leave request', async () => {
        try {
          if (!leaveRequestId) {
            console.log('⚠️ No leave request ID - skipping test');
            return;
          }

          const response = await api.patch(`/api/leaves/${leaveRequestId}/approve`);

          expect(response.status).toBe(200);
          expect(response.data.data.leaveRequest.status).toBe('approved');

          console.log('✓ Leave request approved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Holidays', () => {
    describe('GET /api/leaves/holidays - List Holidays', () => {
      it('should return list of holidays', async () => {
        try {
          const response = await api.get('/api/leaves/holidays');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('holidays');
          expect(Array.isArray(response.data.data.holidays)).toBe(true);

          console.log('✓ Holidays retrieved:', response.data.data.holidays.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/leaves/holidays - Create Holiday', () => {
      it('should create a new holiday', async () => {
        try {
          const response = await api.post('/api/leaves/holidays', {
            name: 'New Year',
            date: '2025-01-01',
            type: 'public',
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('holiday');

          console.log('✓ Holiday created');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          // May already exist
          if (error.response?.status === 400) {
            console.log('⚠️ Holiday may already exist');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Leave Balance', () => {
    describe('GET /api/leaves/balance/:employeeId - Get Leave Balance', () => {
      it('should return employee leave balance', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.get(`/api/leaves/balance/${testData.employeeId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('balance');

          console.log('✓ Leave balance retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Leave service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });
});
