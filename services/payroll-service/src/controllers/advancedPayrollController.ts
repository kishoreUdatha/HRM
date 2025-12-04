import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Payroll from '../models/Payroll';
import PayrollBatch from '../models/PayrollBatch';
import TaxConfiguration from '../models/TaxConfiguration';
import * as taxService from '../services/taxService';
import * as payslipService from '../services/payslipService';
import * as bankFileService from '../services/bankFileService';

// Get/Create Tax Configuration
export const getTaxConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { countryCode } = req.params;
    let config = await TaxConfiguration.findOne({ tenantId, countryCode, isActive: true });
    if (!config) {
      config = await taxService.createDefaultTaxConfiguration(tenantId, countryCode);
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTaxConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { configId } = req.params;
    const config = await TaxConfiguration.findOneAndUpdate({ _id: configId, tenantId }, { $set: req.body }, { new: true });
    if (!config) { res.status(404).json({ success: false, message: 'Configuration not found' }); return; }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Payroll Batch
export const createPayrollBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { month, year } = req.body;

    const existing = await PayrollBatch.findOne({ tenantId, month, year });
    if (existing) { res.status(400).json({ success: false, message: 'Payroll batch already exists for this period' }); return; }

    const batchNumber = `PAY-${year}${month.toString().padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;
    const batch = new PayrollBatch({ tenantId, batchNumber, month, year, createdBy: new mongoose.Types.ObjectId(userId), status: 'draft' });
    await batch.save();

    res.status(201).json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Process Payroll Batch
export const processPayrollBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { batchId } = req.params;
    const { employeeData, countryCode = 'IN' } = req.body;

    const batch = await PayrollBatch.findOne({ _id: batchId, tenantId });
    if (!batch) { res.status(404).json({ success: false, message: 'Batch not found' }); return; }

    batch.status = 'processing';
    batch.totalEmployees = employeeData.length;
    await batch.save();

    const taxConfig = await taxService.getTaxConfiguration(tenantId, countryCode);
    if (!taxConfig) { res.status(400).json({ success: false, message: 'Tax configuration not found' }); return; }

    const payrollIds: mongoose.Types.ObjectId[] = [];
    let totalGross = 0, totalDeductions = 0, totalNet = 0, totalEmployerContrib = 0;
    const errors: { employeeId: string; error: string; timestamp: Date }[] = [];

    for (const emp of employeeData) {
      try {
        const annualSalary = emp.basicSalary * 12;
        const { tax: incomeTax } = taxService.calculateIncomeTax(annualSalary, taxConfig.taxSlabs, taxConfig.standardDeduction);
        const monthlyTax = Math.round(incomeTax / 12);
        const { deductions: statDeductions, totalEmployee, totalEmployer } = taxService.calculateStatutoryDeductions(emp.basicSalary, emp.grossSalary, emp.ctc || emp.grossSalary, taxConfig.statutoryDeductions);

        const payroll = new Payroll({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          employeeId: new mongoose.Types.ObjectId(emp.employeeId),
          month: batch.month,
          year: batch.year,
          payPeriodStart: new Date(batch.year, batch.month - 1, 1),
          payPeriodEnd: new Date(batch.year, batch.month, 0),
          baseSalary: emp.basicSalary,
          earnings: emp.earnings || [],
          deductions: [...(emp.deductions || []), ...statDeductions.map(d => ({ name: d.name, code: d.code, type: 'deduction' as const, amount: d.employeeAmount, isTaxable: false }))],
          incomeTax: monthlyTax,
          workingDays: emp.workingDays || 22,
          presentDays: emp.presentDays || 22,
          leaveDays: emp.leaveDays || 0,
          lopDays: emp.lopDays || 0,
          overtimeHours: emp.overtimeHours || 0,
          overtimePay: emp.overtimePay || 0,
          status: 'processed',
          processedBy: new mongoose.Types.ObjectId(userId),
          processedAt: new Date()
        });

        await payroll.save();
        payrollIds.push(payroll._id as mongoose.Types.ObjectId);
        totalGross += payroll.grossSalary;
        totalDeductions += payroll.totalDeductions;
        totalNet += payroll.netSalary;
        totalEmployerContrib += totalEmployer;
        batch.processedEmployees++;
      } catch (err: any) {
        errors.push({ employeeId: emp.employeeId, error: err.message, timestamp: new Date() });
        batch.failedEmployees++;
      }
    }

    batch.payrollIds = payrollIds;
    batch.totalGrossSalary = totalGross;
    batch.totalDeductions = totalDeductions;
    batch.totalNetSalary = totalNet;
    batch.totalEmployerContributions = totalEmployerContrib;
    batch.errors = errors;
    batch.status = 'processed';
    batch.processedBy = new mongoose.Types.ObjectId(userId);
    batch.processedAt = new Date();
    await batch.save();

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Payslip PDF
export const generatePayslip = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { payrollId } = req.params;
    const { companyInfo, employeeInfo } = req.body;

    const payroll = await Payroll.findOne({ _id: payrollId, tenantId: new mongoose.Types.ObjectId(tenantId) });
    if (!payroll) { res.status(404).json({ success: false, message: 'Payroll not found' }); return; }

    const payslipData = {
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      employeeName: employeeInfo.name,
      employeeId: employeeInfo.employeeId,
      designation: employeeInfo.designation,
      department: employeeInfo.department,
      dateOfJoining: employeeInfo.dateOfJoining,
      bankName: employeeInfo.bankName,
      bankAccountNumber: employeeInfo.bankAccountNumber,
      panNumber: employeeInfo.panNumber,
      uanNumber: employeeInfo.uanNumber,
      month: payroll.month,
      year: payroll.year,
      payPeriodStart: payroll.payPeriodStart.toISOString().split('T')[0],
      payPeriodEnd: payroll.payPeriodEnd.toISOString().split('T')[0],
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      leaveDays: payroll.leaveDays,
      lopDays: payroll.lopDays,
      earnings: [{ name: 'Basic Salary', amount: payroll.baseSalary }, ...payroll.earnings.map(e => ({ name: e.name, amount: e.amount })), ...(payroll.overtimePay > 0 ? [{ name: 'Overtime Pay', amount: payroll.overtimePay }] : [])],
      deductions: [...payroll.deductions.map(d => ({ name: d.name, amount: d.amount })), { name: 'Income Tax', amount: payroll.incomeTax }],
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary
    };

    const pdfBuffer = await payslipService.generatePayslipPDF(payslipData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${employeeInfo.employeeId}_${payroll.month}_${payroll.year}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Bank File
export const generateBankFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { batchId } = req.params;
    const { format = 'CSV', companyInfo, employeeBankDetails, valueDate } = req.body;

    const batch = await PayrollBatch.findOne({ _id: batchId, tenantId }).populate('payrollIds');
    if (!batch) { res.status(404).json({ success: false, message: 'Batch not found' }); return; }

    const payrolls = await Payroll.find({ _id: { $in: batch.payrollIds } });
    const records: bankFileService.PaymentRecord[] = payrolls.map(p => {
      const bankInfo = employeeBankDetails[p.employeeId.toString()] || {};
      return {
        employeeId: p.employeeId.toString(),
        employeeName: bankInfo.employeeName || 'Employee',
        bankName: bankInfo.bankName || '',
        bankCode: bankInfo.bankCode || '',
        branchCode: bankInfo.branchCode || '',
        accountNumber: bankInfo.accountNumber || '',
        ifscCode: bankInfo.ifscCode || '',
        amount: p.netSalary,
        narration: `Salary ${batch.month}/${batch.year}`
      };
    });

    const config: bankFileService.BankFileConfig = {
      format: format as any,
      companyName: companyInfo.name,
      companyAccountNumber: companyInfo.accountNumber,
      companyBankCode: companyInfo.bankCode,
      companyIfscCode: companyInfo.ifscCode,
      batchReference: batch.batchNumber,
      valueDate: new Date(valueDate || Date.now())
    };

    const { content, filename, mimeType } = bankFileService.generateBankFile(records, config);

    batch.bankFileGenerated = true;
    batch.bankFileName = filename;
    await batch.save();

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(content);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Payroll Batches
export const getPayrollBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { year, status, page = 1, limit = 10 } = req.query;
    const query: any = { tenantId };
    if (year) query.year = Number(year);
    if (status) query.status = status;

    const batches = await PayrollBatch.find(query).sort({ year: -1, month: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).lean();
    const total = await PayrollBatch.countDocuments(query);
    res.json({ success: true, data: batches, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve Payroll Batch
export const approvePayrollBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { batchId } = req.params;

    const batch = await PayrollBatch.findOneAndUpdate({ _id: batchId, tenantId, status: 'processed' }, { status: 'approved', approvedBy: new mongoose.Types.ObjectId(userId), approvedAt: new Date() }, { new: true });
    if (!batch) { res.status(404).json({ success: false, message: 'Batch not found or not in processed status' }); return; }

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark Batch as Paid
export const markBatchAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { batchId } = req.params;
    const { paymentReference } = req.body;

    const batch = await PayrollBatch.findOneAndUpdate({ _id: batchId, tenantId, status: 'approved' }, { status: 'paid', paidAt: new Date() }, { new: true });
    if (!batch) { res.status(404).json({ success: false, message: 'Batch not found or not approved' }); return; }

    await Payroll.updateMany({ _id: { $in: batch.payrollIds } }, { status: 'paid', paidAt: new Date(), paymentReference });

    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Tax Calculation Preview
export const getTaxCalculationPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { annualSalary, countryCode = 'IN', basicSalary, grossSalary } = req.body;

    const taxConfig = await taxService.getTaxConfiguration(tenantId, countryCode);
    if (!taxConfig) { res.status(400).json({ success: false, message: 'Tax configuration not found' }); return; }

    const { tax, breakdown } = taxService.calculateIncomeTax(annualSalary, taxConfig.taxSlabs, taxConfig.standardDeduction);
    const surcharge = taxService.calculateSurcharge(tax, annualSalary, taxConfig.surcharge?.slabs || []);
    const cess = taxService.calculateCess(tax + surcharge, taxConfig.cess?.rate || 0);
    const { deductions, totalEmployee, totalEmployer } = taxService.calculateStatutoryDeductions(basicSalary || annualSalary / 12, grossSalary || annualSalary / 12, annualSalary / 12, taxConfig.statutoryDeductions);

    res.json({
      success: true,
      data: {
        annualSalary,
        standardDeduction: taxConfig.standardDeduction,
        taxableIncome: annualSalary - taxConfig.standardDeduction,
        incomeTax: tax,
        surcharge,
        cess,
        totalTax: tax + surcharge + cess,
        monthlyTax: Math.round((tax + surcharge + cess) / 12),
        taxBreakdown: breakdown,
        statutoryDeductions: deductions,
        totalMonthlyStatutory: { employee: Math.round(totalEmployee), employer: Math.round(totalEmployer) }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
