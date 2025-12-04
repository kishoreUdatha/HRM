import {
  OvertimePolicy, IOvertimePolicy,
  ShiftAllowance, IShiftAllowance,
  OvertimeEntry, IOvertimeEntry,
  ShiftAssignment, IShiftAssignment
} from '../models/Overtime';
import { createAuditLog } from './auditService';

// ==================== OVERTIME POLICY ====================

export async function createOvertimePolicy(
  tenantId: string,
  data: Partial<IOvertimePolicy>
): Promise<IOvertimePolicy> {
  const policy = new OvertimePolicy({ tenantId, ...data });
  await policy.save();
  return policy;
}

export async function getOvertimePolicies(tenantId: string): Promise<IOvertimePolicy[]> {
  return OvertimePolicy.find({ tenantId, isActive: true }).lean();
}

export async function updateOvertimePolicy(
  policyId: string,
  updates: Partial<IOvertimePolicy>
): Promise<IOvertimePolicy | null> {
  return OvertimePolicy.findByIdAndUpdate(policyId, updates, { new: true });
}

// ==================== SHIFT ALLOWANCE ====================

export async function createShiftAllowance(
  tenantId: string,
  data: Partial<IShiftAllowance>
): Promise<IShiftAllowance> {
  const shift = new ShiftAllowance({ tenantId, ...data });
  await shift.save();
  return shift;
}

export async function getShiftAllowances(tenantId: string): Promise<IShiftAllowance[]> {
  return ShiftAllowance.find({ tenantId, isActive: true }).lean();
}

export async function assignShiftToEmployee(
  tenantId: string,
  employeeId: string,
  shiftAllowanceId: string,
  effectiveFrom: Date
): Promise<IShiftAssignment> {
  // Deactivate existing assignments
  await ShiftAssignment.updateMany(
    { tenantId, employeeId, isActive: true },
    { isActive: false, effectiveTo: new Date() }
  );

  const assignment = new ShiftAssignment({
    tenantId,
    employeeId,
    shiftAllowanceId,
    effectiveFrom,
    isActive: true
  });
  await assignment.save();
  return assignment;
}

export async function getEmployeeShiftAssignment(
  tenantId: string,
  employeeId: string
): Promise<IShiftAssignment | null> {
  return ShiftAssignment.findOne({ tenantId, employeeId, isActive: true }).lean();
}

// ==================== OVERTIME ENTRY ====================

export async function createOvertimeEntry(
  tenantId: string,
  employeeId: string,
  data: {
    date: Date;
    overtimeHours: number;
    overtimeType: IOvertimeEntry['overtimeType'];
    remarks?: string;
  },
  hourlyRate: number,
  overtimeMultiplier: number
): Promise<IOvertimeEntry> {
  const rate = hourlyRate * overtimeMultiplier;
  const amount = data.overtimeHours * rate;

  const entry = new OvertimeEntry({
    tenantId,
    employeeId,
    ...data,
    rate,
    amount,
    status: 'pending'
  });

  await entry.save();
  return entry;
}

export async function bulkCreateOvertimeEntries(
  tenantId: string,
  entries: Array<{
    employeeId: string;
    date: Date;
    overtimeHours: number;
    overtimeType: IOvertimeEntry['overtimeType'];
    hourlyRate: number;
    overtimeMultiplier: number;
  }>
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const rate = entry.hourlyRate * entry.overtimeMultiplier;
      const amount = entry.overtimeHours * rate;

      await OvertimeEntry.create({
        tenantId,
        employeeId: entry.employeeId,
        date: entry.date,
        overtimeHours: entry.overtimeHours,
        overtimeType: entry.overtimeType,
        rate,
        amount,
        status: 'pending'
      });
      created++;
    } catch {
      failed++;
    }
  }

  return { created, failed };
}

