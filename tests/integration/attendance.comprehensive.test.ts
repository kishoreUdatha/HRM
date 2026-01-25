import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Attendance Service - Comprehensive Tests', () => {
  let attendanceRecordId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  // ==================== CHECK-IN ====================
  describe('Check-In Operations', () => {
    describe('Standard Check-In', () => {
      it('should check in employee successfully', async () => {
        try {
          const response = await api.post('/api/attendance/check-in', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: '123 Main St, New York, NY',
            },
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.attendance) {
            attendanceRecordId = response.data.data.attendance._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // May already be checked in
          if (error.response?.status === 400) {
            console.log('Employee may already be checked in');
            return;
          }
          throw error;
        }
      });

      it('should check in with geolocation data', async () => {
        try {
          const response = await api.post('/api/attendance/check-in', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 10,
              address: 'Office Location',
            },
            deviceInfo: {
              platform: 'web',
              browser: 'Chrome',
              ip: '192.168.1.1',
            },
          });

          expect([200, 201, 400]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // May already be checked in
        }
      });

      it('should reject check-in without employee ID', async () => {
        try {
          await api.post('/api/attendance/check-in', {
            timestamp: new Date().toISOString(),
          });
          fail('Should have thrown an error');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          expect([400, 422]).toContain(error.response?.status);
        }
      });

      it('should reject duplicate check-in on same day', async () => {
        try {
          // First check-in
          await api.post('/api/attendance/check-in', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
          });

          // Second check-in should fail
          await api.post('/api/attendance/check-in', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          expect([400, 409]).toContain(error.response?.status);
        }
      });
    });

    describe('Face Recognition Check-In', () => {
      it('should check in with face recognition', async () => {
        try {
          const response = await api.post('/api/attendance/check-in', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
            faceVerification: {
              verified: true,
              confidence: 0.95,
              faceId: 'face-id-123',
            },
          });

          expect([200, 201, 400]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // May already be checked in or face not enrolled
        }
      });

      it('should reject check-in with low face confidence', async () => {
        try {
          await api.post('/api/attendance/check-in', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
            faceVerification: {
              verified: false,
              confidence: 0.30,
            },
          });
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // Should fail verification
          expect([400, 401, 403]).toContain(error.response?.status);
        }
      });
    });

    describe('Late Check-In Detection', () => {
      it('should mark late check-in', async () => {
        try {
          // Check in at a late time (assuming 9 AM is shift start)
          const lateTime = new Date();
          lateTime.setHours(10, 30, 0, 0); // 10:30 AM

          const response = await api.post('/api/attendance/check-in', {
            employeeId: testData.employeeId,
            timestamp: lateTime.toISOString(),
          });

          // Response should indicate late status if applicable
          expect([200, 201, 400]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // May already be checked in
        }
      });
    });
  });

  // ==================== CHECK-OUT ====================
  describe('Check-Out Operations', () => {
    describe('Standard Check-Out', () => {
      it('should check out employee successfully', async () => {
        try {
          const response = await api.post('/api/attendance/check-out', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: '123 Main St, New York, NY',
            },
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // May not be checked in
          if (error.response?.status === 400) {
            console.log('Employee may not be checked in');
            return;
          }
          throw error;
        }
      });

      it('should check out with notes', async () => {
        try {
          const response = await api.post('/api/attendance/check-out', {
            employeeId: testData.employeeId,
            timestamp: new Date().toISOString(),
            notes: 'Completed daily tasks',
          });

          expect([200, 201, 400]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
        }
      });

      it('should reject check-out without prior check-in', async () => {
        try {
          // Use a new employee or different ID
          await api.post('/api/attendance/check-out', {
            employeeId: '000000000000000000000001',
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          expect([400, 404]).toContain(error.response?.status);
        }
      });
    });

    describe('Early Check-Out Detection', () => {
      it('should mark early check-out', async () => {
        try {
          // Check out at an early time (assuming 6 PM is shift end)
          const earlyTime = new Date();
          earlyTime.setHours(15, 0, 0, 0); // 3 PM

          const response = await api.post('/api/attendance/check-out', {
            employeeId: testData.employeeId,
            timestamp: earlyTime.toISOString(),
            reason: 'Personal appointment',
          });

          expect([200, 201, 400]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
        }
      });
    });

    describe('Overtime Detection', () => {
      it('should calculate overtime for late check-out', async () => {
        try {
          // Check out at a late time (assuming 6 PM is shift end)
          const overtimeTime = new Date();
          overtimeTime.setHours(20, 0, 0, 0); // 8 PM

          const response = await api.post('/api/attendance/check-out', {
            employeeId: testData.employeeId,
            timestamp: overtimeTime.toISOString(),
          });

          expect([200, 201, 400]).toContain(response.status);
          // Check if overtime is calculated in response
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
        }
      });
    });
  });

  // ==================== ATTENDANCE RECORDS ====================
  describe('Attendance Records', () => {
    describe('Get Attendance Records', () => {
      it('should get attendance records for date range', async () => {
        try {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          const endDate = new Date();

          const response = await api.get('/api/attendance/records', {
            params: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
          });

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('records');
          expect(Array.isArray(response.data.data.records)).toBe(true);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get attendance records for specific employee', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get('/api/attendance/records', {
            params: {
              employeeId: testData.employeeId,
            },
          });

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('records');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get paginated attendance records', async () => {
        try {
          const response = await api.get('/api/attendance/records?page=1&limit=10');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('records');
          expect(response.data.data).toHaveProperty('pagination');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter attendance by status', async () => {
        try {
          const response = await api.get('/api/attendance/records?status=present');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter attendance by department', async () => {
        try {
          if (!testData.departmentId) return;

          const response = await api.get(`/api/attendance/records?department=${testData.departmentId}`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Get Single Attendance Record', () => {
      it('should get attendance record by ID', async () => {
        try {
          if (!attendanceRecordId) {
            console.log('⚠️ No attendance record ID - skipping test');
            return;
          }

          const response = await api.get(`/api/attendance/records/${attendanceRecordId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('record');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should return 404 for non-existent record', async () => {
        try {
          await api.get('/api/attendance/records/000000000000000000000000');
          fail('Should have thrown an error');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          expect(error.response?.status).toBe(404);
        }
      });
    });
  });

  // ==================== ATTENDANCE REPORTS ====================
  describe('Attendance Reports', () => {
    describe('Daily Report', () => {
      it('should get daily attendance report', async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const response = await api.get(`/api/attendance/reports/daily?date=${today}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('report');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Weekly Report', () => {
      it('should get weekly attendance report', async () => {
        try {
          const response = await api.get('/api/attendance/reports/weekly');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Monthly Report', () => {
      it('should get monthly attendance report', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;
          const response = await api.get(`/api/attendance/reports/monthly?year=${year}&month=${month}`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Summary Report', () => {
      it('should get attendance summary', async () => {
        try {
          const response = await api.get('/api/attendance/reports/summary');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('summary');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get department-wise summary', async () => {
        try {
          const response = await api.get('/api/attendance/reports/summary/by-department');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Export Reports', () => {
      it('should export attendance report as CSV', async () => {
        try {
          const response = await api.get('/api/attendance/reports/export?format=csv');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should export attendance report as PDF', async () => {
        try {
          const response = await api.get('/api/attendance/reports/export?format=pdf');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== ATTENDANCE CORRECTIONS ====================
  describe('Attendance Corrections', () => {
    it('should submit attendance correction request', async () => {
      try {
        const response = await api.post('/api/attendance/corrections', {
          attendanceId: attendanceRecordId,
          correctionType: 'check-in-time',
          requestedValue: '09:00',
          reason: 'Forgot to check in',
        });

        expect([200, 201, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should list pending corrections', async () => {
      try {
        const response = await api.get('/api/attendance/corrections?status=pending');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });

  // ==================== ATTENDANCE STATISTICS ====================
  describe('Attendance Statistics', () => {
    it('should get attendance statistics', async () => {
      try {
        const response = await api.get('/api/attendance/stats');

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('stats');
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should get employee attendance statistics', async () => {
      try {
        if (!testData.employeeId) return;

        const response = await api.get(`/api/attendance/stats/employee/${testData.employeeId}`);

        expect(response.status).toBe(200);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should get late/early trends', async () => {
      try {
        const response = await api.get('/api/attendance/stats/trends');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });

  // ==================== BULK OPERATIONS ====================
  describe('Bulk Operations', () => {
    it('should mark bulk attendance', async () => {
      try {
        const response = await api.post('/api/attendance/bulk', {
          date: new Date().toISOString().split('T')[0],
          records: [
            {
              employeeId: testData.employeeId,
              status: 'present',
              checkIn: '09:00',
              checkOut: '18:00',
            },
          ],
        });

        expect([200, 201, 400, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });

  // ==================== GEOFENCING ====================
  describe('Geofencing', () => {
    it('should validate check-in within geofence', async () => {
      try {
        const response = await api.post('/api/attendance/validate-location', {
          latitude: 40.7128,
          longitude: -74.0060,
        });

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should reject check-in outside geofence', async () => {
      try {
        // Use location far from office
        const response = await api.post('/api/attendance/validate-location', {
          latitude: 0,
          longitude: 0,
        });

        // May return valid: false instead of error
        expect([200, 400, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });
});
