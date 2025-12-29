import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from 'pdf-lib';

interface PayslipData {
  companyName: string;
  companyAddress: string;
  companyLogo?: string;
  employeeName: string;
  employeeId: string;
  employeeCode?: string;
  email?: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  bankName: string;
  bankAccountNumber: string;
  panNumber?: string;
  uanNumber?: string;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  basicSalary?: number;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  employerContributions?: { name: string; amount: number }[];
  ytdEarnings?: number;
  ytdDeductions?: number;
  overtimeHours?: number;
  overtimePay?: number;
  paymentReference?: string;
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Color palette matching frontend
const colors = {
  primary: rgb(0.12, 0.25, 0.69),        // Blue #1e40af
  primaryLight: rgb(0.23, 0.51, 0.96),   // Light blue #3b82f6
  indigo: rgb(0.31, 0.35, 0.87),         // Indigo #4f46e5
  purple: rgb(0.58, 0.39, 0.87),         // Purple #9333ea
  success: rgb(0.02, 0.59, 0.40),        // Green #059669
  successLight: rgb(0.84, 0.95, 0.90),   // Light green #d1fae5
  danger: rgb(0.86, 0.15, 0.15),         // Red #dc2626
  dangerLight: rgb(0.99, 0.91, 0.91),    // Light red #fee2e2
  textPrimary: rgb(0.12, 0.16, 0.21),    // Dark #1e293b
  textSecondary: rgb(0.39, 0.45, 0.53),  // Gray #64748b
  textMuted: rgb(0.58, 0.64, 0.70),      // Light gray #94a3b8
  border: rgb(0.89, 0.91, 0.94),         // Border #e2e8f0
  bgLight: rgb(0.97, 0.98, 0.99),        // Light bg #f8fafc
  white: rgb(1, 1, 1),
};

function formatCurrency(amount: number): string {
  // Use "Rs." instead of ₹ symbol as pdf-lib standard fonts don't support Unicode ₹
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rs. ${formatted}`;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = colors.textPrimary
) {
  page.drawText(text || '', { x, y, size, font, color });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 1, color: RGB = colors.border) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function drawRect(page: PDFPage, x: number, y: number, width: number, height: number, color: RGB) {
  page.drawRectangle({ x, y, width, height, color });
}

function drawRoundedRect(page: PDFPage, x: number, y: number, width: number, height: number, color: RGB, borderColor?: RGB) {
  page.drawRectangle({ x, y, width, height, color, borderColor, borderWidth: borderColor ? 1 : 0 });
}

export async function generatePayslipPDF(data: PayslipData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const leftMargin = 40;
  const rightMargin = width - 40;
  const contentWidth = rightMargin - leftMargin;
  let y = height - 30;

  // ============================================
  // HEADER SECTION - Company Info with gradient effect
  // ============================================
  const headerHeight = 90;
  drawRect(page, 0, height - headerHeight, width, headerHeight, colors.primary);
  // Add a lighter overlay on right side for gradient effect
  drawRect(page, width * 0.6, height - headerHeight, width * 0.4, headerHeight, colors.primaryLight);

  y = height - 35;

  // Company Name
  drawText(page, data.companyName.toUpperCase(), leftMargin, y, fontBold, 20, colors.white);
  y -= 18;

  // Company Address
  const addressLines = data.companyAddress.split(',').map(s => s.trim());
  for (const line of addressLines.slice(0, 2)) {
    drawText(page, line, leftMargin, y, font, 9, rgb(1, 1, 1));
    y -= 12;
  }
  if (addressLines.length > 2) {
    drawText(page, addressLines.slice(2).join(', '), leftMargin, y, font, 9, rgb(1, 1, 1));
    y -= 12;
  }

  // Payslip Period Badge (right side of header)
  const periodText = `Payslip for ${months[data.month - 1]} ${data.year}`;
  const periodBadgeWidth = 180;
  const periodBadgeX = rightMargin - periodBadgeWidth - 10;
  const periodBadgeY = height - 60;
  drawRect(page, periodBadgeX, periodBadgeY - 8, periodBadgeWidth, 28, rgb(1, 1, 1));
  drawText(page, periodText, periodBadgeX + 15, periodBadgeY, fontBold, 11, colors.primary);

  y = height - headerHeight - 20;

  // ============================================
  // EMPLOYEE INFORMATION SECTION
  // ============================================
  const infoSectionY = y;
  const infoSectionHeight = 100;
  drawRect(page, leftMargin - 5, y - infoSectionHeight + 15, contentWidth + 10, infoSectionHeight, colors.bgLight);

  // Section Title
  drawText(page, 'EMPLOYEE INFORMATION', leftMargin, y, fontBold, 11, colors.primary);
  y -= 5;
  drawLine(page, leftMargin, y, rightMargin, y, 2, colors.primary);
  y -= 18;

  // Employee info grid - 2 columns
  const col1Label = leftMargin;
  const col1Value = leftMargin + 85;
  const col2Label = leftMargin + 270;
  const col2Value = leftMargin + 355;
  const labelSize = 8;
  const valueSize = 9;

  // Row 1
  drawText(page, 'Employee Name', col1Label, y, font, labelSize, colors.textMuted);
  drawText(page, data.employeeName, col1Value, y, fontBold, valueSize, colors.textPrimary);
  drawText(page, 'Employee ID', col2Label, y, font, labelSize, colors.textMuted);
  drawText(page, data.employeeCode || data.employeeId, col2Value, y, fontBold, valueSize, colors.textPrimary);
  y -= 16;

  // Row 2
  drawText(page, 'Designation', col1Label, y, font, labelSize, colors.textMuted);
  drawText(page, data.designation || 'N/A', col1Value, y, fontBold, valueSize, colors.textPrimary);
  drawText(page, 'Department', col2Label, y, font, labelSize, colors.textMuted);
  drawText(page, data.department || 'N/A', col2Value, y, fontBold, valueSize, colors.textPrimary);
  y -= 16;

  // Row 3
  drawText(page, 'Date of Joining', col1Label, y, font, labelSize, colors.textMuted);
  drawText(page, data.dateOfJoining || 'N/A', col1Value, y, fontBold, valueSize, colors.textPrimary);
  drawText(page, 'Pay Period', col2Label, y, font, labelSize, colors.textMuted);
  drawText(page, `${data.payPeriodStart} - ${data.payPeriodEnd}`, col2Value, y, fontBold, valueSize, colors.textPrimary);
  y -= 16;

  // Row 4
  drawText(page, 'Bank Name', col1Label, y, font, labelSize, colors.textMuted);
  drawText(page, data.bankName || 'N/A', col1Value, y, fontBold, valueSize, colors.textPrimary);
  drawText(page, 'Account No', col2Label, y, font, labelSize, colors.textMuted);
  const maskedAccount = data.bankAccountNumber ? `****${data.bankAccountNumber.slice(-4)}` : 'N/A';
  drawText(page, maskedAccount, col2Value, y, fontBold, valueSize, colors.textPrimary);
  y -= 16;

  // Row 5 (PAN & UAN)
  if (data.panNumber || data.uanNumber) {
    drawText(page, 'PAN Number', col1Label, y, font, labelSize, colors.textMuted);
    drawText(page, data.panNumber || 'N/A', col1Value, y, fontBold, valueSize, colors.textPrimary);
    drawText(page, 'UAN Number', col2Label, y, font, labelSize, colors.textMuted);
    drawText(page, data.uanNumber || 'N/A', col2Value, y, fontBold, valueSize, colors.textPrimary);
    y -= 16;
  }

  y -= 15;

  // ============================================
  // ATTENDANCE SUMMARY
  // ============================================
  drawText(page, 'ATTENDANCE SUMMARY', leftMargin, y, fontBold, 11, colors.primary);
  y -= 5;
  drawLine(page, leftMargin, y, rightMargin, y, 2, colors.primary);
  y -= 18;

  // Attendance boxes
  const boxWidth = (contentWidth - 30) / 4;
  const boxHeight = 45;
  const boxY = y - boxHeight + 10;

  const attendanceData = [
    { label: 'Working Days', value: data.workingDays.toString() },
    { label: 'Present Days', value: data.presentDays.toString() },
    { label: 'Leave Days', value: data.leaveDays.toString() },
    { label: 'LOP Days', value: data.lopDays.toString() },
  ];

  attendanceData.forEach((item, index) => {
    const boxX = leftMargin + (index * (boxWidth + 10));
    drawRect(page, boxX, boxY, boxWidth, boxHeight, colors.bgLight);
    drawLine(page, boxX, boxY, boxX + boxWidth, boxY, 1, colors.border);
    drawLine(page, boxX, boxY + boxHeight, boxX + boxWidth, boxY + boxHeight, 1, colors.border);
    drawLine(page, boxX, boxY, boxX, boxY + boxHeight, 1, colors.border);
    drawLine(page, boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxHeight, 1, colors.border);

    drawText(page, item.label, boxX + 10, boxY + boxHeight - 15, font, 8, colors.textMuted);
    drawText(page, item.value, boxX + 10, boxY + 10, fontBold, 16, colors.textPrimary);
  });

  y = boxY - 20;

  // ============================================
  // EARNINGS AND DEDUCTIONS - Two Column Layout
  // ============================================
  const tableStartY = y;
  const colWidth = (contentWidth - 20) / 2;
  const earningsX = leftMargin;
  const deductionsX = leftMargin + colWidth + 20;

  // Earnings Header
  drawRect(page, earningsX, y - 20, colWidth, 25, colors.successLight);
  drawText(page, 'EARNINGS', earningsX + 10, y - 12, fontBold, 10, colors.success);
  drawText(page, 'Amount', earningsX + colWidth - 70, y - 12, fontBold, 10, colors.success);

  // Deductions Header
  drawRect(page, deductionsX, y - 20, colWidth, 25, colors.dangerLight);
  drawText(page, 'DEDUCTIONS', deductionsX + 10, y - 12, fontBold, 10, colors.danger);
  drawText(page, 'Amount', deductionsX + colWidth - 70, y - 12, fontBold, 10, colors.danger);

  y -= 30;

  // Prepare earnings list (add basic salary first if available)
  const allEarnings = [];
  if (data.basicSalary && data.basicSalary > 0) {
    allEarnings.push({ name: 'Basic Salary', amount: data.basicSalary });
  }
  allEarnings.push(...data.earnings);
  if (data.overtimePay && data.overtimePay > 0) {
    allEarnings.push({ name: `Overtime (${data.overtimeHours || 0} hrs)`, amount: data.overtimePay });
  }

  // Table content
  const maxRows = Math.max(allEarnings.length, data.deductions.length);
  const rowHeight = 18;

  for (let i = 0; i < maxRows; i++) {
    const rowY = y - (i * rowHeight);

    // Earnings row
    if (allEarnings[i]) {
      drawText(page, allEarnings[i].name, earningsX + 10, rowY, font, 9, colors.textSecondary);
      drawText(page, formatCurrency(allEarnings[i].amount), earningsX + colWidth - 80, rowY, font, 9, colors.success);
    }

    // Deductions row
    if (data.deductions[i]) {
      drawText(page, data.deductions[i].name, deductionsX + 10, rowY, font, 9, colors.textSecondary);
      drawText(page, formatCurrency(data.deductions[i].amount), deductionsX + colWidth - 80, rowY, font, 9, colors.danger);
    }

    // Row separator
    if (i < maxRows - 1) {
      drawLine(page, earningsX, rowY - 5, earningsX + colWidth, rowY - 5, 0.5, colors.border);
      drawLine(page, deductionsX, rowY - 5, deductionsX + colWidth, rowY - 5, 0.5, colors.border);
    }
  }

  y = y - (maxRows * rowHeight) - 10;

  // Totals row
  drawRect(page, earningsX, y - 18, colWidth, 25, colors.successLight);
  drawText(page, 'Gross Earnings', earningsX + 10, y - 10, fontBold, 10, colors.textPrimary);
  drawText(page, formatCurrency(data.grossSalary), earningsX + colWidth - 90, y - 10, fontBold, 11, colors.success);

  drawRect(page, deductionsX, y - 18, colWidth, 25, colors.dangerLight);
  drawText(page, 'Total Deductions', deductionsX + 10, y - 10, fontBold, 10, colors.textPrimary);
  drawText(page, formatCurrency(data.totalDeductions), deductionsX + colWidth - 90, y - 10, fontBold, 11, colors.danger);

  y -= 40;

  // ============================================
  // NET SALARY SECTION - Prominent display
  // ============================================
  const netSalaryHeight = 60;
  drawRect(page, leftMargin - 5, y - netSalaryHeight + 15, contentWidth + 10, netSalaryHeight, colors.primary);
  // Gradient effect overlay
  drawRect(page, leftMargin + contentWidth * 0.5, y - netSalaryHeight + 15, contentWidth * 0.5 + 5, netSalaryHeight, colors.primaryLight);

  drawText(page, 'NET SALARY PAYABLE', leftMargin + 15, y - 10, fontBold, 11, rgb(1, 1, 1));
  drawText(page, 'Amount credited to bank account', leftMargin + 15, y - 25, font, 8, rgb(0.8, 0.9, 1));

  const netSalaryText = formatCurrency(data.netSalary);
  const netSalaryWidth = fontBold.widthOfTextAtSize(netSalaryText, 24);
  drawText(page, netSalaryText, rightMargin - netSalaryWidth - 20, y - 20, fontBold, 24, colors.white);

  y -= netSalaryHeight + 15;

  // ============================================
  // EMPLOYER CONTRIBUTIONS (if any)
  // ============================================
  if (data.employerContributions && data.employerContributions.length > 0) {
    drawText(page, 'EMPLOYER CONTRIBUTIONS', leftMargin, y, fontBold, 9, colors.textMuted);
    drawText(page, '(Not part of take-home salary)', leftMargin + 140, y, font, 8, colors.textMuted);
    y -= 15;

    for (const contrib of data.employerContributions) {
      drawText(page, `${contrib.name}:`, leftMargin + 10, y, font, 8, colors.textMuted);
      drawText(page, formatCurrency(contrib.amount), leftMargin + 150, y, font, 8, colors.textSecondary);
      y -= 12;
    }
    y -= 10;
  }

  // ============================================
  // YTD SUMMARY (if available)
  // ============================================
  if (data.ytdEarnings || data.ytdDeductions) {
    y -= 5;
    drawText(page, 'YEAR-TO-DATE SUMMARY', leftMargin, y, fontBold, 9, colors.textMuted);
    y -= 15;

    if (data.ytdEarnings) {
      drawText(page, 'YTD Gross Earnings:', leftMargin + 10, y, font, 8, colors.textMuted);
      drawText(page, formatCurrency(data.ytdEarnings), leftMargin + 150, y, font, 8, colors.success);
    }
    if (data.ytdDeductions) {
      drawText(page, 'YTD Total Deductions:', leftMargin + 280, y, font, 8, colors.textMuted);
      drawText(page, formatCurrency(data.ytdDeductions), leftMargin + 420, y, font, 8, colors.danger);
    }
    y -= 15;
  }

  // ============================================
  // FOOTER
  // ============================================
  const footerY = 50;
  drawLine(page, leftMargin, footerY + 20, rightMargin, footerY + 20, 1, colors.border);

  drawText(
    page,
    'This is a computer-generated payslip and does not require a signature.',
    leftMargin,
    footerY + 5,
    font,
    8,
    colors.textMuted
  );

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  drawText(page, `Generated on: ${generatedDate}`, leftMargin, footerY - 8, font, 8, colors.textMuted);

  // Payment reference if available
  if (data.paymentReference) {
    drawText(page, `Payment Reference: ${data.paymentReference}`, rightMargin - 180, footerY - 8, font, 8, colors.textMuted);
  }

  return Buffer.from(await pdfDoc.save());
}

export async function generateBulkPayslips(payslipsData: PayslipData[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  for (const data of payslipsData) {
    const individualPdf = await generatePayslipPDF(data);
    const srcDoc = await PDFDocument.load(individualPdf);
    const [page] = await pdfDoc.copyPages(srcDoc, [0]);
    pdfDoc.addPage(page);
  }

  return Buffer.from(await pdfDoc.save());
}