export async function approveOvertimeEntry(
  entryId: string,
  approverId: string,
  approved: boolean,
  rejectionReason?: string
): Promise<IOvertimeEntry | null> {
  const entry = await OvertimeEntry.findById(entryId);
  if (!entry) return null;

  entry.status = approved ? 'approved' : 'rejected';
  entry.approvedBy = approverId;
  entry.approvedAt = new Date();
  if (!approved && rejectionReason) {
    entry.rejectionReason = rejectionReason;
  }

  await entry.save();

  await createAuditLog({
    tenantId: entry.tenantId,
    entityType: 'payroll',
    entityId: entryId,
    action: approved ? 'approve' : 'reject',
    performedBy: approverId,
    metadata: {
      employeeId: entry.employeeId,
      amount: entry.amount
    }
  });

  return entry;
}

export async function getEmployeeOvertimeEntries(
  tenantId: string,
  employeeId: string,
  month?: number,
  year?: number
): Promise<IOvertimeEntry[]> {
  const query: any = { tenantId, employeeId };

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    query.date = { $gte: startDate, $lte: endDate };
  }

  return OvertimeEntry.find(query).sort({ date: -1 }).lean();
}

export async function getPendingOvertimeApprovals(tenantId: string): Promise<IOvertimeEntry[]> {
  return OvertimeEntry.find({ tenantId, status: 'pending' }).sort({ date: 1 }).lean();
}

export async function getApprovedOvertimeForPayroll(
  tenantId: string,
  employeeId: string,
  month: number,
  year: number
): Promise<{ totalHours: number; totalAmount: number; entries: IOvertimeEntry[] }> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const entries = await OvertimeEntry.find({
    tenantId,
    employeeId,
    status: 'approved',
    date: { $gte: startDate, $lte: endDate }
  }).lean();

  const totalHours = entries.reduce((sum, e) => sum + e.overtimeHours, 0);
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

  return { totalHours, totalAmount, entries };
}

export async function markOvertimeAsPaid(
  entryIds: string[],
  payrollId: string
): Promise<void> {
  await OvertimeEntry.updateMany(
    { _id: { $in: entryIds } },
    { status: 'paid', payrollId }
  );
}

export async function calculateShiftAllowance(
  tenantId: string,
  employeeId: string,
  month: number,
  year: number,
  basicSalary: number,
  workingDays: number
): Promise<{ shiftName: string; allowanceAmount: number } | null> {
  const assignment = await ShiftAssignment.findOne({
    tenantId,
    employeeId,
    isActive: true,
    effectiveFrom: { $lte: new Date(year, month - 1, 1) }
  });

  if (!assignment) return null;

  const shift = await ShiftAllowance.findById(assignment.shiftAllowanceId);
  if (!shift || !shift.isActive) return null;

  let allowanceAmount = 0;

  switch (shift.allowanceType) {
    case 'fixed':
      allowanceAmount = shift.allowanceValue;
      break;
    case 'percentage_of_basic':
      allowanceAmount = basicSalary * (shift.allowanceValue / 100);
      break;
    case 'per_hour':
      // Assuming 8 hours per day
      allowanceAmount = shift.allowanceValue * 8 * workingDays;
      break;
  }

  return { shiftName: shift.name, allowanceAmount: Math.round(allowanceAmount) };
}

export async function getOvertimeSummary(
  tenantId: string,
  month: number,
  year: number
): Promise<{
  totalEntries: number;
  totalHours: number;
  totalAmount: number;
  pendingApprovals: number;
  approvedEntries: number;
  paidEntries: number;
  typeBreakdown: Record<string, { hours: number; amount: number }>;
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const entries = await OvertimeEntry.find({
    tenantId,
    date: { $gte: startDate, $lte: endDate }
  }).lean();

  const typeBreakdown: Record<string, { hours: number; amount: number }> = {};

  entries.forEach(e => {
    if (!typeBreakdown[e.overtimeType]) {
      typeBreakdown[e.overtimeType] = { hours: 0, amount: 0 };
    }
    typeBreakdown[e.overtimeType].hours += e.overtimeHours;
    typeBreakdown[e.overtimeType].amount += e.amount;
  });

  return {
    totalEntries: entries.length,
    totalHours: entries.reduce((sum, e) => sum + e.overtimeHours, 0),
    totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
    pendingApprovals: entries.filter(e => e.status === 'pending').length,
    approvedEntries: entries.filter(e => e.status === 'approved').length,
    paidEntries: entries.filter(e => e.status === 'paid').length,
    typeBreakdown
  };
}
