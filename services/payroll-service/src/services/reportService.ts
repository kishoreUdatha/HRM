import Payroll from '../models/Payroll';
import Paystub from '../models/Paystub';
import PayrollBatch from '../models/PayrollBatch';
import Loan from '../models/Loan';
import Reimbursement from '../models/Reimbursement';
import Bonus from '../models/Bonus';
import SalaryRevision from '../models/SalaryRevision';

export interface PayrollSummaryReport {
  period: { month: number; year: number };
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  totalTaxDeducted: number;
  totalEmployerContributions: number;
  totalCTC: number;
  departmentBreakdown: Array<{
    department: string;
    employeeCount: number;
    grossSalary: number;
    netSalary: number;
  }>;
  statusBreakdown: Record<string, number>;
}

export async function generatePayrollSummaryReport(
  tenantId: string,
  month: number,
  year: number,
  departmentMapping?: Record<string, string>
): Promise<PayrollSummaryReport> {
  const payrolls = await Payroll.find({
    tenantId,
    month,
    year
  }).lean();

  const departmentBreakdown: Record<string, { employeeCount: number; grossSalary: number; netSalary: number }> = {};
  const statusBreakdown: Record<string, number> = {};

  let totalGrossSalary = 0;
  let totalDeductions = 0;
  let totalNetSalary = 0;
  let totalTaxDeducted = 0;
  let totalEmployerContributions = 0;

  payrolls.forEach(p => {
    totalGrossSalary += p.grossSalary || 0;
    totalDeductions += p.totalDeductions || 0;
    totalNetSalary += p.netSalary || 0;
    totalTaxDeducted += p.incomeTax || 0;

    statusBreakdown[p.status] = (statusBreakdown[p.status] || 0) + 1;

    const dept = departmentMapping?.[p.employeeId.toString()] || 'Unassigned';
    if (!departmentBreakdown[dept]) {
      departmentBreakdown[dept] = { employeeCount: 0, grossSalary: 0, netSalary: 0 };
    }
    departmentBreakdown[dept].employeeCount += 1;
    departmentBreakdown[dept].grossSalary += p.grossSalary || 0;
    departmentBreakdown[dept].netSalary += p.netSalary || 0;
  });

  return {
    period: { month, year },
    totalEmployees: payrolls.length,
    totalGrossSalary,
    totalDeductions,
    totalNetSalary,
    totalTaxDeducted,
    totalEmployerContributions,
    totalCTC: totalGrossSalary + totalEmployerContributions,
    departmentBreakdown: Object.entries(departmentBreakdown).map(([department, data]) => ({
      department,
      ...data
    })),
    statusBreakdown
  };
}

export interface CostCenterReport {
  period: { startDate: Date; endDate: Date };
  costCenters: Array<{
    costCenter: string;
    employeeCount: number;
    totalSalaryCost: number;
    totalEmployerContributions: number;
    totalReimbursements: number;
    totalBonuses: number;
    totalCost: number;
    monthlyBreakdown: Array<{ month: number; year: number; cost: number }>;
  }>;
  totalCost: number;
}

export async function generateCostCenterReport(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  costCenterMapping: Record<string, string>
): Promise<CostCenterReport> {
  const startMonth = startDate.getMonth() + 1;
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  const endYear = endDate.getFullYear();

  const payrolls = await Payroll.find({
    tenantId,
    $or: [
      { year: { $gt: startYear, $lt: endYear } },
      { year: startYear, month: { $gte: startMonth } },
      { year: endYear, month: { $lte: endMonth } }
    ]
  }).lean();

  const costCentersData: Record<string, {
    employeeIds: Set<string>;
    totalSalaryCost: number;
    totalEmployerContributions: number;
    monthlyBreakdown: Record<string, number>;
  }> = {};

  payrolls.forEach(p => {
    const costCenter = costCenterMapping[p.employeeId.toString()] || 'Unassigned';
    if (!costCentersData[costCenter]) {
      costCentersData[costCenter] = {
        employeeIds: new Set(),
        totalSalaryCost: 0,
        totalEmployerContributions: 0,
        monthlyBreakdown: {}
      };
    }

    costCentersData[costCenter].employeeIds.add(p.employeeId.toString());
    costCentersData[costCenter].totalSalaryCost += p.grossSalary || 0;

    const monthKey = `${p.year}-${p.month}`;
    costCentersData[costCenter].monthlyBreakdown[monthKey] =
      (costCentersData[costCenter].monthlyBreakdown[monthKey] || 0) + (p.grossSalary || 0);
  });

  let totalCost = 0;
  const costCenters = Object.entries(costCentersData).map(([costCenter, data]) => {
    const totalCostForCenter = data.totalSalaryCost + data.totalEmployerContributions;
    totalCost += totalCostForCenter;

    return {
      costCenter,
      employeeCount: data.employeeIds.size,
      totalSalaryCost: data.totalSalaryCost,
      totalEmployerContributions: data.totalEmployerContributions,
      totalReimbursements: 0,
      totalBonuses: 0,
      totalCost: totalCostForCenter,
      monthlyBreakdown: Object.entries(data.monthlyBreakdown).map(([key, cost]) => {
        const [year, month] = key.split('-').map(Number);
        return { month, year, cost };
      }).sort((a, b) => a.year - b.year || a.month - b.month)
    };
  });

  return {
    period: { startDate, endDate },
    costCenters,
    totalCost
  };
}

