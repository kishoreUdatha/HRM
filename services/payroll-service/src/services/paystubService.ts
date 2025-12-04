import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Paystub, { IPaystub } from '../models/Paystub';

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = '';
  if (crore) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder) result += convertLessThanThousand(remainder);

  return result.trim() + ' Rupees Only';
};

export async function generatePaystub(
  tenantId: string,
  employeeId: string,
  month: number,
  year: number,
  data: Partial<IPaystub>
): Promise<IPaystub> {
  // Check for existing paystub
  let paystub = await Paystub.findOne({
    tenantId,
    employeeId,
    'payPeriod.month': month,
    'payPeriod.year': year
  });

  // Calculate YTD values
  const ytdPaystubs = await Paystub.find({
    tenantId,
    employeeId,
    'payPeriod.year': year,
    'payPeriod.month': { $lt: month },
    status: { $in: ['approved', 'paid'] }
  });

  const ytdGrossEarnings = ytdPaystubs.reduce((sum, p) => sum + (p.summary?.grossEarnings || 0), 0);
  const ytdTotalDeductions = ytdPaystubs.reduce((sum, p) => sum + (p.summary?.totalDeductions || 0), 0);
  const ytdNetPay = ytdPaystubs.reduce((sum, p) => sum + (p.summary?.netPay || 0), 0);
  const ytdTaxDeducted = ytdPaystubs.reduce((sum, p) => sum + (p.taxDetails?.taxDeductedThisMonth || 0), 0);

  // Calculate earnings YTD for each component
  if (data.earnings) {
    data.earnings = data.earnings.map(earning => {
      const ytdAmount = ytdPaystubs.reduce((sum, p) => {
        const comp = p.earnings?.find(e => e.code === earning.code);
        return sum + (comp?.amount || 0);
      }, 0) + earning.amount;
      return { ...earning, ytdAmount };
    });
  }

  // Calculate deductions YTD
  if (data.deductions) {
    data.deductions = data.deductions.map(deduction => {
      const ytdEmployee = ytdPaystubs.reduce((sum, p) => {
        const comp = p.deductions?.find(d => d.code === deduction.code);
        return sum + (comp?.employeeAmount || 0);
      }, 0) + deduction.employeeAmount;
      const ytdEmployer = ytdPaystubs.reduce((sum, p) => {
        const comp = p.deductions?.find(d => d.code === deduction.code);
        return sum + (comp?.employerAmount || 0);
      }, 0) + deduction.employerAmount;
      return { ...deduction, ytdEmployeeAmount: ytdEmployee, ytdEmployerAmount: ytdEmployer };
    });
  }

  // Calculate summary
  const grossEarnings = data.earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalDeductions = data.deductions?.reduce((sum, d) => sum + d.employeeAmount, 0) || 0;
  const netPay = grossEarnings - totalDeductions;

  const summary = {
    grossEarnings,
    totalDeductions,
    netPay,
    ytdGrossEarnings: ytdGrossEarnings + grossEarnings,
    ytdTotalDeductions: ytdTotalDeductions + totalDeductions,
    ytdNetPay: ytdNetPay + netPay,
    inWords: numberToWords(Math.round(netPay))
  };

  // Update tax details with YTD
  if (data.taxDetails) {
    data.taxDetails.ytdTaxDeducted = ytdTaxDeducted + (data.taxDetails.taxDeductedThisMonth || 0);
  }

  if (paystub) {
    Object.assign(paystub, data, { summary });
  } else {
    paystub = new Paystub({
      tenantId,
      employeeId,
      ...data,
      summary
    });
  }

  await paystub.save();
  return paystub;
}

