import AdvanceTaxSchedule, {
  IAdvanceTaxSchedule,
  IAdvanceTaxInstallment,
  IIncomeBreakdown,
  IDeductionsBreakdown,
  IReconciliation
} from '../models/AdvanceTaxSchedule';
import AdvanceTaxPayment, { IAdvanceTaxPayment } from '../models/AdvanceTaxPayment';
import { calculateIncomeTax } from './taxService';
import { getOrCreateTaxLimitsConfig, getSurchargeRate, getCessRate } from './taxLimitsConfigService';
import { createAuditLog } from './auditService';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay (credentials should be from environment)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

/**
 * Create advance tax schedule for an employee
 */
export async function createAdvanceTaxSchedule(
  tenantId: string,
  employeeId: string,
  financialYear: string,
  incomeBreakdown: IIncomeBreakdown,
  deductionsBreakdown: IDeductionsBreakdown,
  regime: 'old' | 'new',
  estimatedTDSByEmployer: number,
  createdBy: string
): Promise<IAdvanceTaxSchedule> {
  // Check if schedule already exists
  const existing = await AdvanceTaxSchedule.findOne({
    tenantId,
    employeeId,
    financialYear
  });

  if (existing) {
    throw new Error(`Advance tax schedule already exists for FY ${financialYear}`);
  }

  // Calculate estimated income
  const estimatedAnnualIncome =
    incomeBreakdown.salary +
    incomeBreakdown.houseProperty +
    incomeBreakdown.capitalGains.shortTerm +
    incomeBreakdown.capitalGains.longTerm +
    incomeBreakdown.businessIncome +
    incomeBreakdown.otherSources;

  // Calculate estimated deductions
  const estimatedDeductions =
    deductionsBreakdown.section80C +
    deductionsBreakdown.section80D +
    deductionsBreakdown.section80CCD +
    deductionsBreakdown.section80E +
    deductionsBreakdown.section80G +
    deductionsBreakdown.section80TTA_TTB +
    deductionsBreakdown.section24 +
    deductionsBreakdown.standardDeduction +
    deductionsBreakdown.other;

  // Calculate taxable income
  const estimatedTaxableIncome = Math.max(0, estimatedAnnualIncome - estimatedDeductions);

  // Get tax configuration
  const taxLimits = await getOrCreateTaxLimitsConfig(tenantId, financialYear);

  // Calculate tax
  const taxSlabs = [
    { minIncome: 0, maxIncome: 300000, rate: 0, fixedAmount: 0 },
    { minIncome: 300001, maxIncome: 600000, rate: 5, fixedAmount: 0 },
    { minIncome: 600001, maxIncome: 900000, rate: 10, fixedAmount: 15000 },
    { minIncome: 900001, maxIncome: 1200000, rate: 15, fixedAmount: 45000 },
    { minIncome: 1200001, maxIncome: 1500000, rate: 20, fixedAmount: 90000 },
    { minIncome: 1500001, maxIncome: Number.MAX_SAFE_INTEGER, rate: 30, fixedAmount: 150000 }
  ];

  const { tax: incomeTax } = calculateIncomeTax(estimatedTaxableIncome, taxSlabs, 0);

  // Calculate surcharge
  const surchargeRate = await getSurchargeRate(tenantId, financialYear, estimatedTaxableIncome);
  const estimatedSurcharge = Math.round(incomeTax * (surchargeRate / 100));

  // Calculate cess
  const cessConfig = await getCessRate(tenantId, financialYear);
  const estimatedCess = Math.round((incomeTax + estimatedSurcharge) * (cessConfig.rate / 100));

  // Total tax
  const estimatedTotalTax = Math.round(incomeTax + estimatedSurcharge + estimatedCess);

  // Net tax payable after TDS
  const estimatedNetTaxPayable = Math.max(0, estimatedTotalTax - estimatedTDSByEmployer);

  // Generate quarterly installments
  const [startYear] = financialYear.split('-').map(Number);
  const installments: IAdvanceTaxInstallment[] = [
    {
      quarter: 1,
      dueDate: new Date(startYear, 5, 15),  // June 15
      cumulativePercentage: 15,
      installmentPercentage: 15,
      estimatedAmount: Math.round(estimatedNetTaxPayable * 0.15),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    },
    {
      quarter: 2,
      dueDate: new Date(startYear, 8, 15),  // September 15
      cumulativePercentage: 45,
      installmentPercentage: 30,
      estimatedAmount: Math.round(estimatedNetTaxPayable * 0.30),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    },
    {
      quarter: 3,
      dueDate: new Date(startYear, 11, 15),  // December 15
      cumulativePercentage: 75,
      installmentPercentage: 30,
      estimatedAmount: Math.round(estimatedNetTaxPayable * 0.30),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    },
    {
      quarter: 4,
      dueDate: new Date(startYear + 1, 2, 15),  // March 15
      cumulativePercentage: 100,
      installmentPercentage: 25,
      estimatedAmount: Math.round(estimatedNetTaxPayable * 0.25),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    }
  ];

  // Calculate assessment year
  const [, endYear] = financialYear.split('-').map(Number);
  const assessmentYear = `${endYear}-${endYear + 1}`;

  // Create schedule
  const schedule = new AdvanceTaxSchedule({
    tenantId,
    employeeId,
    financialYear,
    assessmentYear,
    estimatedAnnualIncome,
    incomeBreakdown,
    estimatedDeductions,
    deductionsBreakdown,
    estimatedTaxableIncome,
    estimatedTotalTax,
    estimatedSurcharge,
    estimatedCess,
    estimatedTDSByEmployer,
    estimatedNetTaxPayable,
    installments,
    reminderSettings: {
      enabled: true,
      daysBefore: [7, 3, 1],
      notificationChannels: ['email', 'push']
    },
    regime,
    status: 'active',
    createdBy
  });

  await schedule.save();

  // Create audit log
  await createAuditLog({
    tenantId,
    entityType: 'advance_tax',
    entityId: schedule._id.toString(),
    action: 'create',
    performedBy: createdBy,
    performedByName: 'System',
    performedByRole: 'system',
    newState: schedule.toObject(),
    metadata: {
      financialYear,
      estimatedTax: estimatedTotalTax,
      netTaxPayable: estimatedNetTaxPayable
    }
  });

  return schedule;
}

