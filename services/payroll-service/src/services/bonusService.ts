import Bonus, { IBonus, IBonusEligibility } from '../models/Bonus';
import { createAuditLog } from './auditService';

function generateBonusCode(bonusType: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const typeCode = bonusType.substring(0, 3).toUpperCase();
  return `BNS-${typeCode}-${timestamp}`;
}

export async function createBonus(
  tenantId: string,
  data: {
    bonusType: IBonus['bonusType'];
    name: string;
    description?: string;
    financialYear: string;
    applicablePeriod: { startDate: Date; endDate: Date };
    payoutDate: Date;
    calculationType: IBonus['calculationType'];
    calculationValue: number;
    eligibilityCriteria?: IBonus['eligibilityCriteria'];
    prorationRules?: IBonus['prorationRules'];
    taxable?: boolean;
    taxTreatment?: IBonus['taxTreatment'];
    exemptionLimit?: number;
    createdBy: string;
  }
): Promise<IBonus> {
  const bonus = new Bonus({
    tenantId,
    bonusCode: generateBonusCode(data.bonusType),
    ...data,
    status: 'draft'
  });

  await bonus.save();

  await createAuditLog({
    tenantId,
    entityType: 'bonus',
    entityId: bonus._id.toString(),
    action: 'create',
    performedBy: data.createdBy,
    newState: bonus.toObject()
  });

  return bonus;
}

