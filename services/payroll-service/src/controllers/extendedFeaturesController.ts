import { Request, Response } from 'express';

// Overtime & Shift Services
import * as overtimeService from '../services/overtimeService';

// Leave Encashment Services
import * as leaveEncashmentService from '../services/leaveEncashmentService';

// F&F Services
import * as fnfService from '../services/fnfService';

// Arrear Services
import * as arrearService from '../services/arrearService';

// Policy Services
import * as policyService from '../services/policyService';

// Investment Declaration Services
import * as investmentService from '../services/investmentDeclarationService';

// Statutory Compliance Services
import * as statutoryService from '../services/statutoryComplianceService';

// Employee Self-Service
import * as essService from '../services/employeeSelfServiceService';

// ==================== OVERTIME CONTROLLERS ====================

export async function createOvertimePolicy(req: Request, res: Response) {
  try {
    const { tenantId, ...data } = req.body;
    const policy = await overtimeService.createOvertimePolicy(tenantId, data);
    res.status(201).json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getOvertimePolicies(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const policies = await overtimeService.getOvertimePolicies(tenantId);
    res.json({ success: true, data: policies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createShiftAllowance(req: Request, res: Response) {
  try {
    const { tenantId, ...data } = req.body;
    const shift = await overtimeService.createShiftAllowance(tenantId, data);
    res.status(201).json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getShiftAllowances(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const shifts = await overtimeService.getShiftAllowances(tenantId);
    res.json({ success: true, data: shifts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function assignShiftToEmployee(req: Request, res: Response) {
  try {
    const { tenantId, employeeId, shiftAllowanceId, effectiveFrom } = req.body;
    const assignment = await overtimeService.assignShiftToEmployee(
      tenantId, employeeId, shiftAllowanceId, new Date(effectiveFrom)
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createOvertimeEntry(req: Request, res: Response) {
  try {
    const { tenantId, employeeId, hourlyRate, overtimeMultiplier, ...data } = req.body;
    const entry = await overtimeService.createOvertimeEntry(
      tenantId, employeeId, data, hourlyRate, overtimeMultiplier
    );
    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function bulkCreateOvertimeEntries(req: Request, res: Response) {
  try {
    const { tenantId, entries } = req.body;
    const result = await overtimeService.bulkCreateOvertimeEntries(tenantId, entries);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function approveOvertimeEntry(req: Request, res: Response) {
  try {
    const { entryId } = req.params;
    const { approverId, approved, rejectionReason } = req.body;
    const entry = await overtimeService.approveOvertimeEntry(entryId, approverId, approved, rejectionReason);
    res.json({ success: true, data: entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPendingOvertimeApprovals(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const entries = await overtimeService.getPendingOvertimeApprovals(tenantId);
    res.json({ success: true, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getOvertimeSummary(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { month, year } = req.query;
    const summary = await overtimeService.getOvertimeSummary(
      tenantId, parseInt(month as string), parseInt(year as string)
    );
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== LEAVE ENCASHMENT CONTROLLERS ====================

export async function createLeaveEncashmentPolicy(req: Request, res: Response) {
  try {
    const { tenantId, ...data } = req.body;
    const policy = await leaveEncashmentService.createLeaveEncashmentPolicy(tenantId, data);
    res.status(201).json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLeaveEncashmentPolicies(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const policies = await leaveEncashmentService.getLeaveEncashmentPolicies(tenantId);
    res.json({ success: true, data: policies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function applyForLeaveEncashment(req: Request, res: Response) {
  try {
    const { tenantId, employeeId, ...data } = req.body;
    const encashment = await leaveEncashmentService.applyForLeaveEncashment(tenantId, employeeId, data);
    res.status(201).json({ success: true, data: encashment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function approveLeaveEncashment(req: Request, res: Response) {
  try {
    const { encashmentId } = req.params;
    const { approverId, approved, rejectionReason } = req.body;
    const encashment = await leaveEncashmentService.approveLeaveEncashment(
      encashmentId, approverId, approved, rejectionReason
    );
    res.json({ success: true, data: encashment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPendingLeaveEncashmentApprovals(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const encashments = await leaveEncashmentService.getPendingLeaveEncashmentApprovals(tenantId);
    res.json({ success: true, data: encashments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLeaveEncashmentSummary(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { financialYear } = req.query;
    const summary = await leaveEncashmentService.getLeaveEncashmentSummary(
      tenantId, financialYear as string
    );
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== F&F CONTROLLERS ====================

export async function initiateFnF(req: Request, res: Response) {
  try {
    const { tenantId, employeeId, ...data } = req.body;
    const fnf = await fnfService.initiateFullAndFinal(tenantId, employeeId, data);
    res.status(201).json({ success: true, data: fnf });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function calculateFnFComponents(req: Request, res: Response) {
  try {
    const { fnfId } = req.params;
    const fnf = await fnfService.calculateFnFComponents(fnfId);
    res.json({ success: true, data: fnf });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateClearanceStatus(req: Request, res: Response) {
  try {
    const { fnfId } = req.params;
    const { department, cleared, clearedBy, remarks, recoveryAmount } = req.body;
    const fnf = await fnfService.updateClearanceStatus(
      fnfId, department, cleared, clearedBy, remarks, recoveryAmount
    );
    res.json({ success: true, data: fnf });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function approveFnF(req: Request, res: Response) {
  try {
    const { fnfId } = req.params;
    const { approverId, approved, remarks } = req.body;
    const fnf = await fnfService.approveFnF(fnfId, approverId, approved, remarks);
    res.json({ success: true, data: fnf });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPendingFnFSettlements(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const settlements = await fnfService.getPendingFnFSettlements(tenantId);
    res.json({ success: true, data: settlements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function generateFnFStatement(req: Request, res: Response) {
  try {
    const { fnfId } = req.params;
    const pdf = await fnfService.generateFnFStatementPDF(fnfId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fnf-statement-${fnfId}.pdf`);
    res.send(Buffer.from(pdf));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== ARREAR CONTROLLERS ====================

export async function calculateArrear(req: Request, res: Response) {
  try {
    const { tenantId, employeeId, ...data } = req.body;
    const arrear = await arrearService.calculateArrear(tenantId, employeeId, data);
    res.status(201).json({ success: true, data: arrear });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function approveArrear(req: Request, res: Response) {
  try {
    const { arrearId } = req.params;
    const { approverId, approved, remarks } = req.body;
    const arrear = await arrearService.approveArrear(arrearId, approverId, approved, remarks);
    res.json({ success: true, data: arrear });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function bulkCalculateArrears(req: Request, res: Response) {
  try {
    const { tenantId, employees, arrearType, reason, period, createdBy } = req.body;
    const result = await arrearService.bulkCalculateArrears(
      tenantId, employees, arrearType, reason, period, createdBy
    );
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPendingArrearApprovals(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const arrears = await arrearService.getPendingArrearApprovals(tenantId);
    res.json({ success: true, data: arrears });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getArrearSummary(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const period = req.query.period ? JSON.parse(req.query.period as string) : undefined;
    const summary = await arrearService.getArrearSummary(tenantId, period);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== POLICY CONTROLLERS ====================

export async function createPayrollPolicy(req: Request, res: Response) {
  try {
    const { tenantId, createdBy, ...data } = req.body;
    const policy = await policyService.createPayrollPolicy(tenantId, data, createdBy);
    res.status(201).json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPayrollPolicies(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';
    const policies = await policyService.getPayrollPolicies(tenantId, includeInactive);
    res.json({ success: true, data: policies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePayrollPolicy(req: Request, res: Response) {
  try {
    const { policyId } = req.params;
    const { updatedBy, ...updates } = req.body;
    const policy = await policyService.updatePayrollPolicy(policyId, updates, updatedBy);
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function setDefaultPolicy(req: Request, res: Response) {
  try {
    const { tenantId, policyId } = req.params;
    const { setBy } = req.body;
    const policy = await policyService.setDefaultPolicy(tenantId, policyId, setBy);
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function assignPolicyToEmployee(req: Request, res: Response) {
  try {
    const { tenantId, employeeId, policyId, effectiveFrom, assignedBy } = req.body;
    const assignment = await policyService.assignPolicyToEmployee(
      tenantId, employeeId, policyId, new Date(effectiveFrom), assignedBy
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function bulkAssignPolicy(req: Request, res: Response) {
  try {
    const { tenantId, employeeIds, policyId, effectiveFrom, assignedBy } = req.body;
    const result = await policyService.bulkAssignPolicy(
      tenantId, employeeIds, policyId, new Date(effectiveFrom), assignedBy
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function addSalaryComponentRule(req: Request, res: Response) {
  try {
    const { policyId } = req.params;
    const { rule, addedBy } = req.body;
    const policy = await policyService.addSalaryComponentRule(policyId, rule, addedBy);
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function calculateSalaryFromPolicy(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const { basicSalary, context } = req.body;
    const policy = await policyService.getEmployeePolicy(tenantId, employeeId);
    if (!policy) {
      return res.status(404).json({ success: false, error: 'No policy found for employee' });
    }
    const salary = await policyService.calculateSalaryFromPolicy(policy, basicSalary, context);
    res.json({ success: true, data: salary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function clonePolicy(req: Request, res: Response) {
  try {
    const { policyId } = req.params;
    const { newCode, newName, clonedBy } = req.body;
    const policy = await policyService.clonePolicy(policyId, newCode, newName, clonedBy);
    res.status(201).json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== INVESTMENT DECLARATION CONTROLLERS ====================

export async function createInvestmentDeclaration(req: Request, res: Response) {
  try {
    const { tenantId, employeeId, financialYear } = req.body;
    const declaration = await investmentService.createInvestmentDeclaration(tenantId, employeeId, financialYear);
    res.status(201).json({ success: true, data: declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function addSection80CInvestment(req: Request, res: Response) {
  try {
    const { declarationId } = req.params;
    const investment = req.body;
    const declaration = await investmentService.addSection80CInvestment(declarationId, investment);
    res.json({ success: true, data: declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function addSection80DInvestment(req: Request, res: Response) {
  try {
    const { declarationId } = req.params;
    const investment = req.body;
    const declaration = await investmentService.addSection80DInvestment(declarationId, investment);
    res.json({ success: true, data: declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function setHRAExemption(req: Request, res: Response) {
  try {
    const { declarationId } = req.params;
    const hra = req.body;
    const declaration = await investmentService.setHRAExemption(declarationId, hra);
    res.json({ success: true, data: declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function submitInvestmentDeclaration(req: Request, res: Response) {
  try {
    const { declarationId } = req.params;
    const { submittedBy } = req.body;
    const declaration = await investmentService.submitDeclaration(declarationId, submittedBy);
    res.json({ success: true, data: declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function verifyInvestmentProof(req: Request, res: Response) {
  try {
    const { declarationId } = req.params;
    const { section, index, verified, verifiedAmount, verifiedBy, remarks } = req.body;
    const declaration = await investmentService.verifyInvestmentProof(
      declarationId, section, index, verified, verifiedAmount, verifiedBy, remarks
    );
    res.json({ success: true, data: declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPendingInvestmentVerifications(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const declarations = await investmentService.getPendingVerifications(tenantId);
    res.json({ success: true, data: declarations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeeInvestmentDeclaration(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const { financialYear } = req.query;
    const declaration = await investmentService.getEmployeeDeclaration(
      tenantId, employeeId, financialYear as string
    );
    res.json({ success: true, data: declaration });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function calculateHRAExemption(req: Request, res: Response) {
  try {
    const { basicSalary, hraReceived, rentPaid, isMetroCity } = req.body;
    const exemption = await investmentService.calculateHRAExemption(
      basicSalary, hraReceived, rentPaid, isMetroCity
    );
    res.json({ success: true, data: exemption });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== STATUTORY COMPLIANCE CONTROLLERS ====================

export async function generatePFECRFile(req: Request, res: Response) {
  try {
    const data = req.body;
    const ecr = await statutoryService.generatePFECRFile(data.tenantId, data);
    res.status(201).json({ success: true, data: ecr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function downloadECRFile(req: Request, res: Response) {
  try {
    const { ecrFileId } = req.params;
    const content = await statutoryService.generateECRTextFile(ecrFileId);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=ecr-${ecrFileId}.txt`);
    res.send(content);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function markECRAsUploaded(req: Request, res: Response) {
  try {
    const { ecrFileId } = req.params;
    const { trrnNumber, uploadedBy } = req.body;
    const ecr = await statutoryService.markECRAsUploaded(ecrFileId, trrnNumber, uploadedBy);
    res.json({ success: true, data: ecr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function generateESIReturn(req: Request, res: Response) {
  try {
    const data = req.body;
    const esiReturn = await statutoryService.generateESIReturn(data.tenantId, data);
    res.status(201).json({ success: true, data: esiReturn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function generatePTReturn(req: Request, res: Response) {
  try {
    const data = req.body;
    const ptReturn = await statutoryService.generatePTReturn(data.tenantId, data);
    res.status(201).json({ success: true, data: ptReturn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function generateTDSReturn(req: Request, res: Response) {
  try {
    const data = req.body;
    const tdsReturn = await statutoryService.generateTDSReturn(data.tenantId, data);
    res.status(201).json({ success: true, data: tdsReturn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function downloadTDSFile(req: Request, res: Response) {
  try {
    const { returnId } = req.params;
    const content = await statutoryService.generateTDSFVUFile(returnId);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=tds-${returnId}.txt`);
    res.send(content);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function generateLWFReturn(req: Request, res: Response) {
  try {
    const data = req.body;
    const lwfReturn = await statutoryService.generateLWFReturn(data.tenantId, data);
    res.status(201).json({ success: true, data: lwfReturn });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getComplianceStatus(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { month, year } = req.query;
    const status = await statutoryService.getComplianceStatus(
      tenantId, parseInt(month as string), parseInt(year as string)
    );
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getComplianceHistory(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { financialYear, complianceType } = req.query;
    const history = await statutoryService.getComplianceHistory(
      tenantId, financialYear as string, complianceType as any
    );
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function calculatePFContributions(req: Request, res: Response) {
  try {
    const { basicSalary, pfPercentage, maxPfBasis } = req.body;
    const contributions = await statutoryService.calculatePFContributions(basicSalary, pfPercentage, maxPfBasis);
    res.json({ success: true, data: contributions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function calculateESIContributions(req: Request, res: Response) {
  try {
    const { grossSalary } = req.body;
    const contributions = await statutoryService.calculateESIContributions(grossSalary);
    res.json({ success: true, data: contributions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function calculateProfessionalTax(req: Request, res: Response) {
  try {
    const { state, grossSalary } = req.body;
    const tax = await statutoryService.calculateProfessionalTax(state, grossSalary);
    res.json({ success: true, data: { professionalTax: tax } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== EMPLOYEE SELF-SERVICE CONTROLLERS ====================

export async function getEmployeePayrollDashboard(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const dashboard = await essService.getEmployeePayrollDashboard(tenantId, employeeId);
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeeSalaryHistory(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const { fromYear, toYear } = req.query;
    const history = await essService.getEmployeeSalaryHistory(
      tenantId,
      employeeId,
      fromYear ? parseInt(fromYear as string) : undefined,
      toYear ? parseInt(toYear as string) : undefined
    );
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeeTaxSummary(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const { financialYear } = req.query;
    const summary = await essService.getEmployeeTaxSummary(tenantId, employeeId, financialYear as string);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeeLoanSummary(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const summary = await essService.getEmployeeLoanSummary(tenantId, employeeId);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeeReimbursementSummary(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const { financialYear } = req.query;
    const summary = await essService.getEmployeeReimbursementSummary(
      tenantId, employeeId, financialYear as string | undefined
    );
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeeCompensationBreakdown(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const { month, year } = req.query;
    const breakdown = await essService.getEmployeeCompensationBreakdown(
      tenantId, employeeId, parseInt(month as string), parseInt(year as string)
    );
    res.json({ success: true, data: breakdown });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeePayrollDocuments(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const documents = await essService.getEmployeePayrollDocuments(tenantId, employeeId);
    res.json({ success: true, data: documents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeePayrollNotifications(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const notifications = await essService.getEmployeePayrollNotifications(tenantId, employeeId);
    res.json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getInvestmentProofStatus(req: Request, res: Response) {
  try {
    const { tenantId, employeeId } = req.params;
    const { financialYear } = req.query;
    const status = await essService.getInvestmentProofStatus(tenantId, employeeId, financialYear as string);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
