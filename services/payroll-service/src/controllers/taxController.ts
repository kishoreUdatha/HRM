import { Request, Response } from 'express';
import TaxDeclaration from '../models/TaxDeclaration';
import Form16 from '../models/Form16';
import Paystub from '../models/Paystub';
import { generateForm16, generateForm16PDF, issueForm16 } from '../services/form16Service';
import {
  generatePaystub,
  generatePaystubPDF,
  getPaystubHistory,
  getYTDSummary,
  bulkGeneratePaystubs,
  comparePaystubs,
  markPaystubAsEmailed,
  getPaystubsByStatus,
  cancelPaystub,
  getMonthlyPaystubStats
} from '../services/paystubService';
import { calculateIncomeTax, calculateStatutoryDeductions, defaultTaxConfigs } from '../services/taxService';

// ================= Tax Declaration =================

export const createTaxDeclaration = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { financialYear, regime } = req.body;

    // Check if declaration already exists
    const existing = await TaxDeclaration.findOne({ tenantId, employeeId, financialYear });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tax declaration already exists for this financial year' });
    }

    const declaration = new TaxDeclaration({
      tenantId,
      employeeId,
      financialYear,
      regime: regime || 'new',
      status: 'draft',
      section80C: { deductions: [], totalDeclared: 0, totalVerified: 0, maxLimit: 150000 },
      section80D: { deductions: [], totalDeclared: 0, totalVerified: 0, maxLimit: 100000 },
      section80CCD: { npsEmployeeContribution: 0, npsEmployerContribution: 0, totalDeclared: 0, maxLimit: 50000, status: 'pending' },
      otherDeductions: [],
      otherIncome: [],
      taxComputation: {
        grossSalary: 0,
        exemptions: { hra: 0, lta: 0, standardDeduction: 50000, otherExemptions: 0 },
        totalExemptions: 0,
        netTaxableIncome: 0,
        section80CDeductions: 0,
        section80DDeductions: 0,
        section80CCDDeductions: 0,
        otherSectionDeductions: 0,
        totalDeductions: 0,
        taxableIncome: 0,
        incomeTax: 0,
        surcharge: 0,
        cess: 0,
        totalTax: 0,
        taxAlreadyPaid: 0,
        remainingTax: 0
      }
    });

    await declaration.save();
    res.status(201).json({ success: true, data: declaration });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create tax declaration', error });
  }
};

export const getTaxDeclaration = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId, financialYear } = req.params;

    const declaration = await TaxDeclaration.findOne({ tenantId, employeeId, financialYear });
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Tax declaration not found' });
    }

    res.json({ success: true, data: declaration });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tax declaration', error });
  }
};

export const updateTaxDeclaration = async (req: Request, res: Response) => {
  try {
    const { declarationId } = req.params;
    const updates = req.body;

    const declaration = await TaxDeclaration.findById(declarationId);
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Tax declaration not found' });
    }

    if (declaration.status === 'locked' || declaration.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot update locked/approved declaration' });
    }

    // Update section totals
    if (updates.section80C?.deductions) {
      updates.section80C.totalDeclared = Math.min(150000,
        updates.section80C.deductions.reduce((sum: number, d: any) => sum + (d.declaredAmount || 0), 0)
      );
    }
    if (updates.section80D?.deductions) {
      updates.section80D.totalDeclared = Math.min(100000,
        updates.section80D.deductions.reduce((sum: number, d: any) => sum + (d.declaredAmount || 0), 0)
      );
    }

    Object.assign(declaration, updates);
    await declaration.save();

    res.json({ success: true, data: declaration });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update tax declaration', error });
  }
};

export const submitTaxDeclaration = async (req: Request, res: Response) => {
  try {
    const { declarationId } = req.params;

    const declaration = await TaxDeclaration.findById(declarationId);
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Tax declaration not found' });
    }

    declaration.status = 'submitted';
    declaration.submittedAt = new Date();
    await declaration.save();

    res.json({ success: true, data: declaration, message: 'Tax declaration submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit tax declaration', error });
  }
};

export const approveTaxDeclaration = async (req: Request, res: Response) => {
  try {
    const { declarationId } = req.params;
    const { approvedBy, comments } = req.body;

    const declaration = await TaxDeclaration.findById(declarationId);
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Tax declaration not found' });
    }

    declaration.status = 'approved';
    declaration.approvedBy = approvedBy;
    declaration.approvedAt = new Date();
    declaration.comments = comments;

    // Calculate verified totals
    declaration.section80C.totalVerified = declaration.section80C.deductions
      .filter(d => d.status === 'verified')
      .reduce((sum, d) => sum + (d.verifiedAmount || d.declaredAmount), 0);

    declaration.section80D.totalVerified = declaration.section80D.deductions
      .filter(d => d.status === 'verified')
      .reduce((sum, d) => sum + (d.verifiedAmount || d.declaredAmount), 0);

    await declaration.save();

    res.json({ success: true, data: declaration, message: 'Tax declaration approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve tax declaration', error });
  }
};

