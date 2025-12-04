import { Paystub } from '../models/Paystub';
import { TaxDeclaration } from '../models/TaxDeclaration';
import { Form16 } from '../models/Form16';
import { InvestmentDeclaration } from '../models/InvestmentDeclaration';
import { Loan } from '../models/Loan';
import { Reimbursement } from '../models/Reimbursement';
import { LeaveEncashment } from '../models/LeaveEncashment';
import { OvertimeEntry } from '../models/Overtime';
import { SalaryRevision } from '../models/SalaryRevision';

// ==================== PAYROLL DASHBOARD ====================

export async function getEmployeePayrollDashboard(
  tenantId: string,
  employeeId: string
): Promise<{
  currentMonthSalary: any;
  ytdEarnings: number;
  ytdDeductions: number;
  ytdTax: number;
  pendingRequests: {
    loans: number;
    reimbursements: number;
    leaveEncashments: number;
    overtime: number;
  };
  recentPaystubs: any[];
  upcomingPayments: any[];
}> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get current month paystub
  const currentPaystub = await Paystub.findOne({
    tenantId,
    employeeId,
    month: currentMonth,
    year: currentYear
  }).lean();

  // Get YTD figures
  const ytdPaystubs = await Paystub.find({
    tenantId,
    employeeId,
    year: currentYear,
    status: { $in: ['generated', 'approved', 'paid'] }
  }).lean();

  const ytdEarnings = ytdPaystubs.reduce((sum, p) => sum + p.grossEarnings, 0);
  const ytdDeductions = ytdPaystubs.reduce((sum, p) => sum + p.totalDeductions, 0);
  const ytdTax = ytdPaystubs.reduce((sum, p) => sum + p.tds, 0);

  // Get pending requests count
  const [pendingLoans, pendingReimbursements, pendingLeaveEncashments, pendingOvertime] =
    await Promise.all([
      Loan.countDocuments({ tenantId, employeeId, status: 'pending' }),
      Reimbursement.countDocuments({ tenantId, employeeId, status: 'pending' }),
      LeaveEncashment.countDocuments({ tenantId, employeeId, status: 'pending' }),
      OvertimeEntry.countDocuments({ tenantId, employeeId, status: 'pending' })
    ]);

  // Get recent paystubs (last 6 months)
  const recentPaystubs = await Paystub.find({
    tenantId,
    employeeId,
    status: { $in: ['generated', 'approved', 'paid'] }
  })
    .sort({ year: -1, month: -1 })
    .limit(6)
    .lean();

  // Get upcoming payments (approved but not paid)
  const upcomingPayments: any[] = [];

  const approvedLoans = await Loan.find({
    tenantId,
    employeeId,
    status: 'active'
  }).lean();

  approvedLoans.forEach(loan => {
    const nextInstallment = loan.installments.find(i => i.status === 'pending');
    if (nextInstallment) {
      upcomingPayments.push({
        type: 'Loan EMI',
        description: loan.loanType,
        amount: nextInstallment.amount,
        dueDate: nextInstallment.dueDate
      });
    }
  });

  return {
    currentMonthSalary: currentPaystub,
    ytdEarnings,
    ytdDeductions,
    ytdTax,
    pendingRequests: {
      loans: pendingLoans,
      reimbursements: pendingReimbursements,
      leaveEncashments: pendingLeaveEncashments,
      overtime: pendingOvertime
    },
    recentPaystubs,
    upcomingPayments
  };
}

// ==================== SALARY HISTORY ====================

export async function getEmployeeSalaryHistory(
  tenantId: string,
  employeeId: string,
  fromYear?: number,
  toYear?: number
): Promise<{
  paystubs: any[];
  revisions: any[];
  annualSummary: Record<number, {
    totalEarnings: number;
    totalDeductions: number;
    totalTax: number;
    netPaid: number;
  }>;
}> {
  const query: any = { tenantId, employeeId };
  if (fromYear) query.year = { $gte: fromYear };
  if (toYear) query.year = { ...query.year, $lte: toYear };

  const paystubs = await Paystub.find(query)
    .sort({ year: -1, month: -1 })
    .lean();

  const revisions = await SalaryRevision.find({
    tenantId,
    employeeId,
    status: 'approved'
  })
    .sort({ effectiveDate: -1 })
    .lean();

  // Calculate annual summary
  const annualSummary: Record<number, any> = {};

  paystubs.forEach(p => {
    if (!annualSummary[p.year]) {
      annualSummary[p.year] = {
        totalEarnings: 0,
        totalDeductions: 0,
        totalTax: 0,
        netPaid: 0
      };
    }
    annualSummary[p.year].totalEarnings += p.grossEarnings;
    annualSummary[p.year].totalDeductions += p.totalDeductions;
    annualSummary[p.year].totalTax += p.tds;
    annualSummary[p.year].netPaid += p.netSalary;
  });

  return { paystubs, revisions, annualSummary };
}

