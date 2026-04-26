import { Router } from 'express';
import { body, query } from 'express-validator';
import * as payrollController from '../controllers/payrollController';
import * as salaryController from '../controllers/salaryController';
import * as advancedPayrollController from '../controllers/advancedPayrollController';
import * as taxController from '../controllers/taxController';
import advancedRoutes from './advancedRoutes';
import extendedRoutes from './extendedRoutes';
import taxConfigRoutes from './taxConfigRoutes';
import advanceTaxRoutes from './advanceTaxRoutes';
import auditorRoutes from './auditorRoutes';
import { requireEnterprisePlan, requireTaxationFeature } from '../middleware/planGuard';
import { requireTenantAdminOrAuditor } from '../middleware/auditorGuard';

const router = Router();

// Mount advanced features routes
router.use('/advanced', advancedRoutes);

// Mount extended features routes (Overtime, F&F, Arrears, Policies, Compliance, ESS)
router.use('/extended', extendedRoutes);

// Mount tax configuration routes (PT, LWF, Tax Limits) - Enterprise only
router.use('/config', requireEnterprisePlan(), taxConfigRoutes);

// Mount advance tax routes - Enterprise only
router.use('/advance-tax', requireEnterprisePlan(), advanceTaxRoutes);

// Mount auditor/CA routes - Enterprise only
router.use('/auditor', auditorRoutes);

// ==================== DEBUG ROUTE ====================
// Debug endpoint to check employee salary configurations
router.get('/debug/salary-status', payrollController.debugSalaryStatus);

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

// Get payrolls on hold (for tenant admin/HR to review)
router.get('/on-hold', payrollController.getPayrollsOnHold);

// Release payroll from hold (after overtime is approved)
router.post('/:id/release', payrollController.releasePayrollFromHold);

// ==================== SALARY STRUCTURE ROUTES ====================
// Note: These must come BEFORE /:id route to avoid matching

// Create salary structure
router.post(
  '/salary-structures',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().withMessage('Code is required'),
  ],
  salaryController.createSalaryStructure
);

// Get salary structures
router.get('/salary-structures', salaryController.getSalaryStructures);

// Seed default salary structure
router.post('/salary-structures/seed', salaryController.seedSalaryStructure);

// Get salary structure by ID
router.get('/salary-structures/:id', salaryController.getSalaryStructureById);

// Update salary structure
router.put('/salary-structures/:id', salaryController.updateSalaryStructure);

// Delete salary structure
router.delete('/salary-structures/:id', salaryController.deleteSalaryStructure);

// Legacy routes for backwards compatibility
router.post('/structures', salaryController.createSalaryStructure);
router.get('/structures', salaryController.getSalaryStructures);
router.post('/structures/seed', salaryController.seedSalaryStructure);
router.get('/structures/:id', salaryController.getSalaryStructureById);
router.put('/structures/:id', salaryController.updateSalaryStructure);
router.delete('/structures/:id', salaryController.deleteSalaryStructure);

// ==================== EMPLOYEE SALARY ROUTES ====================

// Get all employee salaries (must come before /employee-salary/:employeeId)
router.get('/employee-salaries', salaryController.getAllEmployeeSalaries);

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
// NOTE: These must come BEFORE /:id route to avoid matching

// Tax Configuration
router.get('/tax-config/:countryCode', advancedPayrollController.getTaxConfiguration);
router.put('/tax-config/:configId', advancedPayrollController.updateTaxConfiguration);
router.post('/tax-calculation-preview', advancedPayrollController.getTaxCalculationPreview);

// Payroll Batch - must come before /:id
router.post('/batches', advancedPayrollController.createPayrollBatch);
router.get('/batches', advancedPayrollController.getPayrollBatches);
router.post('/batches/:batchId/process', advancedPayrollController.processPayrollBatch);
router.post('/batches/:batchId/approve', advancedPayrollController.approvePayrollBatch);
router.post('/batches/:batchId/pay', advancedPayrollController.markBatchAsPaid);
router.post('/batches/:batchId/bank-file', advancedPayrollController.generateBankFile);