export const computeTax = async (req: Request, res: Response) => {
  try {
    const { declarationId } = req.params;
    const { grossSalary, hraExemption, ltaExemption } = req.body;

    const declaration = await TaxDeclaration.findById(declarationId);
    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Tax declaration not found' });
    }

    // Get tax configuration
    const taxConfig = defaultTaxConfigs.IN;

    // Calculate exemptions
    const exemptions = {
      hra: hraExemption || 0,
      lta: ltaExemption || 0,
      standardDeduction: declaration.regime === 'new' ? 50000 : 50000,
      otherExemptions: 0
    };
    const totalExemptions = Object.values(exemptions).reduce((a, b) => a + b, 0);

    // Calculate deductions (only applicable in old regime)
    let section80CDeductions = 0;
    let section80DDeductions = 0;
    let section80CCDDeductions = 0;
    let otherSectionDeductions = 0;

    if (declaration.regime === 'old') {
      section80CDeductions = Math.min(150000, declaration.section80C.totalVerified || declaration.section80C.totalDeclared);
      section80DDeductions = Math.min(100000, declaration.section80D.totalVerified || declaration.section80D.totalDeclared);
      section80CCDDeductions = Math.min(50000, declaration.section80CCD.totalDeclared);
      otherSectionDeductions = declaration.otherDeductions
        .filter(d => d.status !== 'rejected')
        .reduce((sum, d) => sum + Math.min(d.maxLimit || Infinity, d.verifiedAmount || d.declaredAmount), 0);
    }

    const totalDeductions = section80CDeductions + section80DDeductions + section80CCDDeductions + otherSectionDeductions;

    // Calculate taxable income
    const netTaxableIncome = grossSalary - totalExemptions;
    const taxableIncome = Math.max(0, netTaxableIncome - totalDeductions);

    // Calculate tax based on regime
    const taxSlabs = declaration.regime === 'new' ? taxConfig.taxSlabs : taxConfig.taxSlabs;
    const { tax: incomeTax } = calculateIncomeTax(taxableIncome, taxSlabs, 0);

    // Rebate under 87A (if taxable income <= 7 lakhs in new regime)
    let taxAfterRebate = incomeTax;
    if (declaration.regime === 'new' && taxableIncome <= 700000) {
      taxAfterRebate = Math.max(0, incomeTax - 25000);
    }

    // Surcharge
    let surcharge = 0;
    if (taxableIncome > 5000000) {
      const surchargeSlabs = taxConfig.surcharge.slabs;
      const applicableSlab = surchargeSlabs.find(s => taxableIncome >= s.minIncome && taxableIncome <= s.maxIncome);
      if (applicableSlab) {
        surcharge = taxAfterRebate * (applicableSlab.rate / 100);
      }
    }

    // Cess
    const cess = (taxAfterRebate + surcharge) * (taxConfig.cess.rate / 100);
    const totalTax = Math.round(taxAfterRebate + surcharge + cess);

    // Get tax already paid from paystubs
    const [fyStart, fyEnd] = declaration.financialYear.split('-').map(Number);
    const paystubs = await Paystub.find({
      tenantId: declaration.tenantId,
      employeeId: declaration.employeeId,
      $or: [
        { 'payPeriod.year': fyStart, 'payPeriod.month': { $gte: 4 } },
        { 'payPeriod.year': fyEnd, 'payPeriod.month': { $lte: 3 } }
      ]
    });
    const taxAlreadyPaid = paystubs.reduce((sum, p) => sum + (p.taxDetails?.taxDeductedThisMonth || 0), 0);

    // Update declaration
    declaration.taxComputation = {
      grossSalary,
      exemptions,
      totalExemptions,
      netTaxableIncome,
      section80CDeductions,
      section80DDeductions,
      section80CCDDeductions,
      otherSectionDeductions,
      totalDeductions,
      taxableIncome,
      incomeTax: Math.round(incomeTax),
      surcharge: Math.round(surcharge),
      cess: Math.round(cess),
      totalTax,
      taxAlreadyPaid,
      remainingTax: Math.max(0, totalTax - taxAlreadyPaid)
    };

    await declaration.save();

    res.json({ success: true, data: declaration.taxComputation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to compute tax', error });
  }
};

// ================= Form 16 =================

export const generateForm16Endpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId, financialYear } = req.params;
    const { employerDetails, employeeDetails } = req.body;

    const form16 = await generateForm16(tenantId, employeeId, financialYear, employerDetails, employeeDetails);

    res.json({ success: true, data: form16 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate Form 16', error });
  }
};

