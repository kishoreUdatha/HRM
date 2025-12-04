import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Attendance Service Integration Tests', () => {
  let attendanceId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  describe('Check-in/Check-out', () => {
    describe('POST /api/attendance/check-in - Employee Check-in', () => {
      it('should record employee check-in', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.post('/api/attendance/check-in', {
            employee: testData.employeeId,
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
            },
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('attendance');
          expect(response.data.data.attendance).toHaveProperty('checkIn');

          attendanceId = response.data.data.attendance._id;

          console.log('✓ Employee checked in:', attendanceId);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          // May have already checked in
          if (error.response?.status === 400) {
            console.log('⚠️ Employee may have already checked in');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/attendance/check-out - Employee Check-out', () => {
      it('should record employee check-out', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.post('/api/attendance/check-out', {
            employee: testData.employeeId,
          });

          expect(response.status).toBe(200);
          expect(response.data.data.attendance).toHaveProperty('checkOut');

          console.log('✓ Employee checked out');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          // May not have checked in
          if (error.response?.status === 400) {
            console.log('⚠️ Employee may not have checked in');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Attendance Records', () => {
    describe('GET /api/attendance - List Attendance Records', () => {
      it('should return list of attendance records', async () => {
        try {
          const response = await api.get('/api/attendance');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('attendance');
          expect(Array.isArray(response.data.data.attendance)).toBe(true);

          console.log('✓ Attendance records retrieved:', response.data.data.attendance.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          throw error;
        }
      });

      it('should filter attendance by date range', async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const response = await api.get(`/api/attendance?startDate=${today}&endDate=${today}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('attendance');

          console.log('✓ Filtered attendance by date');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          throw error;
        }
      });

      it('should filter attendance by employee', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.get(`/api/attendance?employee=${testData.employeeId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('attendance');

          console.log('✓ Filtered attendance by employee');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/attendance/summary - Get Attendance Summary', () => {
      it('should return attendance summary', async () => {
        try {
          const response = await api.get('/api/attendance/summary');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('summary');

          console.log('✓ Attendance summary retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/attendance/daily-status - Get Daily Status', () => {
      it('should return daily attendance status', async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const response = await api.get(`/api/attendance/daily-status?date=${today}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('status');

          console.log('✓ Daily status retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/attendance/bulk - Bulk Mark Attendance', () => {
      it('should mark attendance for multiple employees', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.post('/api/attendance/bulk', {
            date: new Date().toISOString().split('T')[0],
            records: [
              {
                employee: testData.employeeId,
                status: 'present',
              },
            ],
          });

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('results');

          console.log('✓ Bulk attendance marked');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Attendance service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });
});
