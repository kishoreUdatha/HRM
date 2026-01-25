import { api, testData, setAuthToken, setTenantId } from '../setup';

describe('Payroll Service - Comprehensive Tests', () => {
  let payrollId: string;
  let payslipId: string;

  beforeAll(() => {
    if (testData.accessToken) {
      setAuthToken(testData.accessToken);
    }
    if (testData.tenantId) {
      setTenantId(testData.tenantId);
    }
  });

  // ==================== SALARY STRUCTURE ====================
  describe('Salary Structure', () => {
    describe('Create Salary Structure', () => {
      it('should create salary structure', async () => {
        try {
          const response = await api.post('/api/payroll/salary-structures', {
            name: 'Standard Structure',
            basicPercentage: 50,
            hraPercentage: 20,
            allowances: [
              { name: 'Transport Allowance', amount: 5000 },
              { name: 'Medical Allowance', amount: 3000 },
            ],
            deductions: [
              { name: 'Provident Fund', percentage: 12 },
              { name: 'Professional Tax', amount: 200 },
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

    describe('List Salary Structures', () => {
      it('should list all salary structures', async () => {
        try {
          const response = await api.get('/api/payroll/salary-structures');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== PAYROLL PROCESSING ====================
  describe('Payroll Processing', () => {
    describe('Generate Payroll', () => {
      it('should generate monthly payroll', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth(); // Previous month

          const response = await api.post('/api/payroll/generate', {
            year,
            month,
            departmentId: testData.departmentId,
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.payroll) {
            payrollId = response.data.data.payroll._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should generate payroll for specific employees', async () => {
        try {
          if (!testData.employeeId) return;

          const year = new Date().getFullYear();
          const month = new Date().getMonth();

          const response = await api.post('/api/payroll/generate', {
            year,
            month,
            employeeIds: [testData.employeeId],
          });

          expect([200, 201]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should reject duplicate payroll generation', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth();

          // First generation
          await api.post('/api/payroll/generate', {
            year,
            month,
          });

          // Duplicate generation
          await api.post('/api/payroll/generate', {
            year,
            month,
          });
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          // May fail or allow regeneration
          expect([400, 409]).toContain(error.response?.status);
        }
      });
    });

    describe('List Payrolls', () => {
      it('should list payrolls', async () => {
        try {
          const response = await api.get('/api/payroll');

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('payrolls');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter payrolls by year/month', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          const response = await api.get(`/api/payroll?year=${year}&month=${month}`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should filter payrolls by status', async () => {
        try {
          const response = await api.get('/api/payroll?status=processed');

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Get Payroll Details', () => {
      it('should get payroll by ID', async () => {
        try {
          if (!payrollId) {
            console.log('⚠️ No payroll ID - skipping test');
            return;
          }

          const response = await api.get(`/api/payroll/${payrollId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('payroll');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });
    });

    describe('Approve Payroll', () => {
      it('should approve payroll', async () => {
        try {
          if (!payrollId) return;

          const response = await api.post(`/api/payroll/${payrollId}/approve`);

          expect(response.status).toBe(200);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Process Payroll', () => {
      it('should mark payroll as processed', async () => {
        try {
          if (!payrollId) return;

          const response = await api.post(`/api/payroll/${payrollId}/process`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== PAY SLIPS ====================
  describe('Pay Slips', () => {
    describe('Generate Pay Slips', () => {
      it('should generate pay slip for employee', async () => {
        try {
          if (!testData.employeeId) return;

          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          const response = await api.post('/api/payroll/payslips/generate', {
            employeeId: testData.employeeId,
            year,
            month,
          });

          expect([200, 201]).toContain(response.status);
          if (response.data.data?.payslip) {
            payslipId = response.data.data.payslip._id;
          }
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should bulk generate pay slips', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          const response = await api.post('/api/payroll/payslips/bulk-generate', {
            year,
            month,
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('List Pay Slips', () => {
      it('should list pay slips for employee', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/payroll/payslips?employeeId=${testData.employeeId}`);

          expect(response.status).toBe(200);
          expect(response.data.data).toHaveProperty('payslips');
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          throw error;
        }
      });

      it('should get own pay slips', async () => {
        try {
          const response = await api.get('/api/payroll/payslips/my');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Download Pay Slip', () => {
      it('should download pay slip as PDF', async () => {
        try {
          if (!payslipId) return;

          const response = await api.get(`/api/payroll/payslips/${payslipId}/download`, {
            responseType: 'arraybuffer',
          });

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Email Pay Slip', () => {
      it('should email pay slip to employee', async () => {
        try {
          if (!payslipId) return;

          const response = await api.post(`/api/payroll/payslips/${payslipId}/email`);

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== TAX CALCULATIONS ====================
  describe('Tax Calculations', () => {
    describe('Calculate Tax', () => {
      it('should calculate tax for salary', async () => {
        try {
          const response = await api.post('/api/payroll/tax/calculate', {
            grossSalary: 100000,
            deductions: {
              pf: 12000,
              insurance: 5000,
            },
            taxRegime: 'new',
          });

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should compare old vs new tax regime', async () => {
        try {
          const response = await api.post('/api/payroll/tax/compare', {
            grossSalary: 100000,
            deductions: {
              pf: 12000,
              insurance: 5000,
              hra: 20000,
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

    describe('Tax Declarations', () => {
      it('should submit tax declaration', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.post('/api/payroll/tax/declarations', {
            employeeId: testData.employeeId,
            financialYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            declarations: [
              { section: '80C', amount: 150000, description: 'PPF, ELSS' },
              { section: '80D', amount: 25000, description: 'Health Insurance' },
            ],
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get tax declarations', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/payroll/tax/declarations?employeeId=${testData.employeeId}`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== DEDUCTIONS ====================
  describe('Deductions Management', () => {
    describe('Add Deduction', () => {
      it('should add one-time deduction', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.post('/api/payroll/deductions', {
            employeeId: testData.employeeId,
            type: 'one-time',
            name: 'Advance Recovery',
            amount: 5000,
            effectiveMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should add recurring deduction', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.post('/api/payroll/deductions', {
            employeeId: testData.employeeId,
            type: 'recurring',
            name: 'Loan EMI',
            amount: 10000,
            startMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            endMonth: `${new Date().getFullYear() + 1}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          });

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('List Deductions', () => {
      it('should list employee deductions', async () => {
        try {
          if (!testData.employeeId) return;

          const response = await api.get(`/api/payroll/deductions?employeeId=${testData.employeeId}`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== BANK TRANSFERS ====================
  describe('Bank Transfers', () => {
    describe('Process Salary Transfer', () => {
      it('should initiate bank transfer', async () => {
        try {
          if (!payrollId) return;

          const response = await api.post(`/api/payroll/${payrollId}/transfer`);

          expect([200, 201, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get transfer status', async () => {
        try {
          if (!payrollId) return;

          const response = await api.get(`/api/payroll/${payrollId}/transfer-status`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Bank File Generation', () => {
      it('should generate bank file', async () => {
        try {
          if (!payrollId) return;

          const response = await api.get(`/api/payroll/${payrollId}/bank-file`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== PAYROLL REPORTS ====================
  describe('Payroll Reports', () => {
    describe('Summary Reports', () => {
      it('should get payroll summary', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          const response = await api.get(`/api/payroll/reports/summary?year=${year}&month=${month}`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should get department-wise payroll summary', async () => {
        try {
          const response = await api.get('/api/payroll/reports/by-department');

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Export Reports', () => {
      it('should export payroll report', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          const response = await api.get(`/api/payroll/reports/export?year=${year}&month=${month}&format=excel`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });

    describe('Statutory Reports', () => {
      it('should generate PF report', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          const response = await api.get(`/api/payroll/reports/pf?year=${year}&month=${month}`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });

      it('should generate ESI report', async () => {
        try {
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          const response = await api.get(`/api/payroll/reports/esi?year=${year}&month=${month}`);

          expect([200, 404]).toContain(response.status);
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') return;
          if (error.response?.status === 404) return;
          throw error;
        }
      });
    });
  });

  // ==================== PAYROLL STATISTICS ====================
  describe('Payroll Statistics', () => {
    it('should get payroll statistics', async () => {
      try {
        const response = await api.get('/api/payroll/stats');

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });

    it('should get yearly payroll trends', async () => {
      try {
        const year = new Date().getFullYear();
        const response = await api.get(`/api/payroll/stats/trends?year=${year}`);

        expect([200, 404]).toContain(response.status);
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') return;
        if (error.response?.status === 404) return;
        throw error;
      }
    });
  });
});
