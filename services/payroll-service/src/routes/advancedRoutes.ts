import { Router } from 'express';
import * as advancedFeaturesController from '../controllers/advancedFeaturesController';

const router = Router();

// ==================== SALARY REVISION ROUTES ====================

// Create salary revision
router.post('/employees/:employeeId/salary-revision', advancedFeaturesController.createSalaryRevision);

// Approve/Reject salary revision
router.post('/salary-revision/:revisionId/approve', advancedFeaturesController.approveSalaryRevision);

// Get salary revision history for employee
router.get('/employees/:employeeId/salary-revision/history', advancedFeaturesController.getSalaryRevisionHistory);

// Get pending revisions
router.get('/salary-revision/pending', advancedFeaturesController.getPendingRevisions);

// Generate revision letter
router.post('/salary-revision/:revisionId/letter', advancedFeaturesController.generateRevisionLetter);

// ==================== LOAN ROUTES ====================

// Apply for loan
router.post('/employees/:employeeId/loans', advancedFeaturesController.applyForLoan);

// Approve/Reject loan
router.post('/loans/:loanId/approve', advancedFeaturesController.approveLoan);

// Disburse loan
router.post('/loans/:loanId/disburse', advancedFeaturesController.disburseLoan);

// Get employee loans
router.get('/employees/:employeeId/loans', advancedFeaturesController.getEmployeeLoans);

// Get loan details
router.get('/loans/:loanId', advancedFeaturesController.getLoanDetails);

// Foreclose loan
router.post('/loans/:loanId/foreclose', advancedFeaturesController.foreCloseLoan);

// Get pending loan approvals
router.get('/loans/pending-approvals', advancedFeaturesController.getPendingLoanApprovals);

// Get loan summary
router.get('/loans/summary', advancedFeaturesController.getLoanSummary);

// ==================== REIMBURSEMENT ROUTES ====================

// Create reimbursement
router.post('/employees/:employeeId/reimbursements', advancedFeaturesController.createReimbursement);

// Submit reimbursement
router.post('/reimbursements/:reimbursementId/submit', advancedFeaturesController.submitReimbursement);

// Approve reimbursement
router.post('/reimbursements/:reimbursementId/approve', advancedFeaturesController.approveReimbursement);

// Get employee reimbursements
router.get('/employees/:employeeId/reimbursements', advancedFeaturesController.getEmployeeReimbursements);

// Get pending approvals
router.get('/reimbursements/pending-approvals', advancedFeaturesController.getPendingReimbursementApprovals);

// Get reimbursement summary
router.get('/reimbursements/summary', advancedFeaturesController.getReimbursementSummary);

// ==================== BONUS ROUTES ====================

// Create bonus
router.post('/bonuses', advancedFeaturesController.createBonus);

// Calculate bonus for employees
router.post('/bonuses/:bonusId/calculate', advancedFeaturesController.calculateBonus);

// Approve bonus
router.post('/bonuses/:bonusId/approve', advancedFeaturesController.approveBonus);

// Get bonus list
router.get('/bonuses', advancedFeaturesController.getBonusList);

// Get bonus details
router.get('/bonuses/:bonusId', advancedFeaturesController.getBonusDetails);

// Get employee bonus history
router.get('/employees/:employeeId/bonuses', advancedFeaturesController.getEmployeeBonusHistory);

// ==================== AUDIT ROUTES ====================

// Get audit logs
router.get('/audit/logs', advancedFeaturesController.getAuditLogs);

// Get entity audit trail
router.get('/audit/:entityType/:entityId', advancedFeaturesController.getEntityAuditTrail);

// Get audit summary
router.get('/audit/summary', advancedFeaturesController.getAuditSummary);

// ==================== CURRENCY ROUTES ====================

// Setup currency
router.post('/currencies', advancedFeaturesController.setupCurrency);

// Add exchange rate
router.post('/currencies/:currencyCode/exchange-rates', advancedFeaturesController.addExchangeRate);

// Get currency list
router.get('/currencies', advancedFeaturesController.getCurrencyList);

// Convert currency
router.post('/currencies/convert', advancedFeaturesController.convertCurrency);

// Setup employee currency
router.post('/employees/:employeeId/currency', advancedFeaturesController.setupEmployeeCurrency);

// ==================== REPORT ROUTES ====================

// Payroll summary report
router.get('/reports/payroll-summary/:year/:month', advancedFeaturesController.getPayrollSummaryReport);

// Cost center report
router.post('/reports/cost-center', advancedFeaturesController.getCostCenterReport);

// Trend analysis report
router.get('/reports/trend-analysis', advancedFeaturesController.getTrendAnalysisReport);

// Compliance report
router.get('/reports/compliance/:year/:month', advancedFeaturesController.getComplianceReport);

// Employee payroll report
router.get('/reports/employee/:employeeId/:financialYear', advancedFeaturesController.getEmployeePayrollReport);

// Variance report
router.get('/reports/variance', advancedFeaturesController.getVarianceReport);

export default router;