export interface TrendAnalysisReport {
  period: { startDate: Date; endDate: Date };
  monthlyTrends: Array<{
    month: number;
    year: number;
    totalPayroll: number;
    employeeCount: number;
    avgSalary: number;
    totalTax: number;
    growthPercentage: number;
  }>;
  yearOverYearComparison?: {
    currentYear: number;
    previousYear: number;
    payrollGrowth: number;
    headcountGrowth: number;
    avgSalaryGrowth: number;
  };
}

export async function generateTrendAnalysisReport(
  tenantId: string,
  months: number = 12
): Promise<TrendAnalysisReport> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const payrolls = await Payroll.find({
    tenantId,
    $or: [
      { year: { $gt: startDate.getFullYear(), $lt: endDate.getFullYear() } },
      { year: startDate.getFullYear(), month: { $gte: startDate.getMonth() + 1 } },
      { year: endDate.getFullYear(), month: { $lte: endDate.getMonth() + 1 } }
    ]
  }).lean();

  // Group by month/year
  const monthlyData: Record<string, { totalPayroll: number; employeeCount: number; totalTax: number }> = {};

  payrolls.forEach(p => {
    const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
    if (!monthlyData[key]) {
      monthlyData[key] = { totalPayroll: 0, employeeCount: 0, totalTax: 0 };
    }
    monthlyData[key].totalPayroll += p.grossSalary || 0;
    monthlyData[key].employeeCount += 1;
    monthlyData[key].totalTax += p.incomeTax || 0;
  });

  const sortedKeys = Object.keys(monthlyData).sort();
  let previousTotal = 0;

  const monthlyTrends = sortedKeys.map(key => {
    const [year, month] = key.split('-').map(Number);
    const data = monthlyData[key];
    const avgSalary = data.employeeCount > 0 ? Math.round(data.totalPayroll / data.employeeCount) : 0;
    const growthPercentage = previousTotal > 0
      ? Math.round(((data.totalPayroll - previousTotal) / previousTotal) * 10000) / 100
      : 0;

    previousTotal = data.totalPayroll;

    return {
      month,
      year,
      totalPayroll: data.totalPayroll,
      employeeCount: data.employeeCount,
      avgSalary,
      totalTax: data.totalTax,
      growthPercentage
    };
  });

  return {
    period: { startDate, endDate },
    monthlyTrends
  };
}

export interface ComplianceReport {
  tenantId: string;
  period: { month: number; year: number };
  pfCompliance: {
    totalEmployees: number;
    totalContribution: number;
    employeeContribution: number;
    employerContribution: number;
  };
  esiCompliance: {
    eligibleEmployees: number;
    totalContribution: number;
  };
  ptCompliance: {
    totalDeducted: number;
    employeeCount: number;
  };
  tdsCompliance: {
    totalTaxDeducted: number;
    employeeCount: number;
  };
}

export async function generateComplianceReport(
  tenantId: string,
  month: number,
  year: number
): Promise<ComplianceReport> {
  const payrolls = await Payroll.find({ tenantId, month, year }).lean();

  let pfEmployeeTotal = 0;
  let pfEmployerTotal = 0;
  let esiTotal = 0;
  let ptTotal = 0;
  let tdsTotal = 0;

  let pfEmployees = 0;
  let esiEmployees = 0;
  let ptEmployees = 0;
  let tdsEmployees = 0;

  payrolls.forEach(p => {
    p.deductions?.forEach(d => {
      if (d.code === 'PF') {
        pfEmployeeTotal += d.amount;
        pfEmployees++;
      }
      if (d.code === 'ESI') {
        esiTotal += d.amount;
        esiEmployees++;
      }
      if (d.code === 'PT') {
        ptTotal += d.amount;
        ptEmployees++;
      }
    });

    if (p.incomeTax > 0) {
      tdsTotal += p.incomeTax;
      tdsEmployees++;
    }
  });

  return {
    tenantId,
    period: { month, year },
    pfCompliance: {
      totalEmployees: pfEmployees,
      totalContribution: pfEmployeeTotal * 2, // Assuming equal employer contribution
      employeeContribution: pfEmployeeTotal,
      employerContribution: pfEmployeeTotal
    },
    esiCompliance: {
      eligibleEmployees: esiEmployees,
      totalContribution: esiTotal
    },
    ptCompliance: {
      totalDeducted: ptTotal,
      employeeCount: ptEmployees
    },
    tdsCompliance: {
      totalTaxDeducted: tdsTotal,
      employeeCount: tdsEmployees
    }
  };
}

