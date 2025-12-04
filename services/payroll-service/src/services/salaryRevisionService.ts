import SalaryRevision, { ISalaryRevision, ISalaryComponent } from '../models/SalaryRevision';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createAuditLog } from './auditService';

export async function createSalaryRevision(
  tenantId: string,
  employeeId: string,
  data: {
    revisionType: ISalaryRevision['revisionType'];
    effectiveDate: Date;
    previousSalary: ISalaryRevision['previousSalary'];
    newSalary: ISalaryRevision['newSalary'];
    components: ISalaryComponent[];
    reason: string;
    remarks?: string;
    createdBy: string;
  }
): Promise<ISalaryRevision> {
  const incrementAmount = data.newSalary.ctc - data.previousSalary.ctc;
  const incrementPercentage = data.previousSalary.ctc > 0
    ? ((incrementAmount / data.previousSalary.ctc) * 100)
    : 0;

  // Calculate arrears if effective date is in the past
  let arrearDetails;
  const today = new Date();
  if (data.effectiveDate < today) {
    const effectiveMonth = data.effectiveDate.getMonth();
    const effectiveYear = data.effectiveDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthsCount = (currentYear - effectiveYear) * 12 + (currentMonth - effectiveMonth);
    const monthlyDifference = (data.newSalary.gross - data.previousSalary.gross);
    const arrearAmount = monthlyDifference * monthsCount;

    if (monthsCount > 0 && arrearAmount > 0) {
      arrearDetails = {
        fromDate: data.effectiveDate,
        toDate: new Date(currentYear, currentMonth - 1, 1),
        monthsCount,
        arrearAmount,
        processed: false
      };
    }
  }

  const revision = new SalaryRevision({
    tenantId,
    employeeId,
    ...data,
    incrementAmount,
    incrementPercentage: Math.round(incrementPercentage * 100) / 100,
    arrearDetails,
    approvalStatus: 'pending'
  });

  await revision.save();

  await createAuditLog({
    tenantId,
    entityType: 'salary_revision',
    entityId: revision._id.toString(),
    action: 'create',
    performedBy: data.createdBy,
    newState: revision.toObject(),
    metadata: {
      employeeId,
      amount: incrementAmount,
      reason: data.reason
    }
  });

  return revision;
}

export async function approveSalaryRevision(
  revisionId: string,
  approverId: string,
  approved: boolean,
  rejectionReason?: string
): Promise<ISalaryRevision | null> {
  const revision = await SalaryRevision.findById(revisionId);
  if (!revision) return null;

  const previousState = revision.toObject();

  revision.approvalStatus = approved ? 'approved' : 'rejected';
  revision.approvedBy = approverId;
  revision.approvedAt = new Date();
  if (!approved && rejectionReason) {
    revision.rejectionReason = rejectionReason;
  }

  await revision.save();

  await createAuditLog({
    tenantId: revision.tenantId,
    entityType: 'salary_revision',
    entityId: revisionId,
    action: approved ? 'approve' : 'reject',
    performedBy: approverId,
    previousState,
    newState: revision.toObject(),
    metadata: {
      employeeId: revision.employeeId,
      amount: revision.incrementAmount,
      reason: rejectionReason
    }
  });

  return revision;
}

export async function getSalaryRevisionHistory(
  tenantId: string,
  employeeId: string
): Promise<ISalaryRevision[]> {
  return SalaryRevision.find({ tenantId, employeeId })
    .sort({ effectiveDate: -1 })
    .lean() as any;
}

export async function getPendingRevisions(tenantId: string): Promise<ISalaryRevision[]> {
  return SalaryRevision.find({ tenantId, approvalStatus: 'pending' })
    .sort({ createdAt: -1 })
    .lean() as any;
}

export async function calculateArrears(
  tenantId: string,
  employeeId: string,
  fromDate: Date,
  toDate: Date,
  monthlyDifference: number
): Promise<{ months: number; arrearAmount: number; breakdown: Array<{ month: number; year: number; amount: number }> }> {
  const breakdown: Array<{ month: number; year: number; amount: number }> = [];
  let current = new Date(fromDate);

  while (current <= toDate) {
    breakdown.push({
      month: current.getMonth() + 1,
      year: current.getFullYear(),
      amount: monthlyDifference
    });
    current.setMonth(current.getMonth() + 1);
  }

  return {
    months: breakdown.length,
    arrearAmount: breakdown.reduce((sum, b) => sum + b.amount, 0),
    breakdown
  };
}

