import FullAndFinal, { IFullAndFinal, IFnFComponent } from '../models/FullAndFinal';
import Loan from '../models/Loan';
import { createAuditLog } from './auditService';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function generateFnFNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FNF-${timestamp}-${random}`;
}

function numberToWords(num: number): string {
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
  const remainder = Math.floor(num % 1000);

  let result = '';
  if (crore) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder) result += convertLessThanThousand(remainder);

  return result.trim() + ' Rupees Only';
}

export async function initiateFnF(
  tenantId: string,
  employeeId: string,
  data: {
    separationType: IFullAndFinal['separationType'];
    lastWorkingDate: Date;
    resignationDate?: Date;
    noticePeriodDays: number;
    noticePeriodServed: number;
    employeeDetails: IFullAndFinal['employeeDetails'];
    salaryDetails: IFullAndFinal['salaryDetails'];
    initiatedBy: string;
    clearanceDepartments?: string[];
  }
): Promise<IFullAndFinal> {
  const noticePeriodShortfall = Math.max(0, data.noticePeriodDays - data.noticePeriodServed);

  // Calculate total service
  const joiningDate = new Date(data.employeeDetails.dateOfJoining);
  const lwdDate = new Date(data.lastWorkingDate);
  const totalServiceDays = Math.floor((lwdDate.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalServiceYears = totalServiceDays / 365;

  const fnf = new FullAndFinal({
    tenantId,
    employeeId,
    fnfNumber: generateFnFNumber(),
    separationType: data.separationType,
    lastWorkingDate: data.lastWorkingDate,
    resignationDate: data.resignationDate,
    noticePeriodDays: data.noticePeriodDays,
    noticePeriodServed: data.noticePeriodServed,
    noticePeriodShortfall,
    employeeDetails: {
      ...data.employeeDetails,
      totalServiceDays,
      totalServiceYears: Math.round(totalServiceYears * 100) / 100
    },
    salaryDetails: data.salaryDetails,
    earnings: [],
    deductions: [],
    recoveries: [],
    status: 'initiated',
    initiatedBy: data.initiatedBy,
    initiatedAt: new Date(),
    clearances: (data.clearanceDepartments || ['HR', 'IT', 'Finance', 'Admin']).map(dept => ({
      department: dept,
      status: 'pending'
    }))
  });

  await fnf.save();

  await createAuditLog({
    tenantId,
    entityType: 'payroll',
    entityId: fnf._id.toString(),
    action: 'create',
    performedBy: data.initiatedBy,
    metadata: { employeeId }
  });

  return fnf;
}

export async function calculateFnFComponents(fnfId: string): Promise<IFullAndFinal | null> {
  const fnf = await FullAndFinal.findById(fnfId);
  if (!fnf) return null;

  const earnings: IFnFComponent[] = [];
  const deductions: IFnFComponent[] = [];
  const recoveries: IFnFComponent[] = [];

  // 1. Calculate Gratuity (if eligible - 5+ years)
  if (fnf.employeeDetails.totalServiceYears >= 5) {
    const gratuityAmount = Math.round(
      (fnf.salaryDetails.lastDrawnBasic * 15 * fnf.employeeDetails.totalServiceYears) / 26
    );
    const exemptLimit = 2000000; // 20 Lakhs
    const exemptAmount = Math.min(gratuityAmount, exemptLimit);
    const taxableAmount = Math.max(0, gratuityAmount - exemptLimit);

    fnf.gratuityDetails = {
      eligible: true,
      yearsOfService: fnf.employeeDetails.totalServiceYears,
      lastDrawnBasic: fnf.salaryDetails.lastDrawnBasic,
      calculatedAmount: gratuityAmount,
      taxableAmount,
      exemptAmount
    };

    earnings.push({
      code: 'GRATUITY',
      name: 'Gratuity',
      type: 'earning',
      category: 'gratuity',
      amount: gratuityAmount,
      taxable: taxableAmount > 0
    });
  } else {
    fnf.gratuityDetails = {
      eligible: false,
      yearsOfService: fnf.employeeDetails.totalServiceYears,
      lastDrawnBasic: fnf.salaryDetails.lastDrawnBasic,
      calculatedAmount: 0,
      taxableAmount: 0,
      exemptAmount: 0,
      remarks: 'Not eligible - less than 5 years of service'
    };
  }

  // 2. Notice Period Recovery (if shortfall)
  if (fnf.noticePeriodShortfall > 0) {
    const perDayRate = Math.round(fnf.salaryDetails.lastDrawnGross / 30);
    const recoveryAmount = perDayRate * fnf.noticePeriodShortfall;

    fnf.noticePeriodRecovery = {
      daysShort: fnf.noticePeriodShortfall,
      perDayRate,
      amount: recoveryAmount,
      waived: false
    };

    recoveries.push({
      code: 'NOTICE_RECOVERY',
      name: 'Notice Period Recovery',
      type: 'recovery',
      category: 'notice_recovery',
      amount: recoveryAmount,
      taxable: false
    });
  }

  // 3. Loan Recovery
  const activeLoans = await Loan.find({
    tenantId: fnf.tenantId,
    employeeId: fnf.employeeId,
    status: 'active'
  }).lean();

  fnf.loanRecoveryDetails = [];
  for (const loan of activeLoans) {
    fnf.loanRecoveryDetails.push({
      loanId: loan._id.toString(),
      loanNumber: loan.loanNumber,
      outstandingAmount: loan.remainingAmount,
      recoveryAmount: loan.remainingAmount,
      waivedAmount: 0
    });

    recoveries.push({
      code: `LOAN_${loan.loanNumber}`,
      name: `Loan Recovery - ${loan.loanNumber}`,
      type: 'recovery',
      category: 'loan_recovery',
      amount: loan.remainingAmount,
      taxable: false
    });
  }

  fnf.earnings = earnings;
  fnf.deductions = deductions;
  fnf.recoveries = recoveries;

  // Calculate summary
  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalRecoveries = recoveries.reduce((sum, r) => sum + r.amount, 0);
  const netPayable = totalEarnings - totalDeductions - totalRecoveries;

  fnf.summary = {
    totalEarnings,
    totalDeductions,
    totalRecoveries,
    netPayable,
    inWords: numberToWords(Math.abs(Math.round(netPayable)))
  };

  fnf.status = 'pending_clearance';
  await fnf.save();

  return fnf;
}

export async function addFnFComponent(
  fnfId: string,
  component: IFnFComponent
): Promise<IFullAndFinal | null> {
  const fnf = await FullAndFinal.findById(fnfId);
  if (!fnf) return null;

  if (component.type === 'earning') {
    fnf.earnings.push(component);
  } else if (component.type === 'deduction') {
    fnf.deductions.push(component);
  } else {
    fnf.recoveries.push(component);
  }

  // Recalculate summary
  const totalEarnings = fnf.earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalDeductions = fnf.deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalRecoveries = fnf.recoveries.reduce((sum, r) => sum + r.amount, 0);
  const netPayable = totalEarnings - totalDeductions - totalRecoveries;

  fnf.summary = {
    totalEarnings,
    totalDeductions,
    totalRecoveries,
    netPayable,
    inWords: numberToWords(Math.abs(Math.round(netPayable)))
  };

  await fnf.save();
  return fnf;
}

export async function recordClearance(
  fnfId: string,
  department: string,
  clearedBy: string,
  cleared: boolean,
  remarks?: string
): Promise<IFullAndFinal | null> {
  const fnf = await FullAndFinal.findById(fnfId);
  if (!fnf) return null;

  const clearance = fnf.clearances.find(c => c.department === department);
  if (clearance) {
    clearance.status = cleared ? 'cleared' : 'rejected';
    clearance.clearedBy = clearedBy;
    clearance.clearedAt = new Date();
    clearance.remarks = remarks;
  }

  // Check if all clearances are done
  const allCleared = fnf.clearances.every(c => c.status === 'cleared');
  const anyRejected = fnf.clearances.some(c => c.status === 'rejected');

  if (allCleared) {
    fnf.status = 'pending_approval';
  } else if (anyRejected) {
    // Still pending clearance
  }

  await fnf.save();
  return fnf;
}

export async function approveFnF(
  fnfId: string,
  approverId: string,
  approved: boolean,
  comments?: string
): Promise<IFullAndFinal | null> {
  const fnf = await FullAndFinal.findById(fnfId);
  if (!fnf) return null;

  if (approved) {
    fnf.status = 'approved';
    fnf.approvedBy = approverId;
    fnf.approvedAt = new Date();
  } else {
    fnf.status = 'pending_clearance'; // Send back for review
  }

  await fnf.save();

  await createAuditLog({
    tenantId: fnf.tenantId,
    entityType: 'payroll',
    entityId: fnfId,
    action: approved ? 'approve' : 'reject',
    performedBy: approverId,
    metadata: {
      employeeId: fnf.employeeId,
      amount: fnf.summary.netPayable,
      comments
    }
  });

  return fnf;
}

export async function processFnFPayment(
  fnfId: string,
  paymentDetails: {
    paymentMode: IFullAndFinal['paymentMode'];
    paymentReference?: string;
  }
): Promise<IFullAndFinal | null> {
  const fnf = await FullAndFinal.findById(fnfId);
  if (!fnf || fnf.status !== 'approved') return null;

  fnf.status = 'paid';
  fnf.paidAt = new Date();
  fnf.paymentMode = paymentDetails.paymentMode;
  fnf.paymentReference = paymentDetails.paymentReference;

  // Close any active loans
  if (fnf.loanRecoveryDetails && fnf.loanRecoveryDetails.length > 0) {
    for (const loan of fnf.loanRecoveryDetails) {
      await Loan.findByIdAndUpdate(loan.loanId, {
        status: 'closed',
        closedAt: new Date(),
        closureType: 'foreclosure'
      });
    }
  }

  await fnf.save();

  await createAuditLog({
    tenantId: fnf.tenantId,
    entityType: 'payroll',
    entityId: fnfId,
    action: 'pay',
    performedBy: 'system',
    metadata: {
      employeeId: fnf.employeeId,
      amount: fnf.summary.netPayable
    }
  });

  return fnf;
}

export async function waiveNoticePeriodRecovery(
  fnfId: string,
  waivedBy: string,
  waiverReason: string
): Promise<IFullAndFinal | null> {
  const fnf = await FullAndFinal.findById(fnfId);
  if (!fnf || !fnf.noticePeriodRecovery) return null;

  fnf.noticePeriodRecovery.waived = true;
  fnf.noticePeriodRecovery.waivedBy = waivedBy;
  fnf.noticePeriodRecovery.waiverReason = waiverReason;

  // Remove from recoveries
  fnf.recoveries = fnf.recoveries.filter(r => r.code !== 'NOTICE_RECOVERY');

  // Recalculate summary
  const totalEarnings = fnf.earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalDeductions = fnf.deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalRecoveries = fnf.recoveries.reduce((sum, r) => sum + r.amount, 0);
  const netPayable = totalEarnings - totalDeductions - totalRecoveries;

  fnf.summary = { totalEarnings, totalDeductions, totalRecoveries, netPayable, inWords: numberToWords(Math.abs(Math.round(netPayable))) };

  await fnf.save();
  return fnf;
}

export async function getFnFDetails(fnfId: string): Promise<IFullAndFinal | null> {
  return FullAndFinal.findById(fnfId).lean();
}

export async function getEmployeeFnF(tenantId: string, employeeId: string): Promise<IFullAndFinal | null> {
  return FullAndFinal.findOne({ tenantId, employeeId }).lean();
}

export async function getPendingFnFList(tenantId: string): Promise<IFullAndFinal[]> {
  return FullAndFinal.find({
    tenantId,
    status: { $in: ['initiated', 'pending_clearance', 'pending_approval'] }
  }).sort({ initiatedAt: 1 }).lean();
}

export async function generateFnFStatement(fnf: IFullAndFinal, companyDetails: { name: string; address: string }): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText(companyDetails.name, { x: 50, y, font: boldFont, size: 16 });
  y -= 20;
  page.drawText(companyDetails.address, { x: 50, y, font, size: 10 });
  y -= 40;

  // Title
  page.drawText('FULL & FINAL SETTLEMENT STATEMENT', { x: 150, y, font: boldFont, size: 14 });
  y -= 30;

  // F&F Number and Date
  page.drawText(`F&F Number: ${fnf.fnfNumber}`, { x: 50, y, font, size: 10 });
  page.drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, { x: 400, y, font, size: 10 });
  y -= 30;

  // Employee Details Box
  page.drawRectangle({ x: 45, y: y - 80, width: 505, height: 85, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
  let detailY = y - 15;
  page.drawText('Employee Details', { x: 50, y: detailY, font: boldFont, size: 11 });
  detailY -= 15;
  page.drawText(`Name: ${fnf.employeeDetails.name}`, { x: 50, y: detailY, font, size: 10 });
  page.drawText(`Employee Code: ${fnf.employeeDetails.employeeCode}`, { x: 300, y: detailY, font, size: 10 });
  detailY -= 12;
  page.drawText(`Department: ${fnf.employeeDetails.department}`, { x: 50, y: detailY, font, size: 10 });
  page.drawText(`Designation: ${fnf.employeeDetails.designation}`, { x: 300, y: detailY, font, size: 10 });
  detailY -= 12;
  page.drawText(`Date of Joining: ${new Date(fnf.employeeDetails.dateOfJoining).toLocaleDateString('en-IN')}`, { x: 50, y: detailY, font, size: 10 });
  page.drawText(`Last Working Date: ${new Date(fnf.lastWorkingDate).toLocaleDateString('en-IN')}`, { x: 300, y: detailY, font, size: 10 });
  detailY -= 12;
  page.drawText(`Total Service: ${fnf.employeeDetails.totalServiceYears} years`, { x: 50, y: detailY, font, size: 10 });

  y -= 100;

  // Earnings Table
  page.drawText('EARNINGS', { x: 50, y, font: boldFont, size: 11 });
  y -= 15;
  for (const earning of fnf.earnings) {
    page.drawText(earning.name, { x: 50, y, font, size: 10 });
    page.drawText(`₹${earning.amount.toLocaleString('en-IN')}`, { x: 450, y, font, size: 10 });
    y -= 12;
  }
  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1 });
  y -= 12;
  page.drawText('Total Earnings', { x: 50, y, font: boldFont, size: 10 });
  page.drawText(`₹${fnf.summary.totalEarnings.toLocaleString('en-IN')}`, { x: 450, y, font: boldFont, size: 10 });
  y -= 25;

  // Recoveries Table
  if (fnf.recoveries.length > 0) {
    page.drawText('RECOVERIES', { x: 50, y, font: boldFont, size: 11 });
    y -= 15;
    for (const recovery of fnf.recoveries) {
      page.drawText(recovery.name, { x: 50, y, font, size: 10 });
      page.drawText(`₹${recovery.amount.toLocaleString('en-IN')}`, { x: 450, y, font, size: 10 });
      y -= 12;
    }
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1 });
    y -= 12;
    page.drawText('Total Recoveries', { x: 50, y, font: boldFont, size: 10 });
    page.drawText(`₹${fnf.summary.totalRecoveries.toLocaleString('en-IN')}`, { x: 450, y, font: boldFont, size: 10 });
    y -= 25;
  }

  // Net Payable
  page.drawRectangle({ x: 45, y: y - 40, width: 505, height: 45, color: rgb(0.95, 0.95, 0.95) });
  page.drawText('NET PAYABLE', { x: 50, y: y - 15, font: boldFont, size: 12 });
  page.drawText(`₹${fnf.summary.netPayable.toLocaleString('en-IN')}`, { x: 420, y: y - 15, font: boldFont, size: 14 });
  page.drawText(`(${fnf.summary.inWords})`, { x: 50, y: y - 32, font, size: 9 });

  y -= 60;

  // Footer
  page.drawText('This is a computer-generated statement.', { x: 180, y: 30, font, size: 8, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