export async function generatePaystubPDF(paystub: IPaystub, companyDetails: { name: string; address: string; logo?: string }): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  let y = height - 40;

  // Header
  page.drawText(companyDetails.name, { x: 50, y, font: boldFont, size: 16 });
  y -= 15;
  page.drawText(companyDetails.address, { x: 50, y, font, size: 9 });
  y -= 30;

  // Pay slip title
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const payPeriod = `${monthNames[paystub.payPeriod.month - 1]} ${paystub.payPeriod.year}`;
  page.drawText(`PAYSLIP FOR ${payPeriod.toUpperCase()}`, { x: 200, y, font: boldFont, size: 14 });
  y -= 30;

  // Employee details box
  page.drawRectangle({ x: 45, y: y - 80, width: 250, height: 85, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
  page.drawRectangle({ x: 300, y: y - 80, width: 250, height: 85, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });

  let leftY = y - 15;
  page.drawText('Employee Details', { x: 50, y: leftY, font: boldFont, size: 10 });
  leftY -= 15;
  page.drawText(`Name: ${paystub.employeeDetails.name}`, { x: 50, y: leftY, font, size: 9 });
  leftY -= 12;
  page.drawText(`Employee ID: ${paystub.employeeDetails.employeeCode}`, { x: 50, y: leftY, font, size: 9 });
  leftY -= 12;
  page.drawText(`Department: ${paystub.employeeDetails.department}`, { x: 50, y: leftY, font, size: 9 });
  leftY -= 12;
  page.drawText(`Designation: ${paystub.employeeDetails.designation}`, { x: 50, y: leftY, font, size: 9 });

  let rightY = y - 15;
  page.drawText('Pay Details', { x: 305, y: rightY, font: boldFont, size: 10 });
  rightY -= 15;
  page.drawText(`PAN: ${paystub.employeeDetails.pan}`, { x: 305, y: rightY, font, size: 9 });
  rightY -= 12;
  page.drawText(`UAN: ${paystub.employeeDetails.uan || 'N/A'}`, { x: 305, y: rightY, font, size: 9 });
  rightY -= 12;
  page.drawText(`Bank: ${paystub.employeeDetails.bankName}`, { x: 305, y: rightY, font, size: 9 });
  rightY -= 12;
  page.drawText(`A/C: ${paystub.employeeDetails.bankAccountNumber}`, { x: 305, y: rightY, font, size: 9 });

  y -= 95;

  // Attendance Summary
  page.drawText('Attendance Summary', { x: 50, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`Working Days: ${paystub.payPeriod.workingDays}  |  Paid Days: ${paystub.payPeriod.paidDays}  |  LOP Days: ${paystub.payPeriod.lopDays}`, { x: 50, y, font, size: 9 });
  y -= 25;

  // Earnings and Deductions Table
  const tableStartY = y;
  const colWidth = 250;

  // Headers
  page.drawRectangle({ x: 45, y: y - 20, width: colWidth, height: 20, color: rgb(0.9, 0.9, 0.9) });
  page.drawRectangle({ x: 300, y: y - 20, width: colWidth, height: 20, color: rgb(0.9, 0.9, 0.9) });
  page.drawText('EARNINGS', { x: 130, y: y - 14, font: boldFont, size: 10 });
  page.drawText('DEDUCTIONS', { x: 380, y: y - 14, font: boldFont, size: 10 });
  y -= 20;

  // Sub-headers
  page.drawText('Component', { x: 50, y: y - 12, font: boldFont, size: 8 });
  page.drawText('Amount', { x: 180, y: y - 12, font: boldFont, size: 8 });
  page.drawText('YTD', { x: 240, y: y - 12, font: boldFont, size: 8 });
  page.drawText('Component', { x: 305, y: y - 12, font: boldFont, size: 8 });
  page.drawText('Amount', { x: 435, y: y - 12, font: boldFont, size: 8 });
  page.drawText('YTD', { x: 495, y: y - 12, font: boldFont, size: 8 });
  y -= 18;

  // Earnings
  let earningsY = y;
  for (const earning of paystub.earnings || []) {
    page.drawText(earning.name, { x: 50, y: earningsY, font, size: 8 });
    page.drawText(`₹${earning.amount.toLocaleString('en-IN')}`, { x: 180, y: earningsY, font, size: 8 });
    page.drawText(`₹${earning.ytdAmount.toLocaleString('en-IN')}`, { x: 240, y: earningsY, font, size: 8 });
    earningsY -= 12;
  }

  // Deductions
  let deductionsY = y;
  for (const deduction of paystub.deductions || []) {
    page.drawText(deduction.name, { x: 305, y: deductionsY, font, size: 8 });
    page.drawText(`₹${deduction.employeeAmount.toLocaleString('en-IN')}`, { x: 435, y: deductionsY, font, size: 8 });
    page.drawText(`₹${deduction.ytdEmployeeAmount.toLocaleString('en-IN')}`, { x: 495, y: deductionsY, font, size: 8 });
    deductionsY -= 12;
  }

  y = Math.min(earningsY, deductionsY) - 10;

  // Totals
  page.drawLine({ start: { x: 45, y }, end: { x: 295, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  page.drawLine({ start: { x: 300, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 15;

  page.drawText('Gross Earnings:', { x: 50, y, font: boldFont, size: 9 });
  page.drawText(`₹${paystub.summary.grossEarnings.toLocaleString('en-IN')}`, { x: 180, y, font: boldFont, size: 9 });
  page.drawText(`₹${paystub.summary.ytdGrossEarnings.toLocaleString('en-IN')}`, { x: 240, y, font: boldFont, size: 9 });

  page.drawText('Total Deductions:', { x: 305, y, font: boldFont, size: 9 });
  page.drawText(`₹${paystub.summary.totalDeductions.toLocaleString('en-IN')}`, { x: 435, y, font: boldFont, size: 9 });
  page.drawText(`₹${paystub.summary.ytdTotalDeductions.toLocaleString('en-IN')}`, { x: 495, y, font: boldFont, size: 9 });

  y -= 30;

  // Net Pay Box
  page.drawRectangle({ x: 45, y: y - 40, width: 505, height: 45, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
  page.drawText('NET PAY', { x: 50, y: y - 15, font: boldFont, size: 12 });
  page.drawText(`₹${paystub.summary.netPay.toLocaleString('en-IN')}`, { x: 450, y: y - 15, font: boldFont, size: 14 });
  page.drawText(`(${paystub.summary.inWords})`, { x: 50, y: y - 32, font, size: 9 });

  y -= 60;

  // Tax Details
  if (paystub.taxDetails) {
    page.drawText('Tax Details', { x: 50, y, font: boldFont, size: 10 });
    y -= 15;
    page.drawText(`Tax Regime: ${paystub.taxDetails.regime === 'new' ? 'New Regime' : 'Old Regime'}`, { x: 50, y, font, size: 9 });
    page.drawText(`Tax This Month: ₹${paystub.taxDetails.taxDeductedThisMonth?.toLocaleString('en-IN') || 0}`, { x: 200, y, font, size: 9 });
    page.drawText(`YTD Tax: ₹${paystub.taxDetails.ytdTaxDeducted?.toLocaleString('en-IN') || 0}`, { x: 380, y, font, size: 9 });
    y -= 12;
    page.drawText(`Projected Annual Tax: ₹${paystub.taxDetails.projectedAnnualTax?.toLocaleString('en-IN') || 0}`, { x: 50, y, font, size: 9 });
    page.drawText(`Remaining Tax: ₹${paystub.taxDetails.remainingTax?.toLocaleString('en-IN') || 0}`, { x: 250, y, font, size: 9 });
  }

  y -= 30;

  // Leave Balance
  if (paystub.leaveBalance) {
    page.drawText('Leave Balance', { x: 50, y, font: boldFont, size: 10 });
    y -= 15;
    page.drawText(`Earned Leave: ${paystub.leaveBalance.earnedLeave} days`, { x: 50, y, font, size: 9 });
    page.drawText(`Sick Leave: ${paystub.leaveBalance.sickLeave} days`, { x: 200, y, font, size: 9 });
    page.drawText(`Casual Leave: ${paystub.leaveBalance.casualLeave} days`, { x: 350, y, font, size: 9 });
  }

  // Footer
  page.drawText('This is a computer-generated payslip and does not require a signature.', { x: 140, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function getPaystubHistory(tenantId: string, employeeId: string, year?: number): Promise<IPaystub[]> {
  const query: any = { tenantId, employeeId, status: { $in: ['approved', 'paid'] } };
  if (year) {
    query['payPeriod.year'] = year;
  }

  return Paystub.find(query).sort({ 'payPeriod.year': -1, 'payPeriod.month': -1 });
}

export async function getYTDSummary(tenantId: string, employeeId: string, year: number): Promise<any> {
  const paystubs = await Paystub.find({
    tenantId,
    employeeId,
    'payPeriod.year': year,
    status: { $in: ['approved', 'paid'] }
  });

  const earnings: Record<string, number> = {};
  const deductions: Record<string, number> = {};

  paystubs.forEach(p => {
    p.earnings?.forEach(e => {
      earnings[e.code] = (earnings[e.code] || 0) + e.amount;
    });
    p.deductions?.forEach(d => {
      deductions[d.code] = (deductions[d.code] || 0) + d.employeeAmount;
    });
  });

  return {
    year,
    monthsProcessed: paystubs.length,
    totalGrossEarnings: paystubs.reduce((sum, p) => sum + (p.summary?.grossEarnings || 0), 0),
    totalDeductions: paystubs.reduce((sum, p) => sum + (p.summary?.totalDeductions || 0), 0),
    totalNetPay: paystubs.reduce((sum, p) => sum + (p.summary?.netPay || 0), 0),
    totalTaxDeducted: paystubs.reduce((sum, p) => sum + (p.taxDetails?.taxDeductedThisMonth || 0), 0),
    earningsBreakdown: earnings,
    deductionsBreakdown: deductions
  };
}

export async function bulkGeneratePaystubs(
  tenantId: string,
  employeeIds: string[],
  month: number,
  year: number,
  employeeDataMap: Record<string, Partial<IPaystub>>
): Promise<{ success: IPaystub[]; failed: Array<{ employeeId: string; error: string }> }> {
  const success: IPaystub[] = [];
  const failed: Array<{ employeeId: string; error: string }> = [];

  for (const employeeId of employeeIds) {
    try {
      const data = employeeDataMap[employeeId];
      if (!data) {
        failed.push({ employeeId, error: 'No paystub data provided' });
        continue;
      }
      const paystub = await generatePaystub(tenantId, employeeId, month, year, data);
      success.push(paystub);
    } catch (error) {
      failed.push({ employeeId, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { success, failed };
}

export async function comparePaystubs(
  tenantId: string,
  employeeId: string,
  period1: { month: number; year: number },
  period2: { month: number; year: number }
): Promise<{
  period1: IPaystub | null;
  period2: IPaystub | null;
  comparison: {
    grossEarningsDiff: number;
    grossEarningsPctChange: number;
    netPayDiff: number;
    netPayPctChange: number;
    deductionsDiff: number;
    deductionsPctChange: number;
    earningsComparison: Array<{ code: string; name: string; period1Amount: number; period2Amount: number; diff: number }>;
    deductionsComparison: Array<{ code: string; name: string; period1Amount: number; period2Amount: number; diff: number }>;
  } | null;
}> {
  const [paystub1, paystub2] = await Promise.all([
    Paystub.findOne({
      tenantId,
      employeeId,
      'payPeriod.month': period1.month,
      'payPeriod.year': period1.year
    }),
    Paystub.findOne({
      tenantId,
      employeeId,
      'payPeriod.month': period2.month,
      'payPeriod.year': period2.year
    })
  ]);

  if (!paystub1 || !paystub2) {
    return { period1: paystub1, period2: paystub2, comparison: null };
  }

  const grossDiff = paystub2.summary.grossEarnings - paystub1.summary.grossEarnings;
  const netDiff = paystub2.summary.netPay - paystub1.summary.netPay;
  const dedDiff = paystub2.summary.totalDeductions - paystub1.summary.totalDeductions;

  // Collect all unique earning codes
  const allEarningCodes = new Set<string>();
  paystub1.earnings?.forEach(e => allEarningCodes.add(e.code));
  paystub2.earnings?.forEach(e => allEarningCodes.add(e.code));

  const earningsComparison = Array.from(allEarningCodes).map(code => {
    const e1 = paystub1.earnings?.find(e => e.code === code);
    const e2 = paystub2.earnings?.find(e => e.code === code);
    return {
      code,
      name: e1?.name || e2?.name || code,
      period1Amount: e1?.amount || 0,
      period2Amount: e2?.amount || 0,
      diff: (e2?.amount || 0) - (e1?.amount || 0)
    };
  });

  // Collect all unique deduction codes
  const allDeductionCodes = new Set<string>();
  paystub1.deductions?.forEach(d => allDeductionCodes.add(d.code));
  paystub2.deductions?.forEach(d => allDeductionCodes.add(d.code));

  const deductionsComparison = Array.from(allDeductionCodes).map(code => {
    const d1 = paystub1.deductions?.find(d => d.code === code);
    const d2 = paystub2.deductions?.find(d => d.code === code);
    return {
      code,
      name: d1?.name || d2?.name || code,
      period1Amount: d1?.employeeAmount || 0,
      period2Amount: d2?.employeeAmount || 0,
      diff: (d2?.employeeAmount || 0) - (d1?.employeeAmount || 0)
    };
  });

  return {
    period1: paystub1,
    period2: paystub2,
    comparison: {
      grossEarningsDiff: grossDiff,
      grossEarningsPctChange: paystub1.summary.grossEarnings ? (grossDiff / paystub1.summary.grossEarnings) * 100 : 0,
      netPayDiff: netDiff,
      netPayPctChange: paystub1.summary.netPay ? (netDiff / paystub1.summary.netPay) * 100 : 0,
      deductionsDiff: dedDiff,
      deductionsPctChange: paystub1.summary.totalDeductions ? (dedDiff / paystub1.summary.totalDeductions) * 100 : 0,
      earningsComparison,
      deductionsComparison
    }
  };
}

export async function markPaystubAsEmailed(paystubId: string): Promise<IPaystub | null> {
  return Paystub.findByIdAndUpdate(
    paystubId,
    { emailSent: true, emailSentAt: new Date() },
    { new: true }
  );
}

export async function getPaystubsByStatus(
  tenantId: string,
  status: 'draft' | 'processed' | 'approved' | 'paid' | 'cancelled',
  month?: number,
  year?: number
): Promise<IPaystub[]> {
  const query: any = { tenantId, status };
  if (month) query['payPeriod.month'] = month;
  if (year) query['payPeriod.year'] = year;

  return Paystub.find(query).sort({ 'payPeriod.year': -1, 'payPeriod.month': -1, employeeId: 1 });
}

export async function cancelPaystub(paystubId: string, reason?: string): Promise<IPaystub | null> {
  const paystub = await Paystub.findById(paystubId);
  if (!paystub) return null;

  if (paystub.status === 'paid') {
    throw new Error('Cannot cancel a paid paystub');
  }

  paystub.status = 'cancelled';
  await paystub.save();
  return paystub;
}

export async function getMonthlyPaystubStats(
  tenantId: string,
  month: number,
  year: number
): Promise<{
  totalEmployees: number;
  totalGrossEarnings: number;
  totalDeductions: number;
  totalNetPay: number;
  totalTaxDeducted: number;
  statusBreakdown: Record<string, number>;
  averageNetPay: number;
}> {
  const paystubs = await Paystub.find({
    tenantId,
    'payPeriod.month': month,
    'payPeriod.year': year
  });

  const statusBreakdown: Record<string, number> = {};
  paystubs.forEach(p => {
    statusBreakdown[p.status] = (statusBreakdown[p.status] || 0) + 1;
  });

  const totalGrossEarnings = paystubs.reduce((sum, p) => sum + (p.summary?.grossEarnings || 0), 0);
  const totalDeductions = paystubs.reduce((sum, p) => sum + (p.summary?.totalDeductions || 0), 0);
  const totalNetPay = paystubs.reduce((sum, p) => sum + (p.summary?.netPay || 0), 0);
  const totalTaxDeducted = paystubs.reduce((sum, p) => sum + (p.taxDetails?.taxDeductedThisMonth || 0), 0);

  return {
    totalEmployees: paystubs.length,
    totalGrossEarnings,
    totalDeductions,
    totalNetPay,
    totalTaxDeducted,
    statusBreakdown,
    averageNetPay: paystubs.length > 0 ? totalNetPay / paystubs.length : 0
  };
}