/**
 * Get advance tax schedule by ID
 */
export async function getAdvanceTaxSchedule(
  scheduleId: string
): Promise<IAdvanceTaxSchedule | null> {
  return AdvanceTaxSchedule.findById(scheduleId);
}

/**
 * Get advance tax schedule by tenant, employee, and financial year
 */
export async function getAdvanceTaxScheduleByEmployee(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<IAdvanceTaxSchedule | null> {
  return AdvanceTaxSchedule.findOne({
    tenantId,
    employeeId,
    financialYear
  });
}

/**
 * Update estimated income and recalculate installments
 */
export async function updateEstimates(
  scheduleId: string,
  incomeBreakdown?: Partial<IIncomeBreakdown>,
  deductionsBreakdown?: Partial<IDeductionsBreakdown>,
  regime?: 'old' | 'new',
  estimatedTDSByEmployer?: number,
  updatedBy: string = 'system'
): Promise<IAdvanceTaxSchedule> {
  const schedule = await AdvanceTaxSchedule.findById(scheduleId);
  if (!schedule) {
    throw new Error('Advance tax schedule not found');
  }

  const previousEstimatedTax = schedule.estimatedTotalTax;

  // Update income breakdown
  if (incomeBreakdown) {
    Object.assign(schedule.incomeBreakdown, incomeBreakdown);
  }

  // Update deductions breakdown
  if (deductionsBreakdown) {
    Object.assign(schedule.deductionsBreakdown, deductionsBreakdown);
  }

  // Recalculate
  schedule.estimatedAnnualIncome =
    schedule.incomeBreakdown.salary +
    schedule.incomeBreakdown.houseProperty +
    schedule.incomeBreakdown.capitalGains.shortTerm +
    schedule.incomeBreakdown.capitalGains.longTerm +
    schedule.incomeBreakdown.businessIncome +
    schedule.incomeBreakdown.otherSources;

  schedule.estimatedDeductions =
    schedule.deductionsBreakdown.section80C +
    schedule.deductionsBreakdown.section80D +
    schedule.deductionsBreakdown.section80CCD +
    schedule.deductionsBreakdown.section80E +
    schedule.deductionsBreakdown.section80G +
    schedule.deductionsBreakdown.section80TTA_TTB +
    schedule.deductionsBreakdown.section24 +
    schedule.deductionsBreakdown.standardDeduction +
    schedule.deductionsBreakdown.other;

  schedule.estimatedTaxableIncome = Math.max(0, schedule.estimatedAnnualIncome - schedule.estimatedDeductions);

  // Recalculate tax (simplified - should use full calculation)
  const taxSlabs = [
    { minIncome: 0, maxIncome: 300000, rate: 0, fixedAmount: 0 },
    { minIncome: 300001, maxIncome: 600000, rate: 5, fixedAmount: 0 },
    { minIncome: 600001, maxIncome: 900000, rate: 10, fixedAmount: 15000 },
    { minIncome: 900001, maxIncome: 1200000, rate: 15, fixedAmount: 45000 },
    { minIncome: 1200001, maxIncome: 1500000, rate: 20, fixedAmount: 90000 },
    { minIncome: 1500001, maxIncome: Number.MAX_SAFE_INTEGER, rate: 30, fixedAmount: 150000 }
  ];

  const { tax: incomeTax } = calculateIncomeTax(schedule.estimatedTaxableIncome, taxSlabs, 0);
  const surchargeRate = await getSurchargeRate(schedule.tenantId, schedule.financialYear, schedule.estimatedTaxableIncome);
  schedule.estimatedSurcharge = Math.round(incomeTax * (surchargeRate / 100));

  const cessConfig = await getCessRate(schedule.tenantId, schedule.financialYear);
  schedule.estimatedCess = Math.round((incomeTax + schedule.estimatedSurcharge) * (cessConfig.rate / 100));

  schedule.estimatedTotalTax = Math.round(incomeTax + schedule.estimatedSurcharge + schedule.estimatedCess);
  schedule.estimatedNetTaxPayable = Math.max(0, schedule.estimatedTotalTax - schedule.estimatedTDSByEmployer);

  // Recalculate remaining installments
  const now = new Date();
  let cumulativePaid = 0;

  for (const installment of schedule.installments) {
    cumulativePaid += installment.paidAmount;

    if (installment.status === 'paid') continue;

    // Recalculate estimated amount based on new total
    const targetCumulative = schedule.estimatedNetTaxPayable * (installment.cumulativePercentage / 100);
    installment.estimatedAmount = Math.max(0, Math.round(targetCumulative - cumulativePaid));
  }

  // Add revision history
  schedule.revisionHistory.push({
    revisedAt: new Date(),
    revisedBy: updatedBy,
    previousEstimatedTax,
    newEstimatedTax: schedule.estimatedTotalTax,
    reason: 'Income/deduction estimates updated'
  });

  schedule.status = 'revised';
  await schedule.save();

  return schedule;
}

/**
 * Initiate advance tax payment via Razorpay
 */
export async function initiatePayment(
  scheduleId: string,
  quarter: 1 | 2 | 3 | 4,
  amount: number,
  paymentMethod: 'razorpay' | 'manual' | 'netbanking' = 'razorpay',
  panNumber?: string,
  createdBy: string = 'system',
  ipAddress?: string,
  userAgent?: string
): Promise<{ payment: IAdvanceTaxPayment; razorpayOrder: any }> {
  const schedule = await AdvanceTaxSchedule.findById(scheduleId);
  if (!schedule) {
    throw new Error('Advance tax schedule not found');
  }

  const installment = schedule.installments.find(i => i.quarter === quarter);
  if (!installment) {
    throw new Error('Invalid quarter');
  }

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: amount * 100,  // Amount in paise
    currency: 'INR',
    receipt: `ADVTAX-${schedule.financialYear}-Q${quarter}-${Date.now()}`,
    notes: {
      tenantId: schedule.tenantId,
      employeeId: schedule.employeeId,
      financialYear: schedule.financialYear,
      quarter: quarter.toString(),
      panNumber
    }
  });

  // Create payment record
  const payment = new AdvanceTaxPayment({
    tenantId: schedule.tenantId,
    employeeId: schedule.employeeId,
    scheduleId: schedule._id.toString(),
    financialYear: schedule.financialYear,
    assessmentYear: schedule.assessmentYear,
    quarter,
    amount,
    currency: 'INR',
    majorHeadCode: '0021',
    minorHeadCode: '100',
    panNumber,
    paymentMethod: 'razorpay',
    razorpay: {
      orderId: razorpayOrder.id,
      status: 'created'
    },
    status: 'initiated',
    initiatedAt: new Date(),
    createdBy,
    ipAddress,
    userAgent
  });

  await payment.save();

  return { payment, razorpayOrder };
}

