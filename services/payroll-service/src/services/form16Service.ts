import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Form16, { IForm16, IForm16PartA, IForm16PartB } from '../models/Form16';
import Paystub from '../models/Paystub';
import TaxDeclaration from '../models/TaxDeclaration';

interface EmployerDetails {
  name: string;
  address: string;
  tan: string;
  pan: string;
}

interface EmployeeDetails {
  name: string;
  pan: string;
  address: string;
  employeeId: string;
}

export async function generateForm16(
  tenantId: string,
  employeeId: string,
  financialYear: string,
  employerDetails: EmployerDetails,
  employeeDetails: EmployeeDetails
): Promise<IForm16> {
  const [fyStart, fyEnd] = financialYear.split('-').map(Number);
  const assessmentYear = `${fyEnd}-${fyEnd + 1}`;

  // Fetch all paystubs for the financial year
  const paystubs = await Paystub.find({
    tenantId,
    employeeId,
    $or: [
      { 'payPeriod.year': fyStart, 'payPeriod.month': { $gte: 4 } },
      { 'payPeriod.year': fyEnd, 'payPeriod.month': { $lte: 3 } }
    ],
    status: { $in: ['approved', 'paid'] }
  }).sort({ 'payPeriod.year': 1, 'payPeriod.month': 1 });

  // Fetch tax declaration
  const taxDeclaration = await TaxDeclaration.findOne({
    tenantId,
    employeeId,
    financialYear,
    status: 'approved'
  });

  // Calculate Part A - TDS Details
  const partA = calculatePartA(paystubs, employerDetails, employeeDetails, assessmentYear, fyStart, fyEnd);

  // Calculate Part B - Income Details
  const partB = calculatePartB(paystubs, taxDeclaration);

  // Create or update Form16
  let form16 = await Form16.findOne({ tenantId, employeeId, financialYear });

  if (form16) {
    form16.partA = partA;
    form16.partB = partB;
    form16.assessmentYear = assessmentYear;
    form16.status = 'generated';
  } else {
    form16 = new Form16({
      tenantId,
      employeeId,
      financialYear,
      assessmentYear,
      partA,
      partB,
      status: 'generated',
      verification: {
        place: '',
        date: new Date(),
        designation: '',
        signatory: ''
      }
    });
  }

  await form16.save();
  return form16;
}

function calculatePartA(
  paystubs: any[],
  employerDetails: EmployerDetails,
  employeeDetails: EmployeeDetails,
  assessmentYear: string,
  fyStart: number,
  fyEnd: number
): IForm16PartA {
  // Group paystubs by quarter
  const quarters: { [key: string]: any[] } = { Q1: [], Q2: [], Q3: [], Q4: [] };

  paystubs.forEach(paystub => {
    const month = paystub.payPeriod.month;
    const year = paystub.payPeriod.year;

    if (year === fyStart && month >= 4 && month <= 6) quarters.Q1.push(paystub);
    else if (year === fyStart && month >= 7 && month <= 9) quarters.Q2.push(paystub);
    else if (year === fyStart && month >= 10 && month <= 12) quarters.Q3.push(paystub);
    else if (year === fyEnd && month >= 1 && month <= 3) quarters.Q4.push(paystub);
  });

  const quarterlyTDSDetails = Object.entries(quarters).map(([quarter, stubs]) => {
    const taxDeducted = stubs.reduce((sum, s) => sum + (s.taxDetails?.taxDeductedThisMonth || 0), 0);
    return {
      quarter: quarter as 'Q1' | 'Q2' | 'Q3' | 'Q4',
      receiptNumbers: [],
      taxDeducted,
      taxDeposited: taxDeducted,
      dateOfDeposit: new Date(),
      bsrCode: '',
      challanSerialNumber: ''
    };
  });

  const totalTaxDeducted = quarterlyTDSDetails.reduce((sum, q) => sum + q.taxDeducted, 0);

  return {
    employerDetails,
    employeeDetails: {
      name: employeeDetails.name,
      pan: employeeDetails.pan,
      address: employeeDetails.address
    },
    assessmentYear,
    period: {
      from: new Date(fyStart, 3, 1),
      to: new Date(fyEnd, 2, 31)
    },
    quarterlyTDSDetails,
    summaryOfTax: {
      totalTaxDeducted,
      totalTaxDeposited: totalTaxDeducted
    }
  };
}

