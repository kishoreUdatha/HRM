import { Request, Response } from 'express';
import * as salaryRevisionService from '../services/salaryRevisionService';
import * as loanService from '../services/loanService';
import * as reimbursementService from '../services/reimbursementService';
import * as bonusService from '../services/bonusService';
import * as auditService from '../services/auditService';
import * as currencyService from '../services/currencyService';
import * as reportService from '../services/reportService';

// ==================== SALARY REVISION ====================

export const createSalaryRevision = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    const revision = await salaryRevisionService.createSalaryRevision(tenantId, employeeId, {
      ...req.body,
      createdBy: userId
    });

    res.status(201).json({ success: true, data: revision });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create salary revision', error });
  }
};

export const approveSalaryRevision = async (req: Request, res: Response) => {
  try {
    const { revisionId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { approved, rejectionReason } = req.body;

    const revision = await salaryRevisionService.approveSalaryRevision(revisionId, userId, approved, rejectionReason);
    if (!revision) {
      return res.status(404).json({ success: false, message: 'Revision not found' });
    }

    res.json({ success: true, data: revision });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve salary revision', error });
  }
};

export const getSalaryRevisionHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const history = await salaryRevisionService.getSalaryRevisionHistory(tenantId, employeeId);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get salary revision history', error });
  }
};

export const getPendingRevisions = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const revisions = await salaryRevisionService.getPendingRevisions(tenantId);
    res.json({ success: true, data: revisions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get pending revisions', error });
  }
};

export const generateRevisionLetter = async (req: Request, res: Response) => {
  try {
    const { revisionId } = req.params;
    const { companyDetails, employeeName } = req.body;

    const revision = await salaryRevisionService.getSalaryRevisionHistory('', '');
    // Find specific revision - simplified for demo
    const revisionData = revision.find(r => r._id.toString() === revisionId);
    if (!revisionData) {
      return res.status(404).json({ success: false, message: 'Revision not found' });
    }

    const pdfBuffer = await salaryRevisionService.generateRevisionLetter(revisionData, companyDetails, employeeName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=revision_letter_${revisionId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate revision letter', error });
  }
};

// ==================== LOAN MANAGEMENT ====================

export const applyForLoan = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    const loan = await loanService.applyForLoan(tenantId, employeeId, {
      ...req.body,
      appliedBy: userId
    });

    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to apply for loan', error });
  }
};

export const approveLoan = async (req: Request, res: Response) => {
  try {
    const { loanId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { approved, comments } = req.body;

    const loan = await loanService.approveLoan(loanId, userId, approved, comments);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve loan', error });
  }
};

export const disburseLoan = async (req: Request, res: Response) => {
  try {
    const { loanId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { disbursementDate } = req.body;

    const loan = await loanService.disburseLoan(loanId, userId, disbursementDate ? new Date(disbursementDate) : undefined);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found or not approved' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to disburse loan', error });
  }
};

export const getEmployeeLoans = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const { status } = req.query;

    const loans = await loanService.getEmployeeLoans(tenantId, employeeId, status as any);
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get employee loans', error });
  }
};

export const getLoanDetails = async (req: Request, res: Response) => {
  try {
    const { loanId } = req.params;
    const loan = await loanService.getLoanDetails(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get loan details', error });
  }
};

export const foreCloseLoan = async (req: Request, res: Response) => {
  try {
    const { loanId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { foreclosureAmount } = req.body;

    const loan = await loanService.foreCloseLoan(loanId, userId, foreclosureAmount);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found or not active' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to foreclose loan', error });
  }
};

export const getPendingLoanApprovals = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const loans = await loanService.getPendingLoanApprovals(tenantId);
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get pending loan approvals', error });
  }
};

export const getLoanSummary = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const summary = await loanService.getLoanSummary(tenantId);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get loan summary', error });
  }
};

// ==================== REIMBURSEMENT ====================

export const createReimbursement = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    const reimbursement = await reimbursementService.createReimbursement(tenantId, employeeId, {
      ...req.body,
      createdBy: userId
    });

    res.status(201).json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create reimbursement', error });
  }
};

export const submitReimbursement = async (req: Request, res: Response) => {
  try {
    const { reimbursementId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    const reimbursement = await reimbursementService.submitReimbursement(reimbursementId, userId);
    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit reimbursement', error });
  }
};

export const approveReimbursement = async (req: Request, res: Response) => {
  try {
    const { reimbursementId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    const reimbursement = await reimbursementService.approveReimbursement(reimbursementId, userId, req.body);
    if (!reimbursement) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    res.json({ success: true, data: reimbursement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve reimbursement', error });
  }
};

export const getEmployeeReimbursements = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const reimbursements = await reimbursementService.getEmployeeReimbursements(tenantId, employeeId, req.query as any);
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get reimbursements', error });
  }
};

export const getPendingReimbursementApprovals = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const reimbursements = await reimbursementService.getPendingApprovals(tenantId);
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get pending approvals', error });
  }
};

export const getReimbursementSummary = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate } = req.query;

    const period = startDate && endDate ? {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    } : undefined;

    const summary = await reimbursementService.getReimbursementSummary(tenantId, period);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get reimbursement summary', error });
  }
};