export const getForm16 = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId, financialYear } = req.params;

    const form16 = await Form16.findOne({ tenantId, employeeId, financialYear });
    if (!form16) {
      return res.status(404).json({ success: false, message: 'Form 16 not found' });
    }

    res.json({ success: true, data: form16 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch Form 16', error });
  }
};

export const downloadForm16PDF = async (req: Request, res: Response) => {
  try {
    const { form16Id } = req.params;

    const form16 = await Form16.findById(form16Id);
    if (!form16) {
      return res.status(404).json({ success: false, message: 'Form 16 not found' });
    }

    const pdfBuffer = await generateForm16PDF(form16);

    form16.downloadCount += 1;
    form16.lastDownloadedAt = new Date();
    await form16.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Form16_${form16.financialYear}_${form16.employeeId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to download Form 16', error });
  }
};

export const issueForm16Endpoint = async (req: Request, res: Response) => {
  try {
    const { form16Id } = req.params;
    const { issuedBy } = req.body;

    const form16 = await issueForm16(form16Id, issuedBy);

    res.json({ success: true, data: form16, message: 'Form 16 issued successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to issue Form 16', error });
  }
};

export const getAllForm16s = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { financialYear, status, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (financialYear) query.financialYear = financialYear;
    if (status) query.status = status;

    const form16s = await Form16.find(query)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Form16.countDocuments(query);

    res.json({
      success: true,
      data: form16s,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch Form 16s', error });
  }
};

// ================= Paystubs =================

export const generatePaystubEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const paystubData = req.body;

    const paystub = await generatePaystub(
      tenantId,
      employeeId,
      paystubData.payPeriod.month,
      paystubData.payPeriod.year,
      paystubData
    );

    res.status(201).json({ success: true, data: paystub });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate paystub', error });
  }
};

export const getPaystub = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId, month, year } = req.params;

    const paystub = await Paystub.findOne({
      tenantId,
      employeeId,
      'payPeriod.month': +month,
      'payPeriod.year': +year
    });

    if (!paystub) {
      return res.status(404).json({ success: false, message: 'Paystub not found' });
    }

    res.json({ success: true, data: paystub });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch paystub', error });
  }
};

export const downloadPaystubPDF = async (req: Request, res: Response) => {
  try {
    const { paystubId } = req.params;
    const { companyName, companyAddress } = req.query;

    const paystub = await Paystub.findById(paystubId);
    if (!paystub) {
      return res.status(404).json({ success: false, message: 'Paystub not found' });
    }

    const pdfBuffer = await generatePaystubPDF(paystub, {
      name: companyName as string || 'Company Name',
      address: companyAddress as string || 'Company Address'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Payslip_${paystub.payPeriod.month}_${paystub.payPeriod.year}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to download paystub', error });
  }
};

export const getPaystubHistoryEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { year } = req.query;

    const history = await getPaystubHistory(tenantId, employeeId, year ? +year : undefined);

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch paystub history', error });
  }
};

export const getYTDSummaryEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId, year } = req.params;

    const summary = await getYTDSummary(tenantId, employeeId, +year);

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch YTD summary', error });
  }
};

export const approvePaystub = async (req: Request, res: Response) => {
  try {
    const { paystubId } = req.params;
    const { approvedBy } = req.body;

    const paystub = await Paystub.findByIdAndUpdate(
      paystubId,
      { status: 'approved', approvedBy, approvedAt: new Date() },
      { new: true }
    );

    if (!paystub) {
      return res.status(404).json({ success: false, message: 'Paystub not found' });
    }

    res.json({ success: true, data: paystub });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve paystub', error });
  }
};

// ================= Tax Computation Helpers =================

