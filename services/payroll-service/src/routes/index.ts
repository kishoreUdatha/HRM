import { Router } from 'express';
import { body, query } from 'express-validator';
import * as payrollController from '../controllers/payrollController';
import * as salaryController from '../controllers/salaryController';
import * as advancedPayrollController from '../controllers/advancedPayrollController';
import * as taxController from '../controllers/taxController';
import advancedRoutes from './advancedRoutes';
import extendedRoutes from './extendedRoutes';

const router = Router();

// Mount advanced features routes
router.use('/advanced', advancedRoutes);

// Mount extended features routes (Overtime, F&F, Arrears, Policies, Compliance, ESS)
router.use('/extended', extendedRoutes);

// ==================== PAYROLL ROUTES ====================

// Generate payroll
router.post(
  '/generate',
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required'),
    body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
  ],
  payrollController.generatePayroll
);

// Bulk generate payroll
router.post('/generate/bulk', payrollController.bulkGeneratePayroll);

// Get payrolls
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  payrollController.getPayrolls
);

// Get payroll summary
router.get('/summary', payrollController.getPayrollSummary);

// Get payroll by ID
router.get('/:id', payrollController.getPayrollById);

// Process payroll
router.patch('/:id/process', payrollController.processPayroll);

// Mark payroll as paid
router.patch('/:id/pay', payrollController.markAsPaid);

// ==================== SALARY STRUCTURE ROUTES ====================

// Create salary structure
router.post(
  '/structures',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().withMessage('Code is required'),
  ],
  salaryController.createSalaryStructure
);

// Get salary structures
router.get('/structures', salaryController.getSalaryStructures);

// Seed default salary structure
router.post('/structures/seed', salaryController.seedSalaryStructure);

// Get salary structure by ID
router.get('/structures/:id', salaryController.getSalaryStructureById);

// Update salary structure
router.put('/structures/:id', salaryController.updateSalaryStructure);

// Delete salary structure
router.delete('/structures/:id', salaryController.deleteSalaryStructure);

// ==================== EMPLOYEE SALARY ROUTES ====================

// Assign salary to employee
router.post(
  '/employee-salary',
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('salaryStructureId').notEmpty().withMessage('Salary structure is required'),
    body('baseSalary').isFloat({ min: 0 }).withMessage('Valid base salary is required'),
    body('effectiveFrom').isISO8601().withMessage('Valid effective date is required'),
  ],
  salaryController.assignSalary
);

// Get employee salary
router.get('/employee-salary/:employeeId', salaryController.getEmployeeSalary);

// Update employee salary
router.put('/employee-salary/:id', salaryController.updateEmployeeSalary);

// ==================== ADVANCED PAYROLL ROUTES ====================

// Tax Configuration
router.get('/tax-config/:countryCode', advancedPayrollController.getTaxConfiguration);
router.put('/tax-config/:configId', advancedPayrollController.updateTaxConfiguration);
router.post('/tax-calculation-preview', advancedPayrollController.getTaxCalculationPreview);

// Payroll Batch
router.post('/batches', advancedPayrollController.createPayrollBatch);
router.get('/batches', advancedPayrollController.getPayrollBatches);
router.post('/batches/:batchId/process', advancedPayrollController.processPayrollBatch);
router.post('/batches/:batchId/approve', advancedPayrollController.approvePayrollBatch);
router.post('/batches/:batchId/pay', advancedPayrollController.markBatchAsPaid);

// Payslip & Bank File Generation
router.post('/:payrollId/payslip', advancedPayrollController.generatePayslip);
router.post('/batches/:batchId/bank-file', advancedPayrollController.generateBankFile);

// ==================== TAX DECLARATION ROUTES ====================

// Create tax declaration
router.post('/:tenantId/employees/:employeeId/tax-declaration', taxController.createTaxDeclaration);

// Get tax declaration
router.get('/:tenantId/employees/:employeeId/tax-declaration/:financialYear', taxController.getTaxDeclaration);

// Update tax declaration
router.put('/tax-declaration/:declarationId', taxController.updateTaxDeclaration);

// Submit tax declaration
router.post('/tax-declaration/:declarationId/submit', taxController.submitTaxDeclaration);

// Approve tax declaration
router.post('/tax-declaration/:declarationId/approve', taxController.approveTaxDeclaration);

// Compute tax
router.post('/tax-declaration/:declarationId/compute', taxController.computeTax);

// Calculate HRA exemption
router.post('/tax-calculation/hra-exemption', taxController.calculateHRAExemption);

// Compare tax regimes
router.post('/tax-calculation/compare-regimes', taxController.compareRegimes);

// ==================== FORM 16 ROUTES ====================

// Generate Form 16
router.post('/:tenantId/employees/:employeeId/form16/:financialYear/generate', taxController.generateForm16Endpoint);

// Get Form 16
router.get('/:tenantId/employees/:employeeId/form16/:financialYear', taxController.getForm16);

// Download Form 16 PDF
router.get('/form16/:form16Id/download', taxController.downloadForm16PDF);

// Issue Form 16
router.post('/form16/:form16Id/issue', taxController.issueForm16Endpoint);

// Get all Form 16s for tenant
router.get('/:tenantId/form16', taxController.getAllForm16s);

// ==================== PAYSTUB ROUTES ====================

// Generate paystub
router.post('/:tenantId/employees/:employeeId/paystub', taxController.generatePaystubEndpoint);

// Get paystub
router.get('/:tenantId/employees/:employeeId/paystub/:year/:month', taxController.getPaystub);

// Download paystub PDF
router.get('/paystub/:paystubId/download', taxController.downloadPaystubPDF);

// Get paystub history
router.get('/:tenantId/employees/:employeeId/paystubs', taxController.getPaystubHistoryEndpoint);

// Get YTD summary
router.get('/:tenantId/employees/:employeeId/ytd-summary/:year', taxController.getYTDSummaryEndpoint);

// Approve paystub
router.post('/paystub/:paystubId/approve', taxController.approvePaystub);

// Cancel paystub
router.post('/paystub/:paystubId/cancel', taxController.cancelPaystubEndpoint);

// Mark paystub as emailed
router.post('/paystub/:paystubId/emailed', taxController.markPaystubEmailedEndpoint);

// Bulk generate paystubs
router.post('/:tenantId/paystubs/bulk', taxController.bulkGeneratePaystubsEndpoint);

// Get paystubs by status
router.get('/:tenantId/paystubs/by-status', taxController.getPaystubsByStatusEndpoint);

// Get monthly paystub stats
router.get('/:tenantId/paystubs/stats/:year/:month', taxController.getMonthlyPaystubStatsEndpoint);

// Compare paystubs between periods
router.get('/:tenantId/employees/:employeeId/paystubs/compare', taxController.comparePaystubsEndpoint);

export default router;