export async function generateRevisionLetter(revision: ISalaryRevision, companyDetails: { name: string; address: string }, employeeName: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  let y = height - 50;

  // Company Header
  page.drawText(companyDetails.name, { x: 50, y, font: boldFont, size: 16 });
  y -= 20;
  page.drawText(companyDetails.address, { x: 50, y, font, size: 10 });
  y -= 40;

  // Date
  page.drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, { x: 450, y, font, size: 10 });
  y -= 40;

  // Title
  const title = revision.revisionType === 'promotion' ? 'PROMOTION LETTER' : 'SALARY REVISION LETTER';
  page.drawText(title, { x: 220, y, font: boldFont, size: 14 });
  y -= 40;

  // Employee Details
  page.drawText(`Dear ${employeeName},`, { x: 50, y, font, size: 11 });
  y -= 30;

  // Body
  const bodyText = revision.revisionType === 'promotion'
    ? `We are pleased to inform you about your promotion. Your revised compensation effective from ${revision.effectiveDate.toLocaleDateString('en-IN')} will be as follows:`
    : `We are pleased to inform you about your salary revision. Your revised compensation effective from ${revision.effectiveDate.toLocaleDateString('en-IN')} will be as follows:`;

  page.drawText(bodyText, { x: 50, y, font, size: 10, maxWidth: 500 });
  y -= 50;

  // Salary Table
  page.drawRectangle({ x: 50, y: y - 80, width: 500, height: 85, borderColor: rgb(0, 0, 0), borderWidth: 1 });

  page.drawText('Component', { x: 60, y: y - 15, font: boldFont, size: 10 });
  page.drawText('Previous', { x: 250, y: y - 15, font: boldFont, size: 10 });
  page.drawText('Revised', { x: 380, y: y - 15, font: boldFont, size: 10 });
  y -= 30;

  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1 });
  y -= 15;

  page.drawText('Basic Salary', { x: 60, y, font, size: 10 });
  page.drawText(`₹${revision.previousSalary.basic.toLocaleString('en-IN')}`, { x: 250, y, font, size: 10 });
  page.drawText(`₹${revision.newSalary.basic.toLocaleString('en-IN')}`, { x: 380, y, font, size: 10 });
  y -= 15;

  page.drawText('Gross Salary', { x: 60, y, font, size: 10 });
  page.drawText(`₹${revision.previousSalary.gross.toLocaleString('en-IN')}`, { x: 250, y, font, size: 10 });
  page.drawText(`₹${revision.newSalary.gross.toLocaleString('en-IN')}`, { x: 380, y, font, size: 10 });
  y -= 15;

  page.drawText('CTC', { x: 60, y, font: boldFont, size: 10 });
  page.drawText(`₹${revision.previousSalary.ctc.toLocaleString('en-IN')}`, { x: 250, y, font: boldFont, size: 10 });
  page.drawText(`₹${revision.newSalary.ctc.toLocaleString('en-IN')}`, { x: 380, y, font: boldFont, size: 10 });
  y -= 40;

  // Increment Details
  page.drawText(`Increment: ₹${revision.incrementAmount.toLocaleString('en-IN')} (${revision.incrementPercentage}%)`, { x: 50, y, font: boldFont, size: 11 });
  y -= 40;

  // Closing
  page.drawText('We appreciate your contributions and look forward to your continued success.', { x: 50, y, font, size: 10 });
  y -= 40;

  page.drawText('Best Regards,', { x: 50, y, font, size: 10 });
  y -= 20;
  page.drawText('HR Department', { x: 50, y, font, size: 10 });
  y -= 15;
  page.drawText(companyDetails.name, { x: 50, y, font: boldFont, size: 10 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function markArrearAsProcessed(
  revisionId: string,
  payrollId: string
): Promise<ISalaryRevision | null> {
  return SalaryRevision.findByIdAndUpdate(
    revisionId,
    {
      'arrearDetails.processed': true,
      'arrearDetails.processedInPayrollId': payrollId
    },
    { new: true }
  );
}

export async function getUnprocessedArrears(tenantId: string): Promise<ISalaryRevision[]> {
  return SalaryRevision.find({
    tenantId,
    approvalStatus: 'approved',
    'arrearDetails.processed': false,
    'arrearDetails.arrearAmount': { $gt: 0 }
  }).lean() as any;
}