export const calculateHRAExemption = async (req: Request, res: Response) => {
  try {
    const { basicSalary, hraReceived, rentPaid, cityType } = req.body;

    const hraPercentage = cityType === 'metro' ? 50 : 40;

    // HRA exemption is minimum of:
    // 1. Actual HRA received
    // 2. 50%/40% of basic salary
    // 3. Rent paid - 10% of basic salary

    const exemption1 = hraReceived;
    const exemption2 = basicSalary * (hraPercentage / 100);
    const exemption3 = Math.max(0, rentPaid - (basicSalary * 0.10));

    const hraExemption = Math.min(exemption1, exemption2, exemption3);

    res.json({
      success: true,
      data: {
        actualHRA: hraReceived,
        percentageOfBasic: exemption2,
        rentMinusBasic: exemption3,
        hraExemption: Math.round(hraExemption),
        taxableHRA: Math.round(hraReceived - hraExemption)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate HRA exemption', error });
  }
};

export const compareRegimes = async (req: Request, res: Response) => {
  try {
    const { grossSalary, exemptions, deductions } = req.body;

    const taxConfig = defaultTaxConfigs.IN;

    // Old regime calculation
    const oldRegimeDeductions = deductions.section80C + deductions.section80D + deductions.section80CCD + (deductions.other || 0);
    const oldRegimeTaxableIncome = Math.max(0, grossSalary - exemptions.total - oldRegimeDeductions);
    const oldRegimeTax = calculateIncomeTax(oldRegimeTaxableIncome, taxConfig.taxSlabs, 0);

    // New regime calculation (no deductions except standard)
    const newRegimeTaxableIncome = Math.max(0, grossSalary - 50000);
    const newRegimeTax = calculateIncomeTax(newRegimeTaxableIncome, taxConfig.taxSlabs, 0);

    // Apply rebate for new regime
    let newRegimeFinalTax = newRegimeTax.tax;
    if (newRegimeTaxableIncome <= 700000) {
      newRegimeFinalTax = Math.max(0, newRegimeFinalTax - 25000);
    }

    // Add cess
    const oldCess = oldRegimeTax.tax * 0.04;
    const newCess = newRegimeFinalTax * 0.04;

    const oldTotalTax = Math.round(oldRegimeTax.tax + oldCess);
    const newTotalTax = Math.round(newRegimeFinalTax + newCess);

    res.json({
      success: true,
      data: {
        oldRegime: {
          taxableIncome: oldRegimeTaxableIncome,
          incomeTax: oldRegimeTax.tax,
          cess: Math.round(oldCess),
          totalTax: oldTotalTax
        },
        newRegime: {
          taxableIncome: newRegimeTaxableIncome,
          incomeTax: newRegimeFinalTax,
          cess: Math.round(newCess),
          totalTax: newTotalTax
        },
        recommendation: oldTotalTax < newTotalTax ? 'old' : 'new',
        savings: Math.abs(oldTotalTax - newTotalTax)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to compare tax regimes', error });
  }
};

// ================= Enhanced Paystub Endpoints =================

export const bulkGeneratePaystubsEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeIds, month, year, employeeDataMap } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Employee IDs array is required' });
    }

    const result = await bulkGeneratePaystubs(tenantId, employeeIds, month, year, employeeDataMap);

    res.status(201).json({
      success: true,
      data: result,
      message: `Generated ${result.success.length} paystubs, ${result.failed.length} failed`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to bulk generate paystubs', error });
  }
};

export const comparePaystubsEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { period1Month, period1Year, period2Month, period2Year } = req.query;

    if (!period1Month || !period1Year || !period2Month || !period2Year) {
      return res.status(400).json({ success: false, message: 'Both periods are required' });
    }

    const comparison = await comparePaystubs(
      tenantId,
      employeeId,
      { month: +period1Month, year: +period1Year },
      { month: +period2Month, year: +period2Year }
    );

    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to compare paystubs', error });
  }
};

export const markPaystubEmailedEndpoint = async (req: Request, res: Response) => {
  try {
    const { paystubId } = req.params;

    const paystub = await markPaystubAsEmailed(paystubId);
    if (!paystub) {
      return res.status(404).json({ success: false, message: 'Paystub not found' });
    }

    res.json({ success: true, data: paystub, message: 'Paystub marked as emailed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark paystub as emailed', error });
  }
};

export const getPaystubsByStatusEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, month, year } = req.query;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const paystubs = await getPaystubsByStatus(
      tenantId,
      status as 'draft' | 'processed' | 'approved' | 'paid' | 'cancelled',
      month ? +month : undefined,
      year ? +year : undefined
    );

    res.json({ success: true, data: paystubs, count: paystubs.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch paystubs by status', error });
  }
};

export const cancelPaystubEndpoint = async (req: Request, res: Response) => {
  try {
    const { paystubId } = req.params;
    const { reason } = req.body;

    const paystub = await cancelPaystub(paystubId, reason);
    if (!paystub) {
      return res.status(404).json({ success: false, message: 'Paystub not found' });
    }

    res.json({ success: true, data: paystub, message: 'Paystub cancelled successfully' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot cancel')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to cancel paystub', error });
  }
};

export const getMonthlyPaystubStatsEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId, month, year } = req.params;

    const stats = await getMonthlyPaystubStats(tenantId, +month, +year);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch monthly paystub stats', error });
  }
};