export interface EmployeePayrollReport {
  employeeId: string;
  financialYear: string;
  monthlyPayroll: Array<{
    month: number;
    year: number;
    grossSalary: number;
    deductions: number;
    netSalary: number;
    tax: number;
  }>;
  ytdSummary: {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalTax: number;
  };
  loans: Array<{
    loanNumber: string;
    type: string;
    principal: number;
    outstanding: number;
    emiDeducted: number;
  }>;
  reimbursements: Array<{
    claimNumber: string;
    type: string;
    claimed: number;
    approved: number;
    paid: number;
  }>;
  bonuses: Array<{
    name: string;
    type: string;
    amount: number;
    paidAt: Date;
  }>;
}

export async function generateEmployeePayrollReport(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<EmployeePayrollReport> {
  const [fyStart, fyEnd] = financialYear.split('-').map(Number);

  // Get payroll data
  const payrolls = await Payroll.find({
    tenantId,
    employeeId,
    $or: [
      { year: fyStart, month: { $gte: 4 } },
      { year: fyEnd, month: { $lte: 3 } }
    ]
  }).sort({ year: 1, month: 1 }).lean();

  const monthlyPayroll = payrolls.map(p => ({
    month: p.month,
    year: p.year,
    grossSalary: p.grossSalary || 0,
    deductions: p.totalDeductions || 0,
    netSalary: p.netSalary || 0,
    tax: p.incomeTax || 0
  }));

  const ytdSummary = {
    totalGross: monthlyPayroll.reduce((s, p) => s + p.grossSalary, 0),
    totalDeductions: monthlyPayroll.reduce((s, p) => s + p.deductions, 0),
    totalNet: monthlyPayroll.reduce((s, p) => s + p.netSalary, 0),
    totalTax: monthlyPayroll.reduce((s, p) => s + p.tax, 0)
  };

  // Get loans
  const loans = await Loan.find({ tenantId, employeeId, status: { $in: ['active', 'closed'] } }).lean();
  const loanData = loans.map(l => ({
    loanNumber: l.loanNumber,
    type: l.loanType,
    principal: l.principalAmount,
    outstanding: l.remainingAmount,
    emiDeducted: l.paidAmount
  }));

  // Get reimbursements
  const reimbursements = await Reimbursement.find({
    tenantId,
    employeeId,
    createdAt: { $gte: new Date(fyStart, 3, 1), $lte: new Date(fyEnd + 1, 2, 31) }
  }).lean();

  const reimbursementData = reimbursements.map(r => ({
    claimNumber: r.claimNumber,
    type: r.claimType,
    claimed: r.totalClaimedAmount,
    approved: r.totalApprovedAmount,
    paid: r.status === 'paid' ? r.totalApprovedAmount : 0
  }));

  // Get bonuses
  const bonuses = await Bonus.find({
    tenantId,
    financialYear,
    'employees.employeeId': employeeId,
    status: 'paid'
  }).lean();

  const bonusData = bonuses.map(b => {
    const empBonus = b.employees.find(e => e.employeeId === employeeId);
    return {
      name: b.name,
      type: b.bonusType,
      amount: empBonus?.finalAmount || 0,
      paidAt: b.paidAt!
    };
  });

  return {
    employeeId,
    financialYear,
    monthlyPayroll,
    ytdSummary,
    loans: loanData,
    reimbursements: reimbursementData,
    bonuses: bonusData
  };
}

export async function generateVarianceReport(
  tenantId: string,
  month1: { month: number; year: number },
  month2: { month: number; year: number }
): Promise<{
  period1: { month: number; year: number; totalPayroll: number; employeeCount: number };
  period2: { month: number; year: number; totalPayroll: number; employeeCount: number };
  variance: {
    payrollDifference: number;
    payrollPercentageChange: number;
    headcountDifference: number;
    newJoiners: number;
    exits: number;
  };
}> {
  const [payrolls1, payrolls2] = await Promise.all([
    Payroll.find({ tenantId, month: month1.month, year: month1.year }).lean(),
    Payroll.find({ tenantId, month: month2.month, year: month2.year }).lean()
  ]);

  const total1 = payrolls1.reduce((s, p) => s + (p.grossSalary || 0), 0);
  const total2 = payrolls2.reduce((s, p) => s + (p.grossSalary || 0), 0);

  const employees1 = new Set(payrolls1.map(p => p.employeeId.toString()));
  const employees2 = new Set(payrolls2.map(p => p.employeeId.toString()));

  const newJoiners = [...employees2].filter(e => !employees1.has(e)).length;
  const exits = [...employees1].filter(e => !employees2.has(e)).length;

  return {
    period1: {
      ...month1,
      totalPayroll: total1,
      employeeCount: payrolls1.length
    },
    period2: {
      ...month2,
      totalPayroll: total2,
      employeeCount: payrolls2.length
    },
    variance: {
      payrollDifference: total2 - total1,
      payrollPercentageChange: total1 > 0 ? Math.round(((total2 - total1) / total1) * 10000) / 100 : 0,
      headcountDifference: payrolls2.length - payrolls1.length,
      newJoiners,
      exits
    }
  };
}