export async function calculateBonusForEmployees(
  bonusId: string,
  employees: Array<{
    employeeId: string;
    employeeName: string;
    basicSalary: number;
    grossSalary: number;
    ctc: number;
    joiningDate: Date;
    department?: string;
    designation?: string;
    employmentType?: string;
    performanceRating?: number;
  }>,
  calculatedBy: string
): Promise<IBonus | null> {
  const bonus = await Bonus.findById(bonusId);
  if (!bonus) return null;

  bonus.status = 'calculating';
  await bonus.save();

  const eligibleEmployees: IBonusEligibility[] = [];
  let excludedCount = 0;

  const periodStart = new Date(bonus.applicablePeriod.startDate);
  const periodEnd = new Date(bonus.applicablePeriod.endDate);
  const periodMonths = (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
    (periodEnd.getMonth() - periodStart.getMonth()) + 1;

  for (const emp of employees) {
    // Check eligibility
    let eligible = true;
    let eligibilityReason = '';

    // Check minimum service
    if (bonus.eligibilityCriteria?.minServiceMonths) {
      const joiningDate = new Date(emp.joiningDate);
      const serviceMonths = (periodEnd.getFullYear() - joiningDate.getFullYear()) * 12 +
        (periodEnd.getMonth() - joiningDate.getMonth());

      if (serviceMonths < bonus.eligibilityCriteria.minServiceMonths) {
        eligible = false;
        eligibilityReason = `Minimum service of ${bonus.eligibilityCriteria.minServiceMonths} months not met`;
      }
    }

    // Check department
    if (eligible && bonus.eligibilityCriteria?.departments?.length && emp.department) {
      if (!bonus.eligibilityCriteria.departments.includes(emp.department)) {
        eligible = false;
        eligibilityReason = 'Department not eligible';
      }
    }

    // Check designation
    if (eligible && bonus.eligibilityCriteria?.designations?.length && emp.designation) {
      if (!bonus.eligibilityCriteria.designations.includes(emp.designation)) {
        eligible = false;
        eligibilityReason = 'Designation not eligible';
      }
    }

    // Check performance rating
    if (eligible && bonus.eligibilityCriteria?.performanceRatingMin && emp.performanceRating) {
      if (emp.performanceRating < bonus.eligibilityCriteria.performanceRatingMin) {
        eligible = false;
        eligibilityReason = 'Performance rating below threshold';
      }
    }

    // Calculate bonus amount
    let baseAmount = 0;
    switch (bonus.calculationType) {
      case 'fixed':
        baseAmount = bonus.calculationValue;
        break;
      case 'percentage_of_basic':
        baseAmount = emp.basicSalary * (bonus.calculationValue / 100);
        break;
      case 'percentage_of_gross':
        baseAmount = emp.grossSalary * (bonus.calculationValue / 100);
        break;
      case 'percentage_of_ctc':
        baseAmount = emp.ctc * (bonus.calculationValue / 100);
        break;
      case 'days_of_salary':
        baseAmount = (emp.grossSalary / 30) * bonus.calculationValue;
        break;
    }

    // Apply proration if applicable
    let multiplier = 1;
    if (bonus.prorationRules?.enabled && eligible) {
      const joiningDate = new Date(emp.joiningDate);
      if (joiningDate > periodStart) {
        const daysWorked = Math.ceil((periodEnd.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));

        if (bonus.prorationRules.prorationBasis === 'days') {
          multiplier = daysWorked / totalDays;
        } else {
          const monthsWorked = Math.ceil(daysWorked / 30);
          multiplier = monthsWorked / periodMonths;
        }

        if (daysWorked < (bonus.prorationRules.minDaysForEligibility || 0)) {
          eligible = false;
          eligibilityReason = 'Minimum days for proration eligibility not met';
        }
      }
    }

    const calculatedAmount = Math.round(baseAmount * multiplier);

    eligibleEmployees.push({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      eligible,
      eligibilityReason: eligible ? undefined : eligibilityReason,
      baseAmount: Math.round(baseAmount),
      multiplier: Math.round(multiplier * 100) / 100,
      calculatedAmount,
      adjustments: [],
      finalAmount: eligible ? calculatedAmount : 0,
      status: eligible ? 'pending' : 'excluded'
    });

    if (!eligible) excludedCount++;
  }

  bonus.employees = eligibleEmployees;

  // Calculate summary
  const eligibleEmps = eligibleEmployees.filter(e => e.eligible);
  const amounts = eligibleEmps.map(e => e.finalAmount);

  bonus.summary = {
    totalEligibleEmployees: eligibleEmps.length,
    totalExcludedEmployees: excludedCount,
    totalBonusAmount: amounts.reduce((sum, a) => sum + a, 0),
    averageBonusAmount: amounts.length > 0 ? Math.round(amounts.reduce((sum, a) => sum + a, 0) / amounts.length) : 0,
    minBonusAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
    maxBonusAmount: amounts.length > 0 ? Math.max(...amounts) : 0
  };

  bonus.status = 'calculated';
  await bonus.save();

  await createAuditLog({
    tenantId: bonus.tenantId,
    entityType: 'bonus',
    entityId: bonusId,
    action: 'process',
    performedBy: calculatedBy,
    newState: bonus.toObject(),
    metadata: {
      amount: bonus.summary.totalBonusAmount
    }
  });

  return bonus;
}

export async function adjustEmployeeBonus(
  bonusId: string,
  employeeId: string,
  adjustment: { type: string; reason: string; amount: number },
  adjustedBy: string
): Promise<IBonus | null> {
  const bonus = await Bonus.findById(bonusId);
  if (!bonus) return null;

  const employee = bonus.employees.find(e => e.employeeId === employeeId);
  if (!employee) return null;

  employee.adjustments.push(adjustment);
  employee.finalAmount = employee.calculatedAmount + employee.adjustments.reduce((sum, a) => sum + a.amount, 0);

  // Recalculate summary
  const eligibleEmps = bonus.employees.filter(e => e.eligible);
  const amounts = eligibleEmps.map(e => e.finalAmount);

  bonus.summary.totalBonusAmount = amounts.reduce((sum, a) => sum + a, 0);
  bonus.summary.averageBonusAmount = amounts.length > 0 ? Math.round(bonus.summary.totalBonusAmount / amounts.length) : 0;
  bonus.summary.minBonusAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
  bonus.summary.maxBonusAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

  await bonus.save();

  await createAuditLog({
    tenantId: bonus.tenantId,
    entityType: 'bonus',
    entityId: bonusId,
    action: 'update',
    performedBy: adjustedBy,
    metadata: {
      employeeId,
      amount: adjustment.amount,
      reason: adjustment.reason
    }
  });

  return bonus;
}

export async function approveBonus(
  bonusId: string,
  approverId: string,
  approved: boolean,
  comments?: string
): Promise<IBonus | null> {
  const bonus = await Bonus.findById(bonusId);
  if (!bonus) return null;

  const previousState = bonus.toObject();

  if (approved) {
    bonus.status = 'approved';
    bonus.approvedBy = approverId;
    bonus.approvedAt = new Date();

    bonus.employees.forEach(emp => {
      if (emp.status === 'pending') {
        emp.status = 'approved';
      }
    });
  } else {
    bonus.status = 'cancelled';
  }

  await bonus.save();

  await createAuditLog({
    tenantId: bonus.tenantId,
    entityType: 'bonus',
    entityId: bonusId,
    action: approved ? 'approve' : 'reject',
    performedBy: approverId,
    previousState,
    newState: bonus.toObject(),
    metadata: {
      amount: bonus.summary.totalBonusAmount,
      comments
    }
  });

  return bonus;
}

export async function processBonus(
  bonusId: string,
  payrollBatchId: string
): Promise<IBonus | null> {
  const bonus = await Bonus.findById(bonusId);
  if (!bonus || bonus.status !== 'approved') return null;

  bonus.status = 'processing';
  bonus.payrollBatchId = payrollBatchId;
  await bonus.save();

  return bonus;
}

export async function markBonusAsPaid(
  bonusId: string,
  employeePayrollMapping: Record<string, string>
): Promise<IBonus | null> {
  const bonus = await Bonus.findById(bonusId);
  if (!bonus) return null;

  bonus.employees.forEach(emp => {
    if (emp.status === 'approved' && employeePayrollMapping[emp.employeeId]) {
      emp.status = 'paid';
      emp.paidInPayrollId = employeePayrollMapping[emp.employeeId];
    }
  });

  const allPaid = bonus.employees.filter(e => e.eligible).every(e => e.status === 'paid');
  if (allPaid) {
    bonus.status = 'paid';
    bonus.paidAt = new Date();
  }

  await bonus.save();

  await createAuditLog({
    tenantId: bonus.tenantId,
    entityType: 'bonus',
    entityId: bonusId,
    action: 'pay',
    performedBy: 'system',
    newState: bonus.toObject(),
    metadata: {
      amount: bonus.summary.totalBonusAmount
    }
  });

  return bonus;
}

export async function getBonusList(
  tenantId: string,
  filters?: {
    financialYear?: string;
    bonusType?: IBonus['bonusType'];
    status?: IBonus['status'];
  }
): Promise<IBonus[]> {
  const query: any = { tenantId };
  if (filters?.financialYear) query.financialYear = filters.financialYear;
  if (filters?.bonusType) query.bonusType = filters.bonusType;
  if (filters?.status) query.status = filters.status;

  return Bonus.find(query).sort({ createdAt: -1 }).lean() as any;
}

export async function getBonusDetails(bonusId: string): Promise<IBonus | null> {
  return Bonus.findById(bonusId).lean() as any;
}

export async function getEmployeeBonusHistory(
  tenantId: string,
  employeeId: string,
  financialYear?: string
): Promise<Array<{
  bonusId: string;
  bonusCode: string;
  bonusType: string;
  name: string;
  financialYear: string;
  amount: number;
  status: string;
  paidAt?: Date;
}>> {
  const query: any = {
    tenantId,
    'employees.employeeId': employeeId,
    status: { $in: ['approved', 'paid'] }
  };
  if (financialYear) query.financialYear = financialYear;

  const bonuses = await Bonus.find(query).lean() as any[];

  return bonuses.map(bonus => {
    const empBonus = bonus.employees.find(e => e.employeeId === employeeId);
    return {
      bonusId: bonus._id.toString(),
      bonusCode: bonus.bonusCode,
      bonusType: bonus.bonusType,
      name: bonus.name,
      financialYear: bonus.financialYear,
      amount: empBonus?.finalAmount || 0,
      status: empBonus?.status || 'unknown',
      paidAt: bonus.paidAt
    };
  });
}

export async function getApprovedBonusesForPayroll(
  tenantId: string,
  payoutMonth: number,
  payoutYear: number
): Promise<IBonus[]> {
  const startOfMonth = new Date(payoutYear, payoutMonth - 1, 1);
  const endOfMonth = new Date(payoutYear, payoutMonth, 0);

  return Bonus.find({
    tenantId,
    status: 'approved',
    payoutDate: { $gte: startOfMonth, $lte: endOfMonth }
  }).lean() as any;
}

export async function getBonusSummaryByType(
  tenantId: string,
  financialYear: string
): Promise<Record<string, { count: number; totalAmount: number; paidAmount: number }>> {
  const bonuses = await Bonus.find({ tenantId, financialYear }).lean() as any[];

  const summary: Record<string, { count: number; totalAmount: number; paidAmount: number }> = {};

  bonuses.forEach(bonus => {
    if (!summary[bonus.bonusType]) {
      summary[bonus.bonusType] = { count: 0, totalAmount: 0, paidAmount: 0 };
    }
    summary[bonus.bonusType].count += 1;
    summary[bonus.bonusType].totalAmount += bonus.summary.totalBonusAmount;
    if (bonus.status === 'paid') {
      summary[bonus.bonusType].paidAmount += bonus.summary.totalBonusAmount;
    }
  });

  return summary;
}
