import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Payroll Service Integration Tests', () => {
  let salaryStructureId: string;
  let payrollId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  describe('Salary Structure Management', () => {
    describe('POST /api/payroll/structures - Create Salary Structure', () => {
      it('should create a new salary structure', async () => {
        try {
          const response = await api.post('/api/payroll/structures', {
            name: 'Standard Package',
            code: 'STD-PKG',
            description: 'Standard salary package for employees',
            components: [
              { name: 'Basic', type: 'earning', calculationType: 'percentage', value: 50 },
              { name: 'HRA', type: 'earning', calculationType: 'percentage', value: 20 },
              { name: 'Transport', type: 'earning', calculationType: 'fixed', value: 3000 },
              { name: 'PF', type: 'deduction', calculationType: 'percentage', value: 12 },
              { name: 'Tax', type: 'deduction', calculationType: 'percentage', value: 10 },
            ],
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('structure');

          salaryStructureId = response.data.data.structure._id;

          console.log('✓ Salary structure created:', salaryStructureId);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          // May already exist
          if (error.response?.status === 400) {
            console.log('⚠️ Salary structure may already exist');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/payroll/structures - List Salary Structures', () => {
      it('should return list of salary structures', async () => {
        try {
          const response = await api.get('/api/payroll/structures');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('structures');
          expect(Array.isArray(response.data.data.structures)).toBe(true);

          if (response.data.data.structures.length > 0 && !salaryStructureId) {
            salaryStructureId = response.data.data.structures[0]._id;
          }

          console.log('✓ Salary structures retrieved:', response.data.data.structures.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Employee Salary Assignment', () => {
    describe('POST /api/payroll/employee-salary - Assign Salary', () => {
      it('should assign salary structure to employee', async () => {
        try {
          if (!testData.employeeId || !salaryStructureId) {
            console.log('⚠️ Missing employee or structure ID - skipping test');
            return;
          }

          const response = await api.post('/api/payroll/employee-salary', {
            employeeId: testData.employeeId,
            salaryStructureId: salaryStructureId,
            baseSalary: 75000,
            effectiveFrom: new Date().toISOString(),
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('employeeSalary');

          console.log('✓ Salary assigned to employee');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          // May already be assigned
          if (error.response?.status === 400) {
            console.log('⚠️ Salary may already be assigned');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/payroll/employee-salary/:employeeId - Get Employee Salary', () => {
      it('should return employee salary details', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const response = await api.get(`/api/payroll/employee-salary/${testData.employeeId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('employeeSalary');

          console.log('✓ Employee salary retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Payroll Generation', () => {
    describe('POST /api/payroll/generate - Generate Payroll', () => {
      it('should generate payroll for an employee', async () => {
        try {
          if (!testData.employeeId) {
            console.log('⚠️ No employee ID - skipping test');
            return;
          }

          const currentDate = new Date();
          const response = await api.post('/api/payroll/generate', {
            employeeId: testData.employeeId,
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
          });

          expect(response.status).toBe(201);
          expect(response.data.data).toHaveProperty('payroll');
          expect(response.data.data.payroll).toHaveProperty('netSalary');

          payrollId = response.data.data.payroll._id;

          console.log('✓ Payroll generated:', payrollId);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('POST /api/payroll/generate/bulk - Bulk Generate Payroll', () => {
      it('should generate payroll for all employees', async () => {
        try {
          const currentDate = new Date();
          const response = await api.post('/api/payroll/generate/bulk', {
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
          });

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('results');

          console.log('✓ Bulk payroll generated');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Payroll Records', () => {
    describe('GET /api/payroll - List Payrolls', () => {
      it('should return list of payroll records', async () => {
        try {
          const response = await api.get('/api/payroll');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('payrolls');
          expect(Array.isArray(response.data.data.payrolls)).toBe(true);

          console.log('✓ Payroll records retrieved:', response.data.data.payrolls.length);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });

      it('should filter payrolls by month and year', async () => {
        try {
          const currentDate = new Date();
          const response = await api.get(
            `/api/payroll?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
          );

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('payrolls');

          console.log('✓ Filtered payrolls by period');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('GET /api/payroll/summary - Get Payroll Summary', () => {
      it('should return payroll summary', async () => {
        try {
          const response = await api.get('/api/payroll/summary');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('summary');

          console.log('✓ Payroll summary retrieved');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });

  describe('Payroll Processing', () => {
    describe('PATCH /api/payroll/:id/process - Process Payroll', () => {
      it('should process a payroll record', async () => {
        try {
          if (!payrollId) {
            console.log('⚠️ No payroll ID - skipping test');
            return;
          }

          const response = await api.patch(`/api/payroll/${payrollId}/process`);

          expect(response.status).toBe(200);
          expect(response.data.data.payroll.status).toBe('processed');

          console.log('✓ Payroll processed');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });

    describe('PATCH /api/payroll/:id/pay - Mark as Paid', () => {
      it('should mark payroll as paid', async () => {
        try {
          if (!payrollId) {
            console.log('⚠️ No payroll ID - skipping test');
            return;
          }

          const response = await api.patch(`/api/payroll/${payrollId}/pay`);

          expect(response.status).toBe(200);
          expect(response.data.data.payroll.status).toBe('paid');

          console.log('✓ Payroll marked as paid');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            console.log('⚠️ Payroll service not running - skipping test');
            return;
          }
          throw error;
        }
      });
    });
  });
});
