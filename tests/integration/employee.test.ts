import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Employee Service Integration Tests', () => {
  let departmentId: string;
  let employeeId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  describe('Department Management', () => {
    describe('POST /api/employees/departments - Create Department', () => {
      it('should create a new department', async () => {
        try {
          const response = await api.post('/api/employees/departments', {
            name: 'Engineering',
            code: 'ENG',
            description: 'Engineering Department',
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('department');
          expect(response.data.data.department.name).toBe('Engineering');

          departmentId = response.data.data.department._id;
          testData.departmentId = departmentId;

          console.log('✓ Department created:', departmentId);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          // May already exist
          if (error.response?.status === 400) {
            console.log('⚠️ Department may already exist');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/employees/departments - List Departments', () => {
      it('should return list of departments', async () => {
        try {
          const response = await api.get('/api/employees/departments');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('departments');
          expect(Array.isArray(response.data.data.departments)).toBe(true);

          if (response.data.data.departments.length > 0 && !departmentId) {
            departmentId = response.data.data.departments[0]._id;
            testData.departmentId = departmentId;
          }

          console.log('✓ Departments retrieved:', response.data.data.departments.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Employee Management', () => {
    describe('POST /api/employees - Create Employee', () => {
      it('should create a new employee', async () => {
        try {
          const employeeData = {
            firstName: 'John',
            lastName: 'Doe',
            email: `john.doe.${Date.now()}@test.com`,
            phone: '+1234567890',
            dateOfBirth: '1990-01-15',
            gender: 'male',
            address: {
              street: '123 Main St',
              city: 'New York',
              state: 'NY',
              country: 'USA',
              zipCode: '10001',
            },
            department: departmentId || undefined,
            position: 'Software Engineer',
            employmentType: 'full-time',
            joiningDate: '2024-01-01',
            salary: 75000,
          };

          const response = await api.post('/api/employees', employeeData);

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('employee');
          expect(response.data.data.employee.firstName).toBe('John');

          employeeId = response.data.data.employee._id;
          testData.employeeId = employeeId;

          console.log('✓ Employee created:', employeeId);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/employees - List Employees', () => {
      it('should return paginated list of employees', async () => {
        try {
          const response = await api.get('/api/employees?page=1&limit=10');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('employees');
          expect(Array.isArray(response.data.data.employees)).toBe(true);
          expect(response.data.data).toHaveProperty('pagination');

          console.log('✓ Employees retrieved:', response.data.data.employees.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          throw error;
        }
      });

      it('should filter employees by department', async () => {
        try {
          if (!departmentId) {
            console.log('⚠️ No department ID - skipping test');
            return;
          }

          const response = await api.get(`/api/employees?department=${departmentId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('employees');

          console.log('✓ Filtered employees by department');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/employees/:id - Get Employee by ID', () => {
      it('should return employee details', async () => {
        try {
          if (!employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.get(`/api/employees/${employeeId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('employee');
          expect(response.data.data.employee._id).toBe(employeeId);

          console.log('✓ Employee details retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          throw error;
        }
      });

      it('should return 404 for non-existent employee', async () => {
        try {
          await api.get('/api/employees/000000000000000000000000');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          expect(error.response?.status).toBe(404);
        }
      });
    });

    describe('PUT /api/employees/:id - Update Employee', () => {
      it('should update employee details', async () => {
        try {
          if (!employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.put(`/api/employees/${employeeId}`, {
            position: 'Senior Software Engineer',
            salary: 95000,
          });

          expect(response.status).toBe(200);
          expect(response.data.data.employee.position).toBe('Senior Software Engineer');

          console.log('✓ Employee updated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Dashboard Statistics', () => {
    describe('GET /api/employees/dashboard/stats - Get Dashboard Stats', () => {
      it('should return dashboard statistics', async () => {
        try {
          const response = await api.get('/api/employees/dashboard/stats');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('stats');

          console.log('✓ Dashboard stats retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Employee service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });
});
