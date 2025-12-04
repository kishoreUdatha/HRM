import Arrear, { IArrear, IArrearComponent } from '../models/Arrear';
import { createAuditLog } from './auditService';

function generateArrearNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ARR-${timestamp}-${random}`;
}

export async function calculateArrear(
  tenantId: string,
  employeeId: string,
  data: {
    arrearType: IArrear['arrearType'];
    reason: string;
    referenceId?: string;
    referenceType?: string;
    period: {
      fromMonth: number;
      fromYear: number;
      toMonth: number;
      toYear: number;
    };
    originalComponents: Array<{ code: string; name: string; type: 'earning' | 'deduction'; amount: number }>;
    revisedComponents: Array<{ code: string; name: string; type: 'earning' | 'deduction'; amount: number }>;
    taxRate?: number;
    createdBy: string;
  }
): Promise<IArrear> {
  // Calculate months count
  const fromDate = new Date(data.period.fromYear, data.period.fromMonth - 1, 1);
  const toDate = new Date(data.period.toYear, data.period.toMonth - 1, 1);
  const monthsCount = (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (toDate.getMonth() - fromDate.getMonth()) + 1;

  // Calculate component differences
  const components: IArrearComponent[] = [];
  const componentMap = new Map<string, IArrearComponent>();

  // Process original components
  for (const comp of data.originalComponents) {
    componentMap.set(comp.code, {
      code: comp.code,
      name: comp.name,
      type: comp.type,
      originalAmount: comp.amount,
      revisedAmount: 0,
      differenceAmount: -comp.amount
    });
  }

  // Process revised components
  for (const comp of data.revisedComponents) {
    if (componentMap.has(comp.code)) {
      const existing = componentMap.get(comp.code)!;
      existing.revisedAmount = comp.amount;
      existing.differenceAmount = comp.amount - existing.originalAmount;
    } else {
      componentMap.set(comp.code, {
        code: comp.code,
        name: comp.name,
        type: comp.type,
        originalAmount: 0,
        revisedAmount: comp.amount,
        differenceAmount: comp.amount
      });
    }
  }

  componentMap.forEach(comp => components.push(comp));

  // Calculate totals
  const totalOriginalAmount = data.originalComponents
    .filter(c => c.type === 'earning')
    .reduce((sum, c) => sum + c.amount, 0) -
    data.originalComponents
    .filter(c => c.type === 'deduction')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalRevisedAmount = data.revisedComponents
    .filter(c => c.type === 'earning')
    .reduce((sum, c) => sum + c.amount, 0) -
    data.revisedComponents
    .filter(c => c.type === 'deduction')
    .reduce((sum, c) => sum + c.amount, 0);

  const grossArrearAmount = (totalRevisedAmount - totalOriginalAmount) * monthsCount;
  const taxRate = data.taxRate || 0.3;
  const taxOnArrear = Math.round(grossArrearAmount * taxRate);
  const netArrearAmount = grossArrearAmount - taxOnArrear;

  // Create monthly breakdown
  const monthlyBreakdown: IArrear['monthlyBreakdown'] = [];
  let currentDate = new Date(fromDate);
  while (currentDate <= toDate) {
    monthlyBreakdown.push({
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      originalGross: totalOriginalAmount,
      revisedGross: totalRevisedAmount,
      difference: totalRevisedAmount - totalOriginalAmount
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  const arrear = new Arrear({
    tenantId,
    employeeId,
    arrearNumber: generateArrearNumber(),
    arrearType: data.arrearType,
    reason: data.reason,
    referenceId: data.referenceId,
    referenceType: data.referenceType,
    period: { ...data.period, monthsCount },
    components,
    calculation: {
      totalOriginalAmount: totalOriginalAmount * monthsCount,
      totalRevisedAmount: totalRevisedAmount * monthsCount,
      grossArrearAmount,
      taxOnArrear,
      netArrearAmount
    },
    monthlyBreakdown,
    status: 'calculated',
    createdBy: data.createdBy
  });

  await arrear.save();

  await createAuditLog({
    tenantId,
    entityType: 'payroll',
    entityId: arrear._id.toString(),
    action: 'create',
    performedBy: data.createdBy,
    metadata: {
      employeeId,
      amount: grossArrearAmount
    }
  });

  return arrear;
}

export async function approveArrear(
  arrearId: string,
  approverId: string,
  approved: boolean,
  remarks?: string
): Promise<IArrear | null> {
  const arrear = await Arrear.findById(arrearId);
  if (!arrear) return null;

  arrear.status = approved ? 'approved' : 'cancelled';
  arrear.approvedBy = approverId;
  arrear.approvedAt = new Date();
  if (remarks) arrear.remarks = remarks;

  await arrear.save();

  await createAuditLog({
    tenantId: arrear.tenantId,
    entityType: 'payroll',
    entityId: arrearId,
    action: approved ? 'approve' : 'reject',
    performedBy: approverId,
    metadata: {
      employeeId: arrear.employeeId,
      amount: arrear.calculation.grossArrearAmount
    }
  });

  return arrear;
}

export async function processArrearInPayroll(
  arrearId: string,
  payrollId: string,
  month: number,
  year: number
): Promise<IArrear | null> {
  return Arrear.findByIdAndUpdate(
    arrearId,
    {
      status: 'processed',
      processedInPayrollId: payrollId,
      processedInMonth: month,
      processedInYear: year
    },
    { new: true }
  );
}

export async function markArrearAsPaid(arrearId: string): Promise<IArrear | null> {
  return Arrear.findByIdAndUpdate(
    arrearId,
    { status: 'paid', paidAt: new Date() },
    { new: true }
  );
}

export async function getEmployeeArrears(
  tenantId: string,
  employeeId: string,
  status?: IArrear['status']
): Promise<IArrear[]> {
  const query: any = { tenantId, employeeId };
  if (status) query.status = status;

  return Arrear.find(query).sort({ createdAt: -1 }).lean() as any;
}

export async function getPendingArrearsForPayroll(
  tenantId: string,
  employeeId?: string
): Promise<IArrear[]> {
  const query: any = { tenantId, status: 'approved' };
  if (employeeId) query.employeeId = employeeId;

  return Arrear.find(query).lean() as any;
}

export async function getArrearDetails(arrearId: string): Promise<IArrear | null> {
  return Arrear.findById(arrearId).lean() as any;
}

export async function getPendingArrearApprovals(tenantId: string): Promise<IArrear[]> {
  return Arrear.find({ tenantId, status: 'calculated' }).sort({ createdAt: 1 }).lean() as any;
}

export async function bulkCalculateArrears(
  tenantId: string,
  employees: Array<{
    employeeId: string;
    originalComponents: Array<{ code: string; name: string; type: 'earning' | 'deduction'; amount: number }>;
    revisedComponents: Array<{ code: string; name: string; type: 'earning' | 'deduction'; amount: number }>;
  }>,
  arrearType: IArrear['arrearType'],
  reason: string,
  period: IArrear['period'],
  createdBy: string
): Promise<{ success: number; failed: number; arrears: IArrear[] }> {
  const arrears: IArrear[] = [];
  let success = 0;
  let failed = 0;

  for (const emp of employees) {
    try {
      const arrear = await calculateArrear(tenantId, emp.employeeId, {
        arrearType,
        reason,
        period,
        originalComponents: emp.originalComponents,
        revisedComponents: emp.revisedComponents,
        createdBy
      });
      arrears.push(arrear);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed, arrears };
}

export async function getArrearSummary(
  tenantId: string,
  period?: { fromMonth: number; fromYear: number; toMonth: number; toYear: number }
): Promise<{
  totalArrears: number;
  totalGrossAmount: number;
  totalTaxAmount: number;
  totalNetAmount: number;
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, { count: number; amount: number }>;
}> {
  const query: any = { tenantId };
  if (period) {
    query['period.fromYear'] = { $gte: period.fromYear };
    query['period.toYear'] = { $lte: period.toYear };
  }

  const arrears = await Arrear.find(query).lean() as any[];

  const statusBreakdown: Record<string, number> = {};
  const typeBreakdown: Record<string, { count: number; amount: number }> = {};

  arrears.forEach(a => {
    statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1;

    if (!typeBreakdown[a.arrearType]) {
      typeBreakdown[a.arrearType] = { count: 0, amount: 0 };
    }
    typeBreakdown[a.arrearType].count += 1;
    typeBreakdown[a.arrearType].amount += a.calculation.grossArrearAmount;
  });

  return {
    totalArrears: arrears.length,
    totalGrossAmount: arrears.reduce((sum, a) => sum + a.calculation.grossArrearAmount, 0),
    totalTaxAmount: arrears.reduce((sum, a) => sum + a.calculation.taxOnArrear, 0),
    totalNetAmount: arrears.reduce((sum, a) => sum + a.calculation.netArrearAmount, 0),
    statusBreakdown,
    typeBreakdown
  };
}

export async function cancelArrear(
  arrearId: string,
  cancelledBy: string,
  reason?: string
): Promise<IArrear | null> {
  const arrear = await Arrear.findById(arrearId);
  if (!arrear) return null;

  if (['processed', 'paid'].includes(arrear.status)) {
    throw new Error('Cannot cancel processed or paid arrear');
  }

  arrear.status = 'cancelled';
  arrear.remarks = reason;
  await arrear.save();

  await createAuditLog({
    tenantId: arrear.tenantId,
    entityType: 'payroll',
    entityId: arrearId,
    action: 'cancel',
    performedBy: cancelledBy,
    metadata: {
      employeeId: arrear.employeeId,
      reason
    }
  });

  return arrear;
}