// ==================== TAX SUMMARY ====================

export async function getEmployeeTaxSummary(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<{
  taxDeclaration: any;
  investmentDeclaration: any;
  form16: any;
  monthlyTdsBreakdown: Array<{ month: number; year: number; tds: number }>;
  totalTaxDeducted: number;
  projectedTax: number;
  taxSavings: number;
}> {
  const yearParts = financialYear.split('-');
  const startYear = parseInt(yearParts[0]);

  const [taxDeclaration, investmentDeclaration, form16, paystubs] = await Promise.all([
    TaxDeclaration.findOne({ tenantId, employeeId, financialYear }).lean(),
    InvestmentDeclaration.findOne({
      tenantId,
      employeeId,
      financialYear,
      status: { $ne: 'rejected' }
    }).lean(),
    Form16.findOne({ tenantId, employeeId, financialYear }).lean(),
    Paystub.find({
      tenantId,
      employeeId,
      $or: [
        { year: startYear, month: { $gte: 4 } },
        { year: startYear + 1, month: { $lte: 3 } }
      ]
    }).lean()
  ]);

  const monthlyTdsBreakdown = paystubs.map(p => ({
    month: p.month,
    year: p.year,
    tds: p.tds
  })).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  const totalTaxDeducted = paystubs.reduce((sum, p) => sum + p.tds, 0);

  // Calculate projected tax (simplified)
  const annualIncome = paystubs.reduce((sum, p) => sum + p.grossEarnings, 0) * (12 / paystubs.length || 1);
  const deductions = investmentDeclaration?.totalVerifiedAmount || 0;
  const taxableIncome = Math.max(0, annualIncome - deductions - 50000); // Standard deduction

  let projectedTax = 0;
  if (taxableIncome > 1500000) {
    projectedTax = 187500 + (taxableIncome - 1500000) * 0.3;
  } else if (taxableIncome > 1250000) {
    projectedTax = 125000 + (taxableIncome - 1250000) * 0.25;
  } else if (taxableIncome > 1000000) {
    projectedTax = 100000 + (taxableIncome - 1000000) * 0.2;
  } else if (taxableIncome > 750000) {
    projectedTax = 75000 + (taxableIncome - 750000) * 0.15;
  } else if (taxableIncome > 500000) {
    projectedTax = 25000 + (taxableIncome - 500000) * 0.1;
  } else if (taxableIncome > 250000) {
    projectedTax = (taxableIncome - 250000) * 0.05;
  }

  // Add cess
  projectedTax = Math.round(projectedTax * 1.04);

  const taxSavings = deductions * 0.3; // Approximate at 30% slab

  return {
    taxDeclaration,
    investmentDeclaration,
    form16,
    monthlyTdsBreakdown,
    totalTaxDeducted,
    projectedTax,
    taxSavings
  };
}

// ==================== LOAN SUMMARY ====================

export async function getEmployeeLoanSummary(
  tenantId: string,
  employeeId: string
): Promise<{
  activeLoans: any[];
  loanHistory: any[];
  totalOutstanding: number;
  totalPaid: number;
  upcomingEMIs: Array<{ loanId: string; loanType: string; amount: number; dueDate: Date }>;
}> {
  const loans = await Loan.find({ tenantId, employeeId })
    .sort({ createdAt: -1 })
    .lean();

  const activeLoans = loans.filter(l => l.status === 'active');
  const loanHistory = loans.filter(l => ['closed', 'cancelled'].includes(l.status));

  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.outstandingAmount, 0);
  const totalPaid = loans.reduce((sum, l) => {
    return sum + l.installments
      .filter(i => i.status === 'paid')
      .reduce((iSum, i) => iSum + i.amount, 0);
  }, 0);

  const upcomingEMIs: Array<{ loanId: string; loanType: string; amount: number; dueDate: Date }> = [];

  activeLoans.forEach(loan => {
    const nextInstallment = loan.installments.find(i => i.status === 'pending');
    if (nextInstallment) {
      upcomingEMIs.push({
        loanId: loan._id.toString(),
        loanType: loan.loanType,
        amount: nextInstallment.amount,
        dueDate: nextInstallment.dueDate
      });
    }
  });

  return { activeLoans, loanHistory, totalOutstanding, totalPaid, upcomingEMIs };
}