// ==================== BONUS ====================

export const createBonus = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const bonus = await bonusService.createBonus(tenantId, {
      ...req.body,
      createdBy: userId
    });

    res.status(201).json({ success: true, data: bonus });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create bonus', error });
  }
};

export const calculateBonus = async (req: Request, res: Response) => {
  try {
    const { bonusId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { employees } = req.body;

    const bonus = await bonusService.calculateBonusForEmployees(bonusId, employees, userId);
    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' });
    }

    res.json({ success: true, data: bonus });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate bonus', error });
  }
};

export const approveBonus = async (req: Request, res: Response) => {
  try {
    const { bonusId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { approved, comments } = req.body;

    const bonus = await bonusService.approveBonus(bonusId, userId, approved, comments);
    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' });
    }

    res.json({ success: true, data: bonus });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve bonus', error });
  }
};

export const getBonusList = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const bonuses = await bonusService.getBonusList(tenantId, req.query as any);
    res.json({ success: true, data: bonuses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get bonus list', error });
  }
};

export const getBonusDetails = async (req: Request, res: Response) => {
  try {
    const { bonusId } = req.params;
    const bonus = await bonusService.getBonusDetails(bonusId);
    if (!bonus) {
      return res.status(404).json({ success: false, message: 'Bonus not found' });
    }
    res.json({ success: true, data: bonus });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get bonus details', error });
  }
};

export const getEmployeeBonusHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const { financialYear } = req.query;

    const history = await bonusService.getEmployeeBonusHistory(tenantId, employeeId, financialYear as string);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get bonus history', error });
  }
};

// ==================== AUDIT ====================

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { entityType, entityId, action, performedBy, employeeId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const result = await auditService.getAuditLogs(tenantId, {
      entityType: entityType as any,
      entityId: entityId as string,
      action: action as any,
      performedBy: performedBy as string,
      employeeId: employeeId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    }, { page: +page, limit: +limit });

    res.json({
      success: true,
      data: result.logs,
      pagination: { page: +page, limit: +limit, total: result.total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get audit logs', error });
  }
};

export const getEntityAuditTrail = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { entityType, entityId } = req.params;

    const trail = await auditService.getEntityAuditTrail(tenantId, entityType as any, entityId);
    res.json({ success: true, data: trail });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get audit trail', error });
  }
};

export const getAuditSummary = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate } = req.query;

    const summary = await auditService.getAuditSummary(
      tenantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get audit summary', error });
  }
};

// ==================== CURRENCY ====================

export const setupCurrency = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const currency = await currencyService.setupCurrency(tenantId, req.body);
    res.status(201).json({ success: true, data: currency });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to setup currency', error });
  }
};

export const addExchangeRate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { currencyCode } = req.params;

    const currency = await currencyService.addExchangeRate(tenantId, currencyCode, req.body);
    if (!currency) {
      return res.status(404).json({ success: false, message: 'Currency not found' });
    }

    res.json({ success: true, data: currency });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add exchange rate', error });
  }
};

export const getCurrencyList = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const currencies = await currencyService.getCurrencyList(tenantId);
    res.json({ success: true, data: currencies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get currencies', error });
  }
};

export const convertCurrency = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { amount, fromCurrency, toCurrency, date } = req.body;

    const result = await currencyService.convertAmount(tenantId, amount, fromCurrency, toCurrency, date ? new Date(date) : undefined);
    if (!result) {
      return res.status(400).json({ success: false, message: 'Exchange rate not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to convert currency', error });
  }
};

export const setupEmployeeCurrency = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const employeeCurrency = await currencyService.setupEmployeeCurrency(tenantId, employeeId, req.body);
    res.json({ success: true, data: employeeCurrency });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to setup employee currency', error });
  }
};

// ==================== REPORTS ====================

export const getPayrollSummaryReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { month, year } = req.params;

    const report = await reportService.generatePayrollSummaryReport(tenantId, +month, +year);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate payroll summary', error });
  }
};

export const getCostCenterReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate, costCenterMapping } = req.body;

    const report = await reportService.generateCostCenterReport(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      costCenterMapping
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate cost center report', error });
  }
};

export const getTrendAnalysisReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { months = 12 } = req.query;

    const report = await reportService.generateTrendAnalysisReport(tenantId, +months);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate trend analysis', error });
  }
};

export const getComplianceReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { month, year } = req.params;

    const report = await reportService.generateComplianceReport(tenantId, +month, +year);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate compliance report', error });
  }
};

export const getEmployeePayrollReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, financialYear } = req.params;

    const report = await reportService.generateEmployeePayrollReport(tenantId, employeeId, financialYear);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate employee payroll report', error });
  }
};

export const getVarianceReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { month1, year1, month2, year2 } = req.query;

    const report = await reportService.generateVarianceReport(
      tenantId,
      { month: +(month1 as string), year: +(year1 as string) },
      { month: +(month2 as string), year: +(year2 as string) }
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate variance report', error });
  }
};