/**
 * Verify Razorpay payment
 */
export async function verifyPayment(
  paymentId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<IAdvanceTaxPayment> {
  const payment = await AdvanceTaxPayment.findById(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  // Verify signature
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    payment.status = 'failed';
    payment.failedAt = new Date();
    payment.failureReason = 'Invalid payment signature';
    if (payment.razorpay) {
      payment.razorpay.status = 'failed';
      payment.razorpay.errorDescription = 'Signature verification failed';
    }
    await payment.save();
    throw new Error('Invalid payment signature');
  }

  // Update payment
  payment.status = 'completed';
  payment.completedAt = new Date();
  if (payment.razorpay) {
    payment.razorpay.paymentId = razorpayPaymentId;
    payment.razorpay.signature = razorpaySignature;
    payment.razorpay.status = 'paid';
  }
  await payment.save();

  // Update schedule installment
  const schedule = await AdvanceTaxSchedule.findById(payment.scheduleId);
  if (schedule) {
    const installment = schedule.installments.find(i => i.quarter === payment.quarter);
    if (installment) {
      installment.paidAmount += payment.amount;
      installment.paymentIds.push(payment._id.toString());

      if (installment.paidAmount >= installment.estimatedAmount) {
        installment.status = 'paid';
      } else {
        installment.status = 'partially_paid';
      }

      await schedule.save();
    }
  }

  return payment;
}

/**
 * Record manual payment (challan-based)
 */
export async function recordManualPayment(
  scheduleId: string,
  quarter: 1 | 2 | 3 | 4,
  amount: number,
  challanDetails: {
    challanNumber?: string;
    bsrCode?: string;
    challanDate?: Date;
    depositDate?: Date;
    bankName?: string;
    branchName?: string;
  },
  acknowledgement?: {
    number: string;
    date: Date;
  },
  createdBy: string = 'system'
): Promise<IAdvanceTaxPayment> {
  const schedule = await AdvanceTaxSchedule.findById(scheduleId);
  if (!schedule) {
    throw new Error('Advance tax schedule not found');
  }

  const payment = new AdvanceTaxPayment({
    tenantId: schedule.tenantId,
    employeeId: schedule.employeeId,
    scheduleId: schedule._id.toString(),
    financialYear: schedule.financialYear,
    assessmentYear: schedule.assessmentYear,
    quarter,
    amount,
    currency: 'INR',
    majorHeadCode: '0021',
    minorHeadCode: '100',
    paymentMethod: 'manual',
    challan: {
      challanNumber: challanDetails.challanNumber,
      bsrCode: challanDetails.bsrCode,
      challanDate: challanDetails.challanDate || new Date(),
      depositDate: challanDetails.depositDate || new Date(),
      bankName: challanDetails.bankName,
      branchName: challanDetails.branchName
    },
    acknowledgement: acknowledgement ? {
      number: acknowledgement.number,
      date: acknowledgement.date
    } : undefined,
    status: 'completed',
    initiatedAt: challanDetails.depositDate || new Date(),
    completedAt: challanDetails.depositDate || new Date(),
    isVerified: !!acknowledgement,
    createdBy
  });

  await payment.save();

  // Update schedule installment
  const installment = schedule.installments.find(i => i.quarter === quarter);
  if (installment) {
    installment.paidAmount += amount;
    installment.paymentIds.push(payment._id.toString());

    if (installment.paidAmount >= installment.estimatedAmount) {
      installment.status = 'paid';
    } else {
      installment.status = 'partially_paid';
    }

    await schedule.save();
  }

  return payment;
}

/**
 * Get payment history for a schedule
 */
export async function getPaymentHistory(
  scheduleId: string,
  quarter?: 1 | 2 | 3 | 4
): Promise<IAdvanceTaxPayment[]> {
  const query: any = { scheduleId };
  if (quarter) {
    query.quarter = quarter;
  }
  return AdvanceTaxPayment.find(query).sort({ createdAt: -1 });
}

/**
 * Reconcile advance tax at year end
 */
export async function reconcileAdvanceTax(
  scheduleId: string,
  actualTaxLiability: number,
  reconciledBy: string = 'system',
  totalTDSDeducted: number = 0
): Promise<IAdvanceTaxSchedule> {
  const schedule = await AdvanceTaxSchedule.findById(scheduleId);
  if (!schedule) {
    throw new Error('Advance tax schedule not found');
  }

  // Get total advance tax paid
  const payments = await AdvanceTaxPayment.find({
    scheduleId,
    status: 'completed'
  });

  const totalAdvanceTaxPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalTaxPaid = totalAdvanceTaxPaid + totalTDSDeducted;
  const balanceTax = actualTaxLiability - totalTaxPaid;
  const refundDue = balanceTax < 0 ? Math.abs(balanceTax) : 0;

  // Calculate interest under sections 234A, 234B, 234C
  const interest234B = calculateInterest234B(schedule, actualTaxLiability, totalAdvanceTaxPaid);
  const interest234C = _calculateInterest234CInternal(schedule, actualTaxLiability);

  const reconciliation: IReconciliation = {
    actualTaxLiability,
    totalAdvanceTaxPaid,
    totalTDSDeducted,
    totalTaxPaid,
    balanceTax: Math.max(0, balanceTax),
    refundDue,
    interest234A: 0,  // Calculated when return is filed late
    interest234B,
    interest234C,
    totalInterest: interest234B + interest234C,
    reconciliationDate: new Date(),
    status: 'completed'
  };

  schedule.reconciliation = reconciliation;
  schedule.status = 'reconciled';
  await schedule.save();

  // Audit log
  await createAuditLog({
    tenantId: schedule.tenantId,
    entityType: 'advance_tax',
    entityId: schedule._id.toString(),
    action: 'reconcile',
    performedBy: reconciledBy,
    performedByName: 'System',
    performedByRole: 'system',
    previousState: { status: 'active' },
    newState: { status: 'reconciled', reconciliation },
    metadata: {
      actualTaxLiability,
      balanceTax,
      amount: totalAdvanceTaxPaid
    }
  });

  return schedule;
}

/**
 * Calculate interest under section 234B (default in payment of advance tax)
 */
function calculateInterest234B(
  schedule: IAdvanceTaxSchedule,
  actualTaxLiability: number,
  totalAdvanceTaxPaid: number
): number {
  // Interest @ 1% per month if advance tax paid < 90% of assessed tax
  const threshold = actualTaxLiability * 0.90;

  if (totalAdvanceTaxPaid >= threshold) {
    return 0;
  }

  const shortfall = actualTaxLiability - totalAdvanceTaxPaid;
  // Interest from April 1 to date of payment/assessment
  const months = 12;  // Simplified - should calculate actual months
  const interest = Math.round(shortfall * 0.01 * months);

  return interest;
}

/**
 * Calculate interest under section 234C (deferment of advance tax)
 * Internal function used during reconciliation
 */
function _calculateInterest234CInternal(
  schedule: IAdvanceTaxSchedule,
  actualTaxLiability: number
): number {
  let totalInterest = 0;
  const monthlyRate = 0.01;

  const quarterTargets = [
    { quarter: 1, percentage: 15, months: 3 },
    { quarter: 2, percentage: 45, months: 3 },
    { quarter: 3, percentage: 75, months: 3 },
    { quarter: 4, percentage: 100, months: 1 }
  ];

  let cumulativePaid = 0;

  for (const target of quarterTargets) {
    const installment = schedule.installments.find(i => i.quarter === target.quarter);
    if (!installment) continue;

    cumulativePaid += installment.paidAmount;
    const requiredCumulative = actualTaxLiability * (target.percentage / 100);

    if (cumulativePaid < requiredCumulative) {
      const shortfall = requiredCumulative - cumulativePaid;
      const interest = Math.round(shortfall * monthlyRate * target.months);
      totalInterest += interest;
    }
  }

  return totalInterest;
}

/**
 * Get upcoming due dates for all employees
 */
export async function getUpcomingDueDates(
  tenantId: string,
  daysAhead: number = 30
): Promise<Array<{
  schedule: IAdvanceTaxSchedule;
  installment: IAdvanceTaxInstallment;
  daysUntilDue: number;
}>> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const schedules = await AdvanceTaxSchedule.find({
    tenantId,
    status: { $in: ['active', 'revised'] },
    'installments.dueDate': { $gte: now, $lte: futureDate },
    'installments.status': { $in: ['upcoming', 'due'] }
  });

  const result: Array<{
    schedule: IAdvanceTaxSchedule;
    installment: IAdvanceTaxInstallment;
    daysUntilDue: number;
  }> = [];

  for (const schedule of schedules) {
    for (const installment of schedule.installments) {
      if (
        installment.dueDate >= now &&
        installment.dueDate <= futureDate &&
        ['upcoming', 'due'].includes(installment.status)
      ) {
        const daysUntilDue = Math.ceil(
          (installment.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        result.push({ schedule, installment, daysUntilDue });
      }
    }
  }

  return result.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Update installment statuses (called by cron job)
 */
export async function updateAllInstallmentStatuses(tenantId: string): Promise<number> {
  const schedules = await AdvanceTaxSchedule.find({
    tenantId,
    status: { $in: ['active', 'revised'] }
  });

  let updatedCount = 0;
  const now = new Date();

  for (const schedule of schedules) {
    let modified = false;

    for (const installment of schedule.installments) {
      const previousStatus = installment.status;

      if (installment.paidAmount >= installment.estimatedAmount) {
        installment.status = 'paid';
      } else if (installment.paidAmount > 0) {
        installment.status = 'partially_paid';
      } else if (now > installment.dueDate) {
        installment.status = 'overdue';
      } else if (now >= new Date(installment.dueDate.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        installment.status = 'due';
      } else {
        installment.status = 'upcoming';
      }

      if (previousStatus !== installment.status) {
        modified = true;
      }
    }

    if (modified) {
      await schedule.save();
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Get all schedules for an employee
 */
export async function getEmployeeSchedules(
  tenantId: string,
  employeeId: string,
  financialYear?: string
): Promise<IAdvanceTaxSchedule[]> {
  const query: any = { tenantId, employeeId };
  if (financialYear) {
    query.financialYear = financialYear;
  }
  return AdvanceTaxSchedule.find(query).sort({ financialYear: -1 });
}

/**
 * Update schedule estimates (alias for updateEstimates)
 */
export const updateScheduleEstimates = updateEstimates;

/**
 * Initiate advance tax payment (alias for initiatePayment)
 */
export const initiateAdvanceTaxPayment = initiatePayment;

/**
 * Verify advance tax payment (alias for verifyPayment)
 */
export const verifyAdvanceTaxPayment = verifyPayment;

/**
 * Calculate interest under Section 234C for shortfall in advance tax
 */
export async function calculateInterest234C(
  scheduleId: string
): Promise<{
  quarterWiseInterest: { quarter: number; shortfall: number; interest: number }[];
  totalInterest: number;
}> {
  const schedule = await AdvanceTaxSchedule.findById(scheduleId);
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const quarterWiseInterest: { quarter: number; shortfall: number; interest: number }[] = [];
  let totalInterest = 0;

  // Section 234C interest rate is 1% per month for shortfall
  // Q1: Should pay 15% by June 15
  // Q2: Should pay 45% by Sept 15
  // Q3: Should pay 75% by Dec 15
  // Q4: Should pay 100% by March 15

  const cumulativePercentages = [15, 45, 75, 100];

  for (let i = 0; i < schedule.installments.length; i++) {
    const installment = schedule.installments[i];
    const expectedAmount = (schedule.estimatedTotalTax * cumulativePercentages[i]) / 100;

    // Calculate cumulative paid up to this quarter
    let cumulativePaid = 0;
    for (let j = 0; j <= i; j++) {
      cumulativePaid += schedule.installments[j].paidAmount;
    }

    const shortfall = Math.max(0, expectedAmount - cumulativePaid);

    // Interest is 1% per month, for 3 months (quarter)
    const interest = Math.round(shortfall * 0.01 * 3);

    quarterWiseInterest.push({
      quarter: installment.quarter,
      shortfall,
      interest
    });

    totalInterest += interest;
  }

  return {
    quarterWiseInterest,
    totalInterest
  };
}

/**
 * Update reminder settings for a schedule
 */
export async function updateReminderSettings(
  scheduleId: string,
  settings: {
    enabled?: boolean;
    daysBefore?: number[];
    notificationChannels?: ('email' | 'sms' | 'push')[];
  }
): Promise<IAdvanceTaxSchedule | null> {
  return AdvanceTaxSchedule.findByIdAndUpdate(
    scheduleId,
    {
      $set: {
        'reminderSettings.enabled': settings.enabled,
        'reminderSettings.daysBefore': settings.daysBefore,
        'reminderSettings.notificationChannels': settings.notificationChannels
      }
    },
    { new: true }
  );
}

/**
 * Get due and overdue advance taxes for a tenant
 */
export async function getDueAdvanceTaxes(
  tenantId: string
): Promise<{
  overdue: { schedule: IAdvanceTaxSchedule; installment: IAdvanceTaxInstallment }[];
  dueSoon: { schedule: IAdvanceTaxSchedule; installment: IAdvanceTaxInstallment }[];
}> {
  const schedules = await AdvanceTaxSchedule.find({
    tenantId,
    status: { $in: ['active', 'revised'] }
  });

  const overdue: { schedule: IAdvanceTaxSchedule; installment: IAdvanceTaxInstallment }[] = [];
  const dueSoon: { schedule: IAdvanceTaxSchedule; installment: IAdvanceTaxInstallment }[] = [];

  for (const schedule of schedules) {
    for (const installment of schedule.installments) {
      if (installment.status === 'overdue') {
        overdue.push({ schedule, installment });
      } else if (installment.status === 'due') {
        dueSoon.push({ schedule, installment });
      }
    }
  }

  return { overdue, dueSoon };
}

export default {
  createAdvanceTaxSchedule,
  getAdvanceTaxSchedule,
  getEmployeeSchedules,
  updateEstimates,
  updateScheduleEstimates,
  initiatePayment,
  initiateAdvanceTaxPayment,
  verifyPayment,
  verifyAdvanceTaxPayment,
  recordManualPayment,
  getPaymentHistory,
  reconcileAdvanceTax,
  calculateInterest234C,
  updateReminderSettings,
  getUpcomingDueDates,
  getDueAdvanceTaxes,
  updateAllInstallmentStatuses
};