// ==================== REIMBURSEMENT SUMMARY ====================

export async function getEmployeeReimbursementSummary(
  tenantId: string,
  employeeId: string,
  financialYear?: string
): Promise<{
  pendingClaims: any[];
  approvedClaims: any[];
  paidClaims: any[];
  rejectedClaims: any[];
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  categoryBreakdown: Record<string, { count: number; amount: number }>;
}> {
  const query: any = { tenantId, employeeId };
  if (financialYear) {
    const yearParts = financialYear.split('-');
    const startYear = parseInt(yearParts[0]);
    query.claimDate = {
      $gte: new Date(startYear, 3, 1),
      $lt: new Date(startYear + 1, 3, 1)
    };
  }

  const claims = await Reimbursement.find(query)
    .sort({ claimDate: -1 })
    .lean();

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const approvedClaims = claims.filter(c => c.status === 'approved');
  const paidClaims = claims.filter(c => c.status === 'paid');
  const rejectedClaims = claims.filter(c => c.status === 'rejected');

  const categoryBreakdown: Record<string, { count: number; amount: number }> = {};

  claims.forEach(c => {
    if (!categoryBreakdown[c.category]) {
      categoryBreakdown[c.category] = { count: 0, amount: 0 };
    }
    categoryBreakdown[c.category].count++;
    categoryBreakdown[c.category].amount += c.totalAmount;
  });

  return {
    pendingClaims,
    approvedClaims,
    paidClaims,
    rejectedClaims,
    totalPending: pendingClaims.reduce((sum, c) => sum + c.totalAmount, 0),
    totalApproved: approvedClaims.reduce((sum, c) => sum + c.totalAmount, 0),
    totalPaid: paidClaims.reduce((sum, c) => sum + c.totalAmount, 0),
    categoryBreakdown
  };
}

// ==================== COMPENSATION BREAKDOWN ====================

export async function getEmployeeCompensationBreakdown(
  tenantId: string,
  employeeId: string,
  month: number,
  year: number
): Promise<{
  basic: number;
  hra: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  overtime: { hours: number; amount: number };
  bonus: number;
  reimbursements: number;
  gross: number;
  totalDeductions: number;
  net: number;
  ctc: number;
  employerContributions: {
    pf: number;
    esi: number;
    gratuity: number;
  };
}> {
  const paystub = await Paystub.findOne({
    tenantId,
    employeeId,
    month,
    year
  }).lean();

  if (!paystub) {
    return {
      basic: 0,
      hra: 0,
      allowances: [],
      deductions: [],
      overtime: { hours: 0, amount: 0 },
      bonus: 0,
      reimbursements: 0,
      gross: 0,
      totalDeductions: 0,
      net: 0,
      ctc: 0,
      employerContributions: { pf: 0, esi: 0, gratuity: 0 }
    };
  }

  const basic = paystub.earnings.find(e => e.code === 'BASIC')?.amount || 0;
  const hra = paystub.earnings.find(e => e.code === 'HRA')?.amount || 0;

  const allowances = paystub.earnings
    .filter(e => !['BASIC', 'HRA'].includes(e.code))
    .map(e => ({ name: e.name, amount: e.amount }));

  const deductions = paystub.deductions.map(d => ({ name: d.name, amount: d.amount }));

  // Get overtime for the month
  const overtimeEntries = await OvertimeEntry.find({
    tenantId,
    employeeId,
    status: 'approved',
    date: {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0)
    }
  }).lean();

  const overtime = {
    hours: overtimeEntries.reduce((sum, e) => sum + e.overtimeHours, 0),
    amount: overtimeEntries.reduce((sum, e) => sum + e.amount, 0)
  };

  // Employer contributions (simplified calculation)
  const pfBasis = Math.min(basic, 15000);
  const employerContributions = {
    pf: Math.round(pfBasis * 0.12),
    esi: paystub.grossEarnings <= 21000 ? Math.round(paystub.grossEarnings * 0.0325) : 0,
    gratuity: Math.round(basic * 0.0481) // 15/26 * basic / 12
  };

  return {
    basic,
    hra,
    allowances,
    deductions,
    overtime,
    bonus: 0,
    reimbursements: paystub.reimbursements || 0,
    gross: paystub.grossEarnings,
    totalDeductions: paystub.totalDeductions,
    net: paystub.netSalary,
    ctc: paystub.grossEarnings + employerContributions.pf + employerContributions.esi + employerContributions.gratuity,
    employerContributions
  };
}