function calculatePartB(paystubs: any[], taxDeclaration: any): IForm16PartB {
  // Calculate gross salary from paystubs
  const grossSalary = paystubs.reduce((sum, p) => sum + (p.summary?.grossEarnings || 0), 0);
  const totalTaxDeducted = paystubs.reduce((sum, p) => sum + (p.taxDetails?.taxDeductedThisMonth || 0), 0);

  // Get exemptions
  let hraExemption = 0;
  let ltaExemption = 0;
  if (taxDeclaration) {
    hraExemption = taxDeclaration.taxComputation?.exemptions?.hra || 0;
    ltaExemption = taxDeclaration.taxComputation?.exemptions?.lta || 0;
  }

  // Professional tax from paystubs
  const professionalTax = paystubs.reduce((sum, p) => {
    const ptDeduction = p.deductions?.find((d: any) => d.code === 'PT');
    return sum + (ptDeduction?.employeeAmount || 0);
  }, 0);

  const standardDeduction = 50000;
  const totalExemptions = hraExemption + ltaExemption;
  const totalDeductionsFromSalary = standardDeduction + professionalTax;

  const incomeFromSalary = grossSalary - totalExemptions - totalDeductionsFromSalary;

  // Chapter VI-A Deductions
  let section80C = { ppf: 0, elss: 0, lifeInsurance: 0, housingLoanPrincipal: 0, tuitionFees: 0, others: 0, total: 0 };
  let section80D = { selfAndFamily: 0, parents: 0, total: 0 };
  let section80CCD_1 = 0;
  let section80CCD_1B = 0;
  let section80CCD_2 = 0;

  if (taxDeclaration) {
    // Section 80C
    taxDeclaration.section80C?.deductions?.forEach((d: any) => {
      const amount = d.verifiedAmount || d.declaredAmount || 0;
      switch (d.type) {
        case 'PPF': section80C.ppf += amount; break;
        case 'ELSS': section80C.elss += amount; break;
        case 'LIC': section80C.lifeInsurance += amount; break;
        case 'HomeLoanPrincipal': section80C.housingLoanPrincipal += amount; break;
        case 'TuitionFees': section80C.tuitionFees += amount; break;
        default: section80C.others += amount;
      }
    });
    section80C.total = Math.min(150000, section80C.ppf + section80C.elss + section80C.lifeInsurance +
      section80C.housingLoanPrincipal + section80C.tuitionFees + section80C.others);

    // Section 80D
    taxDeclaration.section80D?.deductions?.forEach((d: any) => {
      const amount = d.verifiedAmount || d.declaredAmount || 0;
      if (d.type === 'SelfAndFamily') section80D.selfAndFamily += amount;
      else section80D.parents += amount;
    });
    section80D.total = section80D.selfAndFamily + section80D.parents;

    // Section 80CCD
    section80CCD_1 = taxDeclaration.section80CCD?.npsEmployeeContribution || 0;
    section80CCD_1B = Math.min(50000, taxDeclaration.section80CCD?.totalDeclared || 0);
    section80CCD_2 = taxDeclaration.section80CCD?.npsEmployerContribution || 0;
  }

  const totalChapterVIADeductions = section80C.total + section80D.total + section80CCD_1 + section80CCD_1B + section80CCD_2;

  const otherIncome = taxDeclaration?.otherIncome?.reduce((sum: number, o: any) => sum + (o.amount || 0), 0) || 0;
  const grossTotalIncome = incomeFromSalary + otherIncome;
  const totalIncome = Math.max(0, grossTotalIncome - totalChapterVIADeductions);

  // Calculate tax
  const { incomeTax, surcharge, cess, totalTax } = calculateTaxForForm16(totalIncome);

  // Rebate under 87A
  const rebate = totalIncome <= 700000 ? Math.min(incomeTax, 25000) : 0;

  const netTaxPayable = Math.max(0, totalTax - rebate);

  return {
    grossSalary: {
      salaryAsPerSection17_1: grossSalary,
      valueOfPerquisites17_2: 0,
      profitsInLieuOfSalary17_3: 0,
      total: grossSalary
    },
    allowancesExempt: {
      hraExemption,
      ltaExemption,
      otherExemptions: 0,
      total: totalExemptions
    },
    deductions: {
      standardDeduction,
      entertainmentAllowance: 0,
      professionalTax,
      total: totalDeductionsFromSalary
    },
    incomeFromSalary,
    incomeFromOtherSources: otherIncome,
    grossTotalIncome,
    deductionsUnderChapterVIA: {
      section80C,
      section80CCC: 0,
      section80CCD_1,
      section80CCD_1B,
      section80CCD_2,
      section80D,
      section80E: 0,
      section80EE: 0,
      section80EEA: 0,
      section80G: 0,
      section80TTA_TTB: 0,
      otherDeductions: 0,
      totalDeductions: totalChapterVIADeductions
    },
    totalIncome,
    taxOnTotalIncome: incomeTax,
    rebateUnderSection87A: rebate,
    surcharge,
    healthAndEducationCess: cess,
    totalTaxPayable: netTaxPayable,
    reliefUnderSection89: 0,
    netTaxPayable,
    taxPaidByEmployer: totalTaxDeducted,
    taxPayableOrRefund: netTaxPayable - totalTaxDeducted
  };
}

