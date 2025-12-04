import {
  LeaveEncashmentPolicy, ILeaveEncashmentPolicy,
  LeaveEncashment, ILeaveEncashment
} from '../models/LeaveEncashment';
import { createAuditLog } from './auditService';

function generateEncashmentNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LEC-${timestamp}-${random}`;
}

// ==================== LEAVE ENCASHMENT POLICY ====================

export async function createLeaveEncashmentPolicy(
  tenantId: string,
  data: Partial<ILeaveEncashmentPolicy>
): Promise<ILeaveEncashmentPolicy> {
  const policy = new LeaveEncashmentPolicy({ tenantId, ...data });
  await policy.save();
  return policy;
}

export async function getLeaveEncashmentPolicies(tenantId: string): Promise<ILeaveEncashmentPolicy[]> {
  return LeaveEncashmentPolicy.find({ tenantId, isActive: true }).lean();
}

export async function updateLeaveEncashmentPolicy(
  policyId: string,
  updates: Partial<ILeaveEncashmentPolicy>
): Promise<ILeaveEncashmentPolicy | null> {
  return LeaveEncashmentPolicy.findByIdAndUpdate(policyId, updates, { new: true });
}

// ==================== LEAVE ENCASHMENT ====================

export async function applyForLeaveEncashment(
  tenantId: string,
  employeeId: string,
  data: {
    leaveType: string;
    daysToEncash: number;
    currentLeaveBalance: number;
    salaryDetails: {
      basic: number;
      gross: number;
      ctc: number;
    };
    calculationBasis: 'basic' | 'gross' | 'ctc';
    reason: ILeaveEncashment['reason'];
    financialYear: string;
  }
): Promise<ILeaveEncashment> {
  // Get basis amount
  let basisAmount = data.salaryDetails.basic;
  if (data.calculationBasis === 'gross') basisAmount = data.salaryDetails.gross;
  if (data.calculationBasis === 'ctc') basisAmount = data.salaryDetails.ctc;

  // Calculate per day rate (assuming 30 days per month)
  const perDayRate = Math.round(basisAmount / 30);
  const grossAmount = perDayRate * data.daysToEncash;

  // Calculate tax (simplified - 30% for high earners)
  const taxAmount = Math.round(grossAmount * 0.3);
  const netAmount = grossAmount - taxAmount;

  const encashment = new LeaveEncashment({
    tenantId,
    employeeId,
    encashmentNumber: generateEncashmentNumber(),
    leaveType: data.leaveType,
    daysEncashed: data.daysToEncash,
    perDayRate,
    grossAmount,
    taxAmount,
    netAmount,
    calculationBasis: data.calculationBasis,
    basisAmount,
    leaveBalanceBefore: data.currentLeaveBalance,
    leaveBalanceAfter: data.currentLeaveBalance - data.daysToEncash,
    reason: data.reason,
    financialYear: data.financialYear,
    status: 'pending',
    appliedAt: new Date()
  });

  await encashment.save();

  await createAuditLog({
    tenantId,
    entityType: 'payroll',
    entityId: encashment._id.toString(),
    action: 'create',
    performedBy: employeeId,
    metadata: {
      employeeId,
      amount: grossAmount
    }
  });

  return encashment;
}

export async function approveLeaveEncashment(
  encashmentId: string,
  approverId: string,
  approved: boolean,
  rejectionReason?: string
): Promise<ILeaveEncashment | null> {
  const encashment = await LeaveEncashment.findById(encashmentId);
  if (!encashment) return null;

  encashment.status = approved ? 'approved' : 'rejected';
  encashment.approvedBy = approverId;
  encashment.approvedAt = new Date();
  if (!approved && rejectionReason) {
    encashment.rejectionReason = rejectionReason;
  }

  await encashment.save();

  await createAuditLog({
    tenantId: encashment.tenantId,
    entityType: 'payroll',
    entityId: encashmentId,
    action: approved ? 'approve' : 'reject',
    performedBy: approverId,
    metadata: {
      employeeId: encashment.employeeId,
      amount: encashment.grossAmount
    }
  });

  return encashment;
}

export async function markLeaveEncashmentAsPaid(
  encashmentId: string,
  payrollId: string
): Promise<ILeaveEncashment | null> {
  return LeaveEncashment.findByIdAndUpdate(
    encashmentId,
    {
      status: 'paid',
      paidInPayrollId: payrollId,
      paidAt: new Date()
    },
    { new: true }
  );
}

export async function getEmployeeLeaveEncashments(
  tenantId: string,
  employeeId: string,
  financialYear?: string
): Promise<ILeaveEncashment[]> {
  const query: any = { tenantId, employeeId };
  if (financialYear) query.financialYear = financialYear;

  return LeaveEncashment.find(query).sort({ appliedAt: -1 }).lean();
}

export async function getPendingLeaveEncashmentApprovals(tenantId: string): Promise<ILeaveEncashment[]> {
  return LeaveEncashment.find({ tenantId, status: 'pending' }).sort({ appliedAt: 1 }).lean();
}

export async function getApprovedEncashmentsForPayroll(
  tenantId: string,
  employeeId?: string
): Promise<ILeaveEncashment[]> {
  const query: any = { tenantId, status: 'approved' };
  if (employeeId) query.employeeId = employeeId;

  return LeaveEncashment.find(query).lean();
}

export async function calculateEncashmentAmount(
  daysToEncash: number,
  salaryBasis: number,
  taxRate: number = 0.3
): Promise<{
  perDayRate: number;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
}> {
  const perDayRate = Math.round(salaryBasis / 30);
  const grossAmount = perDayRate * daysToEncash;
  const taxAmount = Math.round(grossAmount * taxRate);
  const netAmount = grossAmount - taxAmount;

  return { perDayRate, grossAmount, taxAmount, netAmount };
}

export async function getLeaveEncashmentSummary(
  tenantId: string,
  financialYear: string
): Promise<{
  totalEncashments: number;
  totalDaysEncashed: number;
  totalGrossAmount: number;
  totalTaxAmount: number;
  totalNetAmount: number;
  statusBreakdown: Record<string, number>;
  leaveTypeBreakdown: Record<string, { days: number; amount: number }>;
}> {
  const encashments = await LeaveEncashment.find({ tenantId, financialYear }).lean();

  const statusBreakdown: Record<string, number> = {};
  const leaveTypeBreakdown: Record<string, { days: number; amount: number }> = {};

  encashments.forEach(e => {
    statusBreakdown[e.status] = (statusBreakdown[e.status] || 0) + 1;

    if (!leaveTypeBreakdown[e.leaveType]) {
      leaveTypeBreakdown[e.leaveType] = { days: 0, amount: 0 };
    }
    leaveTypeBreakdown[e.leaveType].days += e.daysEncashed;
    leaveTypeBreakdown[e.leaveType].amount += e.grossAmount;
  });

  return {
    totalEncashments: encashments.length,
    totalDaysEncashed: encashments.reduce((sum, e) => sum + e.daysEncashed, 0),
    totalGrossAmount: encashments.reduce((sum, e) => sum + e.grossAmount, 0),
    totalTaxAmount: encashments.reduce((sum, e) => sum + e.taxAmount, 0),
    totalNetAmount: encashments.reduce((sum, e) => sum + e.netAmount, 0),
    statusBreakdown,
    leaveTypeBreakdown
  };
}

export async function cancelLeaveEncashment(
  encashmentId: string,
  cancelledBy: string
): Promise<ILeaveEncashment | null> {
  const encashment = await LeaveEncashment.findById(encashmentId);
  if (!encashment) return null;

  if (encashment.status === 'paid') {
    throw new Error('Cannot cancel a paid leave encashment');
  }

  encashment.status = 'cancelled';
  await encashment.save();

  await createAuditLog({
    tenantId: encashment.tenantId,
    entityType: 'payroll',
    entityId: encashmentId,
    action: 'cancel',
    performedBy: cancelledBy,
    metadata: {
      employeeId: encashment.employeeId
    }
  });

  return encashment;
}

export async function getYearlyEncashmentForEmployee(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<{ totalDays: number; totalAmount: number }> {
  const encashments = await LeaveEncashment.find({
    tenantId,
    employeeId,
    financialYear,
    status: { $in: ['approved', 'paid'] }
  }).lean();

  return {
    totalDays: encashments.reduce((sum, e) => sum + e.daysEncashed, 0),
    totalAmount: encashments.reduce((sum, e) => sum + e.grossAmount, 0)
  };
}
