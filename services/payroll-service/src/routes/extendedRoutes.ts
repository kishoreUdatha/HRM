import { Router } from 'express';
import * as controller from '../controllers/extendedFeaturesController';

const router = Router();

// ==================== OVERTIME & SHIFT MANAGEMENT ====================

// Overtime Policies
router.post('/overtime/policies', controller.createOvertimePolicy);
router.get('/overtime/policies/:tenantId', controller.getOvertimePolicies);

// Shift Allowances
router.post('/overtime/shifts', controller.createShiftAllowance);
router.get('/overtime/shifts/:tenantId', controller.getShiftAllowances);
router.post('/overtime/shifts/assign', controller.assignShiftToEmployee);

// Overtime Entries
router.post('/overtime/entries', controller.createOvertimeEntry);
router.post('/overtime/entries/bulk', controller.bulkCreateOvertimeEntries);
router.put('/overtime/entries/:entryId/approve', controller.approveOvertimeEntry);
router.get('/overtime/entries/:tenantId/pending', controller.getPendingOvertimeApprovals);
router.get('/overtime/summary/:tenantId', controller.getOvertimeSummary);

// ==================== LEAVE ENCASHMENT ====================

// Policies
router.post('/leave-encashment/policies', controller.createLeaveEncashmentPolicy);
router.get('/leave-encashment/policies/:tenantId', controller.getLeaveEncashmentPolicies);

// Encashments
router.post('/leave-encashment/apply', controller.applyForLeaveEncashment);
router.put('/leave-encashment/:encashmentId/approve', controller.approveLeaveEncashment);
router.get('/leave-encashment/:tenantId/pending', controller.getPendingLeaveEncashmentApprovals);
router.get('/leave-encashment/summary/:tenantId', controller.getLeaveEncashmentSummary);

// ==================== FULL & FINAL SETTLEMENT ====================

router.post('/fnf/initiate', controller.initiateFnF);
router.post('/fnf/:fnfId/calculate', controller.calculateFnFComponents);
router.put('/fnf/:fnfId/clearance', controller.updateClearanceStatus);
router.put('/fnf/:fnfId/approve', controller.approveFnF);
router.get('/fnf/:tenantId/pending', controller.getPendingFnFSettlements);
router.get('/fnf/:fnfId/statement/pdf', controller.generateFnFStatement);

// ==================== ARREAR PROCESSING ====================

router.post('/arrears/calculate', controller.calculateArrear);
router.post('/arrears/bulk-calculate', controller.bulkCalculateArrears);
router.put('/arrears/:arrearId/approve', controller.approveArrear);
router.get('/arrears/:tenantId/pending', controller.getPendingArrearApprovals);
router.get('/arrears/summary/:tenantId', controller.getArrearSummary);

// ==================== PAYROLL POLICIES ====================

// Policy CRUD
router.post('/policies', controller.createPayrollPolicy);
router.get('/policies/:tenantId', controller.getPayrollPolicies);
router.put('/policies/:policyId', controller.updatePayrollPolicy);
router.put('/policies/:tenantId/:policyId/set-default', controller.setDefaultPolicy);
router.post('/policies/:policyId/clone', controller.clonePolicy);

// Salary Component Rules
router.post('/policies/:policyId/salary-components', controller.addSalaryComponentRule);

// Policy Assignment
router.post('/policies/assign', controller.assignPolicyToEmployee);
router.post('/policies/bulk-assign', controller.bulkAssignPolicy);

// Salary Calculation
router.post('/policies/:tenantId/:employeeId/calculate-salary', controller.calculateSalaryFromPolicy);

// ==================== INVESTMENT DECLARATIONS ====================

// Declaration Management
router.post('/investment-declarations', controller.createInvestmentDeclaration);
router.get('/investment-declarations/:tenantId/:employeeId', controller.getEmployeeInvestmentDeclaration);
router.get('/investment-declarations/:tenantId/pending-verifications', controller.getPendingInvestmentVerifications);

// Add Investments
router.post('/investment-declarations/:declarationId/section80c', controller.addSection80CInvestment);
router.post('/investment-declarations/:declarationId/section80d', controller.addSection80DInvestment);
router.post('/investment-declarations/:declarationId/hra', controller.setHRAExemption);

// Submit & Verify
router.put('/investment-declarations/:declarationId/submit', controller.submitInvestmentDeclaration);
router.put('/investment-declarations/:declarationId/verify', controller.verifyInvestmentProof);

// Calculators
router.post('/investment-declarations/calculate-hra', controller.calculateHRAExemption);

// ==================== STATUTORY COMPLIANCE ====================

// PF ECR
router.post('/compliance/pf/ecr', controller.generatePFECRFile);
router.get('/compliance/pf/ecr/:ecrFileId/download', controller.downloadECRFile);
router.put('/compliance/pf/ecr/:ecrFileId/uploaded', controller.markECRAsUploaded);

// ESI
router.post('/compliance/esi/return', controller.generateESIReturn);

// Professional Tax
router.post('/compliance/pt/return', controller.generatePTReturn);

// TDS
router.post('/compliance/tds/return', controller.generateTDSReturn);
router.get('/compliance/tds/:returnId/download', controller.downloadTDSFile);

// LWF
router.post('/compliance/lwf/return', controller.generateLWFReturn);

// Compliance Dashboard
router.get('/compliance/:tenantId/status', controller.getComplianceStatus);
router.get('/compliance/:tenantId/history', controller.getComplianceHistory);

// Calculators
router.post('/compliance/calculate/pf', controller.calculatePFContributions);
router.post('/compliance/calculate/esi', controller.calculateESIContributions);
router.post('/compliance/calculate/pt', controller.calculateProfessionalTax);

// ==================== EMPLOYEE SELF-SERVICE ====================

// Dashboard
router.get('/ess/:tenantId/:employeeId/dashboard', controller.getEmployeePayrollDashboard);

// Salary & History
router.get('/ess/:tenantId/:employeeId/salary-history', controller.getEmployeeSalaryHistory);
router.get('/ess/:tenantId/:employeeId/compensation', controller.getEmployeeCompensationBreakdown);

// Tax
router.get('/ess/:tenantId/:employeeId/tax-summary', controller.getEmployeeTaxSummary);
router.get('/ess/:tenantId/:employeeId/investment-proofs', controller.getInvestmentProofStatus);

// Loans & Reimbursements
router.get('/ess/:tenantId/:employeeId/loans', controller.getEmployeeLoanSummary);
router.get('/ess/:tenantId/:employeeId/reimbursements', controller.getEmployeeReimbursementSummary);

// Documents
router.get('/ess/:tenantId/:employeeId/documents', controller.getEmployeePayrollDocuments);

// Notifications
router.get('/ess/:tenantId/:employeeId/notifications', controller.getEmployeePayrollNotifications);

export default router;