function calculateTaxForForm16(taxableIncome: number): { incomeTax: number; surcharge: number; cess: number; totalTax: number } {
  // New regime tax slabs (FY 2023-24)
  const slabs = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300001, max: 600000, rate: 5 },
    { min: 600001, max: 900000, rate: 10 },
    { min: 900001, max: 1200000, rate: 15 },
    { min: 1200001, max: 1500000, rate: 20 },
    { min: 1500001, max: Infinity, rate: 30 }
  ];

  let incomeTax = 0;
  let remaining = taxableIncome;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const slabAmount = Math.min(remaining, slab.max - slab.min + 1);
    incomeTax += slabAmount * (slab.rate / 100);
    remaining -= slabAmount;
  }

  // Surcharge
  let surchargeRate = 0;
  if (taxableIncome > 5000000 && taxableIncome <= 10000000) surchargeRate = 10;
  else if (taxableIncome > 10000000 && taxableIncome <= 20000000) surchargeRate = 15;
  else if (taxableIncome > 20000000 && taxableIncome <= 50000000) surchargeRate = 25;
  else if (taxableIncome > 50000000) surchargeRate = 37;

  const surcharge = incomeTax * (surchargeRate / 100);
  const cess = (incomeTax + surcharge) * 0.04;
  const totalTax = incomeTax + surcharge + cess;

  return {
    incomeTax: Math.round(incomeTax),
    surcharge: Math.round(surcharge),
    cess: Math.round(cess),
    totalTax: Math.round(totalTax)
  };
}