// ==================== DOCUMENT CENTER ====================

export async function getEmployeePayrollDocuments(
  tenantId: string,
  employeeId: string
): Promise<{
  paystubs: Array<{ month: number; year: number; status: string; id: string }>;
  form16: Array<{ financialYear: string; status: string; id: string }>;
  salaryRevisions: Array<{ effectiveDate: Date; status: string; id: string }>;
  taxDeclarations: Array<{ financialYear: string; regime: string; id: string }>;
}> {
  const [paystubs, form16s, revisions, taxDeclarations] = await Promise.all([
    Paystub.find({ tenantId, employeeId })
      .select('month year status _id')
      .sort({ year: -1, month: -1 })
      .lean(),
    Form16.find({ tenantId, employeeId })
      .select('financialYear status _id')
      .sort({ financialYear: -1 })
      .lean(),
    SalaryRevision.find({ tenantId, employeeId })
      .select('effectiveDate status _id')
      .sort({ effectiveDate: -1 })
      .lean(),
    TaxDeclaration.find({ tenantId, employeeId })
      .select('financialYear regime _id')
      .sort({ financialYear: -1 })
      .lean()
  ]);

  return {
    paystubs: paystubs.map(p => ({
      month: p.month,
      year: p.year,
      status: p.status,
      id: p._id.toString()
    })),
    form16: form16s.map(f => ({
      financialYear: f.financialYear,
      status: f.status,
      id: f._id.toString()
    })),
    salaryRevisions: revisions.map(r => ({
      effectiveDate: r.effectiveDate,
      status: r.status,
      id: r._id.toString()
    })),
    taxDeclarations: taxDeclarations.map(t => ({
      financialYear: t.financialYear,
      regime: t.regime,
      id: t._id.toString()
    }))
  };
}

// ==================== NOTIFICATIONS ====================

