import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

interface PayslipData {
  companyName: string;
  companyAddress: string;
  companyLogo?: string;
  employeeName: string;
  employeeId: string;
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
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  employerContributions?: { name: string; amount: number }[];
  ytdEarnings?: number;
  ytdDeductions?: number;
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = rgb(0, 0, 0)) {
  page.drawText(text, { x, y, size, font, color });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = 1) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: rgb(0.8, 0.8, 0.8) });
}

export async function generatePayslipPDF(data: PayslipData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  const leftMargin = 50;
  const rightMargin = 545;

  // Header - Company Name
  drawText(page, data.companyName, leftMargin, y, fontBold, 18, rgb(0, 0.2, 0.4));
  y -= 15;
  drawText(page, data.companyAddress, leftMargin, y, font, 9, rgb(0.4, 0.4, 0.4));
  y -= 25;

  // Payslip Title
  const title = `Payslip for ${months[data.month - 1]} ${data.year}`;
  drawText(page, title, leftMargin, y, fontBold, 14);
  y -= 5;
  drawLine(page, leftMargin, y, rightMargin, y, 2);
  y -= 20;

  // Employee Details Section
  const col1 = leftMargin;
  const col2 = 200;
  const col3 = 320;
  const col4 = 450;

  drawText(page, 'Employee Name:', col1, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, data.employeeName, col2, y, fontBold, 9);
  drawText(page, 'Employee ID:', col3, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, data.employeeId, col4, y, fontBold, 9);
  y -= 15;

  drawText(page, 'Designation:', col1, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, data.designation, col2, y, fontBold, 9);
  drawText(page, 'Department:', col3, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, data.department, col4, y, fontBold, 9);
  y -= 15;

  drawText(page, 'Date of Joining:', col1, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, data.dateOfJoining, col2, y, fontBold, 9);
  drawText(page, 'Pay Period:', col3, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, `${data.payPeriodStart} - ${data.payPeriodEnd}`, col4, y, fontBold, 9);
  y -= 15;

  drawText(page, 'Bank Name:', col1, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, data.bankName, col2, y, fontBold, 9);
  drawText(page, 'Account No:', col3, y, font, 9, rgb(0.4, 0.4, 0.4));
  drawText(page, `****${data.bankAccountNumber.slice(-4)}`, col4, y, fontBold, 9);
  y -= 15;

  if (data.panNumber) {
    drawText(page, 'PAN:', col1, y, font, 9, rgb(0.4, 0.4, 0.4));
    drawText(page, data.panNumber, col2, y, fontBold, 9);
  }
  if (data.uanNumber) {
    drawText(page, 'UAN:', col3, y, font, 9, rgb(0.4, 0.4, 0.4));
    drawText(page, data.uanNumber, col4, y, fontBold, 9);
  }
  y -= 20;

  // Attendance Summary
  drawLine(page, leftMargin, y, rightMargin, y);
  y -= 15;
  drawText(page, 'Attendance Summary', leftMargin, y, fontBold, 10);
  y -= 15;

  drawText(page, `Working Days: ${data.workingDays}`, col1, y, font, 9);
  drawText(page, `Present Days: ${data.presentDays}`, col2, y, font, 9);
  drawText(page, `Leave Days: ${data.leaveDays}`, col3, y, font, 9);
  drawText(page, `LOP Days: ${data.lopDays}`, col4, y, font, 9);
  y -= 20;

  // Earnings and Deductions Table
  drawLine(page, leftMargin, y, rightMargin, y);
  y -= 15;

  // Table Headers
  const earningsCol = leftMargin;
  const earningsAmtCol = 180;
  const deductionsCol = 320;
  const deductionsAmtCol = 480;

  page.drawRectangle({ x: leftMargin - 5, y: y - 5, width: 260, height: 20, color: rgb(0.95, 0.95, 0.95) });
  page.drawRectangle({ x: deductionsCol - 5, y: y - 5, width: 235, height: 20, color: rgb(0.95, 0.95, 0.95) });

  drawText(page, 'Earnings', earningsCol, y, fontBold, 10);
  drawText(page, 'Amount', earningsAmtCol, y, fontBold, 10);
  drawText(page, 'Deductions', deductionsCol, y, fontBold, 10);
  drawText(page, 'Amount', deductionsAmtCol, y, fontBold, 10);
  y -= 20;

  // Table Content
  const maxRows = Math.max(data.earnings.length, data.deductions.length);
  for (let i = 0; i < maxRows; i++) {
    if (data.earnings[i]) {
      drawText(page, data.earnings[i].name, earningsCol, y, font, 9);
      drawText(page, data.earnings[i].amount.toLocaleString(), earningsAmtCol, y, font, 9);
    }
    if (data.deductions[i]) {
      drawText(page, data.deductions[i].name, deductionsCol, y, font, 9);
      drawText(page, data.deductions[i].amount.toLocaleString(), deductionsAmtCol, y, font, 9);
    }
    y -= 15;
  }

  y -= 5;
  drawLine(page, leftMargin, y, rightMargin, y);
  y -= 15;

  // Totals
  drawText(page, 'Gross Salary', earningsCol, y, fontBold, 10);
  drawText(page, data.grossSalary.toLocaleString(), earningsAmtCol, y, fontBold, 10);
  drawText(page, 'Total Deductions', deductionsCol, y, fontBold, 10);
  drawText(page, data.totalDeductions.toLocaleString(), deductionsAmtCol, y, fontBold, 10);
  y -= 25;

  // Net Salary
  page.drawRectangle({ x: leftMargin - 5, y: y - 10, width: rightMargin - leftMargin + 10, height: 30, color: rgb(0.9, 0.95, 1) });
  y -= 5;
  drawText(page, 'Net Salary Payable', leftMargin, y, fontBold, 12);
  drawText(page, data.netSalary.toLocaleString(), deductionsAmtCol, y, fontBold, 12, rgb(0, 0.4, 0));
  y -= 30;

  // Employer Contributions (if any)
  if (data.employerContributions && data.employerContributions.length > 0) {
    drawText(page, 'Employer Contributions (Not part of take-home)', leftMargin, y, fontBold, 9, rgb(0.4, 0.4, 0.4));
    y -= 15;
    for (const contrib of data.employerContributions) {
      drawText(page, `${contrib.name}: ${contrib.amount.toLocaleString()}`, leftMargin + 10, y, font, 8, rgb(0.5, 0.5, 0.5));
      y -= 12;
    }
    y -= 10;
  }

  // Footer
  y = 60;
  drawLine(page, leftMargin, y, rightMargin, y);
  y -= 15;
  drawText(page, 'This is a computer-generated payslip and does not require a signature.', leftMargin, y, font, 8, rgb(0.5, 0.5, 0.5));
  y -= 12;
  drawText(page, `Generated on: ${new Date().toLocaleDateString()}`, leftMargin, y, font, 8, rgb(0.5, 0.5, 0.5));

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