export async function generateForm16PDF(form16: IForm16): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Part A - Page 1
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText('FORM NO. 16', { x: 250, y, font: boldFont, size: 14 });
  y -= 20;
  page.drawText('[See rule 31(1)(a)]', { x: 230, y, font, size: 10 });
  y -= 15;
  page.drawText('Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary', { x: 80, y, font, size: 9 });
  y -= 30;

  // Part A Header
  page.drawText('PART A', { x: 270, y, font: boldFont, size: 12 });
  y -= 25;

  // Employer Details
  page.drawText('Certificate No:', { x: 50, y, font, size: 10 });
  page.drawText('Last Updated On:', { x: 350, y, font, size: 10 });
  y -= 20;

  page.drawText(`Name of the Deductor: ${form16.partA.employerDetails.name}`, { x: 50, y, font, size: 10 });
  y -= 15;
  page.drawText(`TAN of the Deductor: ${form16.partA.employerDetails.tan}`, { x: 50, y, font, size: 10 });
  page.drawText(`PAN of the Deductor: ${form16.partA.employerDetails.pan}`, { x: 300, y, font, size: 10 });
  y -= 20;

  // Employee Details
  page.drawText(`Name of the Employee: ${form16.partA.employeeDetails.name}`, { x: 50, y, font, size: 10 });
  y -= 15;
  page.drawText(`PAN of the Employee: ${form16.partA.employeeDetails.pan}`, { x: 50, y, font, size: 10 });
  y -= 15;
  page.drawText(`Assessment Year: ${form16.assessmentYear}`, { x: 50, y, font, size: 10 });
  y -= 30;

  // Summary of Tax
  page.drawText('Summary of Tax Deducted at Source', { x: 50, y, font: boldFont, size: 11 });
  y -= 20;
  page.drawText(`Total Tax Deducted: ₹${form16.partA.summaryOfTax.totalTaxDeducted.toLocaleString('en-IN')}`, { x: 50, y, font, size: 10 });
  y -= 15;
  page.drawText(`Total Tax Deposited: ₹${form16.partA.summaryOfTax.totalTaxDeposited.toLocaleString('en-IN')}`, { x: 50, y, font, size: 10 });

  // Part B - Page 2
  page = pdfDoc.addPage([595, 842]);
  y = height - 50;

  page.drawText('PART B (Annexure)', { x: 240, y, font: boldFont, size: 12 });
  y -= 25;
  page.drawText('Details of Salary Paid and any other income and tax deducted', { x: 130, y, font, size: 10 });
  y -= 30;

  // Gross Salary
  page.drawText('1. Gross Salary', { x: 50, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`   (a) Salary as per section 17(1): ₹${form16.partB.grossSalary.salaryAsPerSection17_1.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   (b) Value of perquisites u/s 17(2): ₹${form16.partB.grossSalary.valueOfPerquisites17_2.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   (c) Profits in lieu of salary u/s 17(3): ₹${form16.partB.grossSalary.profitsInLieuOfSalary17_3.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   (d) Total: ₹${form16.partB.grossSalary.total.toLocaleString('en-IN')}`, { x: 50, y, font: boldFont, size: 9 });
  y -= 20;

  // Exemptions
  page.drawText('2. Less: Allowances exempt u/s 10', { x: 50, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`   HRA Exemption: ₹${form16.partB.allowancesExempt.hraExemption.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   LTA Exemption: ₹${form16.partB.allowancesExempt.ltaExemption.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Total Exemptions: ₹${form16.partB.allowancesExempt.total.toLocaleString('en-IN')}`, { x: 50, y, font: boldFont, size: 9 });
  y -= 20;

  // Deductions
  page.drawText('3. Deductions u/s 16', { x: 50, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`   Standard Deduction: ₹${form16.partB.deductions.standardDeduction.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Professional Tax: ₹${form16.partB.deductions.professionalTax.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 20;

  // Income from Salary
  page.drawText(`4. Income from Salary: ₹${form16.partB.incomeFromSalary.toLocaleString('en-IN')}`, { x: 50, y, font: boldFont, size: 10 });
  y -= 20;

  // Chapter VI-A
  page.drawText('5. Deductions under Chapter VI-A', { x: 50, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`   Section 80C: ₹${form16.partB.deductionsUnderChapterVIA.section80C.total.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Section 80D: ₹${form16.partB.deductionsUnderChapterVIA.section80D.total.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Section 80CCD(1B): ₹${form16.partB.deductionsUnderChapterVIA.section80CCD_1B.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Total Deductions: ₹${form16.partB.deductionsUnderChapterVIA.totalDeductions.toLocaleString('en-IN')}`, { x: 50, y, font: boldFont, size: 9 });
  y -= 25;

  // Tax Computation
  page.drawText('6. Total Taxable Income', { x: 50, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`   Gross Total Income: ₹${form16.partB.grossTotalIncome.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Total Income (after deductions): ₹${form16.partB.totalIncome.toLocaleString('en-IN')}`, { x: 50, y, font: boldFont, size: 9 });
  y -= 25;

  page.drawText('7. Tax Computation', { x: 50, y, font: boldFont, size: 10 });
  y -= 15;
  page.drawText(`   Tax on Total Income: ₹${form16.partB.taxOnTotalIncome.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Rebate u/s 87A: ₹${form16.partB.rebateUnderSection87A.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Surcharge: ₹${form16.partB.surcharge.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Health & Education Cess: ₹${form16.partB.healthAndEducationCess.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 12;
  page.drawText(`   Total Tax Payable: ₹${form16.partB.totalTaxPayable.toLocaleString('en-IN')}`, { x: 50, y, font: boldFont, size: 9 });
  y -= 12;
  page.drawText(`   Tax Deducted by Employer: ₹${form16.partB.taxPaidByEmployer.toLocaleString('en-IN')}`, { x: 50, y, font, size: 9 });
  y -= 15;

  const refundOrPayable = form16.partB.taxPayableOrRefund;
  const refundText = refundOrPayable < 0 ? `Refund Due: ₹${Math.abs(refundOrPayable).toLocaleString('en-IN')}` : `Tax Payable: ₹${refundOrPayable.toLocaleString('en-IN')}`;
  page.drawText(`   ${refundText}`, { x: 50, y, font: boldFont, size: 10, color: refundOrPayable < 0 ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function issueForm16(form16Id: string, issuedBy: string): Promise<IForm16> {
  const form16 = await Form16.findById(form16Id);
  if (!form16) throw new Error('Form 16 not found');

  form16.status = 'issued';
  form16.issuedAt = new Date();
  form16.issuedBy = issuedBy;
  await form16.save();

  return form16;
}