// Process payroll - must come before /:id
router.patch('/:id/process', payrollController.processPayroll);

// Mark payroll as paid - must come before /:id
router.patch('/:id/pay', payrollController.markAsPaid);

// Payslip Generation - must come before /:id
router.post('/:payrollId/payslip', advancedPayrollController.generatePayslip);

// Get payroll by ID - MUST BE LAST among simple /:id routes
router.get('/:id', payrollController.getPayrollById);

// ==================== TAX DECLARATION ROUTES (Enterprise Only) ====================

// Create tax declaration
router.post('/:tenantId/employees/:employeeId/tax-declaration', requireTaxationFeature, taxController.createTaxDeclaration);

// Get tax declaration
router.get('/:tenantId/employees/:employeeId/tax-declaration/:financialYear', requireTaxationFeature, taxController.getTaxDeclaration);

// Update tax declaration
router.put('/tax-declaration/:declarationId', requireTaxationFeature, taxController.updateTaxDeclaration);

// Submit tax declaration
router.post('/tax-declaration/:declarationId/submit', requireTaxationFeature, taxController.submitTaxDeclaration);

// Approve tax declaration (tenant admin or auditor/CA)
router.post('/tax-declaration/:declarationId/approve', requireTaxationFeature, requireTenantAdminOrAuditor(), taxController.approveTaxDeclaration);

// Compute tax
router.post('/tax-declaration/:declarationId/compute', requireTaxationFeature, taxController.computeTax);

// Calculate HRA exemption
router.post('/tax-calculation/hra-exemption', requireTaxationFeature, taxController.calculateHRAExemption);

// Compare tax regimes
router.post('/tax-calculation/compare-regimes', requireTaxationFeature, taxController.compareRegimes);

// ==================== FORM 16 ROUTES (Enterprise Only) ====================

// Generate Form 16
router.post('/:tenantId/employees/:employeeId/form16/:financialYear/generate', requireTaxationFeature, taxController.generateForm16Endpoint);

// Get Form 16
router.get('/:tenantId/employees/:employeeId/form16/:financialYear', requireTaxationFeature, taxController.getForm16);

// Download Form 16 PDF
router.get('/form16/:form16Id/download', requireTaxationFeature, taxController.downloadForm16PDF);

// Issue Form 16 (tenant admin or auditor/CA can issue)
router.post('/form16/:form16Id/issue', requireTaxationFeature, requireTenantAdminOrAuditor(), taxController.issueForm16Endpoint);

// Get all Form 16s for tenant
router.get('/:tenantId/form16', requireTaxationFeature, taxController.getAllForm16s);

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

// ==================== EMPLOYEE SELF-SERVICE PAYSLIP ROUTES ====================
// These return data from Payroll model (generated via bulk/single payroll generation)

// Get payslips for employee (from Payroll model - processed/paid only)
router.get('/:tenantId/employees/:employeeId/payslips', payrollController.getEmployeePayslips);

// Get specific payslip by ID
router.get('/:tenantId/employees/:employeeId/payslips/:payslipId', payrollController.getEmployeePayslipById);

// Get specific payslip by month/year
router.get('/:tenantId/employees/:employeeId/payslip/:year/:month', payrollController.getEmployeePayslipByPeriod);

// Get YTD summary for employee
router.get('/:tenantId/employees/:employeeId/ytd/:year', payrollController.getEmployeeYTDSummary);

// Download payslip PDF by ID
router.get('/:tenantId/employees/:employeeId/payslips/:payslipId/download', payrollController.downloadPayslipPDF);

// Download payslip PDF by month/year
router.get('/:tenantId/employees/:employeeId/payslip/:year/:month/download', payrollController.downloadPayslipByPeriodPDF);

export default router;