export async function getEmployeePayrollNotifications(
  tenantId: string,
  employeeId: string
): Promise<Array<{
  type: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  actionUrl?: string;
}>> {
  const notifications: Array<any> = [];
  const now = new Date();

  // Check for new paystub
  const latestPaystub = await Paystub.findOne({
    tenantId,
    employeeId,
    status: { $in: ['generated', 'approved'] }
  }).sort({ year: -1, month: -1 }).lean();

  if (latestPaystub) {
    const paystubDate = new Date(latestPaystub.year, latestPaystub.month - 1, 1);
    const daysSincePaystub = Math.floor((now.getTime() - paystubDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSincePaystub <= 7) {
      notifications.push({
        type: 'paystub',
        title: 'New Payslip Available',
        message: `Your payslip for ${getMonthName(latestPaystub.month)} ${latestPaystub.year} is now available.`,
        date: paystubDate,
        read: false,
        actionUrl: `/paystubs/${latestPaystub._id}`
      });
    }
  }

  // Check for pending approvals
  const pendingLoans = await Loan.countDocuments({
    tenantId,
    employeeId,
    status: 'pending'
  });

  if (pendingLoans > 0) {
    notifications.push({
      type: 'loan',
      title: 'Loan Application Status',
      message: `You have ${pendingLoans} pending loan application(s).`,
      date: now,
      read: false,
      actionUrl: '/loans'
    });
  }

  // Check for rejected claims
  const rejectedReimbursements = await Reimbursement.find({
    tenantId,
    employeeId,
    status: 'rejected',
    updatedAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
  }).lean();

  rejectedReimbursements.forEach(r => {
    notifications.push({
      type: 'reimbursement',
      title: 'Reimbursement Rejected',
      message: `Your reimbursement claim #${r.claimNumber} has been rejected.`,
      date: r.updatedAt,
      read: false,
      actionUrl: `/reimbursements/${r._id}`
    });
  });

  // Check for upcoming loan EMI
  const activeLoans = await Loan.find({
    tenantId,
    employeeId,
    status: 'active'
  }).lean();

  activeLoans.forEach(loan => {
    const nextInstallment = loan.installments.find(i => i.status === 'pending');
    if (nextInstallment) {
      const daysUntilDue = Math.floor((nextInstallment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 5 && daysUntilDue >= 0) {
        notifications.push({
          type: 'loan_emi',
          title: 'Upcoming Loan EMI',
          message: `Your ${loan.loanType} EMI of ₹${nextInstallment.amount} is due in ${daysUntilDue} days.`,
          date: nextInstallment.dueDate,
          read: false,
          actionUrl: `/loans/${loan._id}`
        });
      }
    }
  });

  // Sort by date descending
  return notifications.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

// ==================== INVESTMENT PROOF SUBMISSION ====================

export async function getInvestmentProofStatus(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<{
  declaration: any;
  pendingProofs: Array<{ section: string; type: string; amount: number }>;
  verifiedProofs: Array<{ section: string; type: string; declaredAmount: number; verifiedAmount: number }>;
  rejectedProofs: Array<{ section: string; type: string; reason: string }>;
  deadline: Date | null;
  isLocked: boolean;
}> {
  const declaration = await InvestmentDeclaration.findOne({
    tenantId,
    employeeId,
    financialYear
  }).lean();

  if (!declaration) {
    return {
      declaration: null,
      pendingProofs: [],
      verifiedProofs: [],
      rejectedProofs: [],
      deadline: null,
      isLocked: false
    };
  }

  const pendingProofs: Array<any> = [];
  const verifiedProofs: Array<any> = [];
  const rejectedProofs: Array<any> = [];

  // Process 80C investments
  declaration.section80C.forEach(inv => {
    if (inv.proofStatus === 'pending') {
      pendingProofs.push({ section: '80C', type: inv.type, amount: inv.declaredAmount });
    } else if (inv.proofStatus === 'verified') {
      verifiedProofs.push({
        section: '80C',
        type: inv.type,
        declaredAmount: inv.declaredAmount,
        verifiedAmount: inv.verifiedAmount || 0
      });
    } else if (inv.proofStatus === 'rejected') {
      rejectedProofs.push({
        section: '80C',
        type: inv.type,
        reason: inv.verificationRemarks || 'Proof not acceptable'
      });
    }
  });

  // Process 80D investments
  declaration.section80D.forEach(inv => {
    if (inv.proofStatus === 'pending') {
      pendingProofs.push({ section: '80D', type: inv.type, amount: inv.declaredAmount });
    } else if (inv.proofStatus === 'verified') {
      verifiedProofs.push({
        section: '80D',
        type: inv.type,
        declaredAmount: inv.declaredAmount,
        verifiedAmount: inv.verifiedAmount || 0
      });
    } else if (inv.proofStatus === 'rejected') {
      rejectedProofs.push({
        section: '80D',
        type: inv.type,
        reason: inv.verificationRemarks || 'Proof not acceptable'
      });
    }
  });

  // Process HRA
  if (declaration.hra) {
    const hra = declaration.hra;
    if (hra.proofStatus === 'pending') {
      pendingProofs.push({ section: 'HRA', type: 'Rent Receipts', amount: hra.monthlyRentPaid * 12 });
    } else if (hra.proofStatus === 'verified') {
      verifiedProofs.push({
        section: 'HRA',
        type: 'Rent Receipts',
        declaredAmount: hra.monthlyRentPaid * 12,
        verifiedAmount: hra.verifiedAmount || 0
      });
    } else if (hra.proofStatus === 'rejected') {
      rejectedProofs.push({
        section: 'HRA',
        type: 'Rent Receipts',
        reason: hra.verificationRemarks || 'Proof not acceptable'
      });
    }
  }

  // Set deadline (typically January 31 or as per company policy)
  const yearParts = financialYear.split('-');
  const deadline = new Date(parseInt(yearParts[1]), 0, 31); // January 31 of next year

  return {
    declaration,
    pendingProofs,
    verifiedProofs,
    rejectedProofs,
    deadline,
    isLocked: declaration.isLocked || false
  };
}
