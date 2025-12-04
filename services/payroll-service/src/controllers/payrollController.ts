import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Payroll from '../models/Payroll';
import EmployeeSalary from '../models/EmployeeSalary';
import SalaryStructure from '../models/SalaryStructure';

// Generate payroll for an employee
export const generatePayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, month, year } = req.body;

    // Check if payroll already exists
    const existing = await Payroll.findOne({ tenantId, employeeId, month, year });
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Payroll already exists for this period',
      });
      return;
    }

    // Get employee salary configuration
    const employeeSalary = await EmployeeSalary.findOne({
      tenantId,
      employeeId,
      isActive: true,
    }).populate('salaryStructureId');

    if (!employeeSalary) {
      res.status(404).json({
        success: false,
        message: 'No salary configuration found for employee',
      });
      return;
    }

    const salaryStructure = await SalaryStructure.findById(employeeSalary.salaryStructureId);
    if (!salaryStructure) {
      res.status(404).json({
        success: false,
        message: 'Salary structure not found',
      });
      return;
    }

    // Calculate pay period
    const payPeriodStart = new Date(year, month - 1, 1);
    const payPeriodEnd = new Date(year, month, 0);
    const workingDays = getWorkingDays(payPeriodStart, payPeriodEnd);

    // Calculate components
    const earnings: Array<{name: string; code: string; type: 'earning'; amount: number; isTaxable: boolean}> = [];
    const deductions: Array<{name: string; code: string; type: 'deduction'; amount: number; isTaxable: boolean}> = [];
    const baseSalary = employeeSalary.baseSalary;

    for (const component of salaryStructure.components) {
      if (!component.isActive) continue;

      let amount = 0;
      if (component.calculationType === 'fixed') {
        amount = component.value;
      } else if (component.calculationType === 'percentage') {
        const baseForCalc = component.percentageOf === 'basic' ? baseSalary : baseSalary;
        amount = (baseForCalc * component.value) / 100;
      }

      if (component.type === 'earning') {
        earnings.push({
          name: component.name,
          code: component.code,
          type: 'earning',
          amount,
          isTaxable: component.isTaxable,
        });
      } else {
        deductions.push({
          name: component.name,
          code: component.code,
          type: 'deduction',
          amount,
          isTaxable: component.isTaxable,
        });
      }
    }

    // Create payroll record
    const payroll = new Payroll({
      tenantId,
      employeeId,
      month,
      year,
      payPeriodStart,
      payPeriodEnd,
      baseSalary,
      earnings,
      deductions,
      workingDays,
      presentDays: workingDays, // Default to all working days
      processedBy: userId,
      status: 'draft',
    });

    await payroll.save();

    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Generate payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payroll',
    });
  }
};

// Get payrolls
export const getPayrolls = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, month, year, status, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [payrolls, total] = await Promise.all([
      Payroll.find(query)
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payroll.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        payrolls,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Payroll Service] Get payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payrolls',
    });
  }
};

// Get payroll by ID
export const getPayrollById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const payroll = await Payroll.findOne({ _id: id, tenantId }).lean();

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payroll not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Get payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll',
    });
  }
};

// Process payroll
export const processPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const payroll = await Payroll.findOne({ _id: id, tenantId });

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payroll not found' });
      return;
    }

    if (payroll.status !== 'draft') {
      res.status(400).json({ success: false, message: 'Payroll is not in draft status' });
      return;
    }

    payroll.status = 'processed';
    payroll.processedBy = userId as unknown as typeof payroll.processedBy;
    payroll.processedAt = new Date();
    await payroll.save();

    res.status(200).json({
      success: true,
      message: 'Payroll processed successfully',
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Process payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payroll',
    });
  }
};

// Mark payroll as paid
export const markAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { paymentReference } = req.body;

    const payroll = await Payroll.findOne({ _id: id, tenantId });

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payroll not found' });
      return;
    }

    if (payroll.status !== 'processed') {
      res.status(400).json({ success: false, message: 'Payroll must be processed before marking as paid' });
      return;
    }

    payroll.status = 'paid';
    payroll.paidAt = new Date();
    payroll.paymentReference = paymentReference;
    await payroll.save();

    res.status(200).json({
      success: true,
      message: 'Payroll marked as paid',
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Mark as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payroll as paid',
    });
  }
};

// Bulk generate payroll
export const bulkGeneratePayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { month, year, employeeIds } = req.body;

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const employeeId of employeeIds) {
      try {
        // Check if already exists
        const existing = await Payroll.findOne({ tenantId, employeeId, month, year });
        if (existing) {
          results.errors.push(`Payroll already exists for employee ${employeeId}`);
          results.failed++;
          continue;
        }

        const employeeSalary = await EmployeeSalary.findOne({
          tenantId,
          employeeId,
          isActive: true,
        });

        if (!employeeSalary) {
          results.errors.push(`No salary config for employee ${employeeId}`);
          results.failed++;
          continue;
        }

        const salaryStructure = await SalaryStructure.findById(employeeSalary.salaryStructureId);
        if (!salaryStructure) {
          results.failed++;
          continue;
        }

        const payPeriodStart = new Date(year, month - 1, 1);
        const payPeriodEnd = new Date(year, month, 0);
        const workingDays = getWorkingDays(payPeriodStart, payPeriodEnd);

        const earnings: Array<{name: string; code: string; type: 'earning'; amount: number; isTaxable: boolean}> = [];
        const deductions: Array<{name: string; code: string; type: 'deduction'; amount: number; isTaxable: boolean}> = [];
        const baseSalary = employeeSalary.baseSalary;

        for (const component of salaryStructure.components) {
          if (!component.isActive) continue;
          let amount = component.calculationType === 'fixed' ? component.value : (baseSalary * component.value) / 100;

          if (component.type === 'earning') {
            earnings.push({ name: component.name, code: component.code, type: 'earning', amount, isTaxable: component.isTaxable });
          } else {
            deductions.push({ name: component.name, code: component.code, type: 'deduction', amount, isTaxable: component.isTaxable });
          }
        }

        const payroll = new Payroll({
          tenantId,
          employeeId,
          month,
          year,
          payPeriodStart,
          payPeriodEnd,
          baseSalary,
          earnings,
          deductions,
          workingDays,
          presentDays: workingDays,
          processedBy: userId,
          status: 'draft',
        });

        await payroll.save();
        results.success++;
      } catch (err) {
        results.failed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${results.success} payrolls, ${results.failed} failed`,
      data: results,
    });
  } catch (error) {
    console.error('[Payroll Service] Bulk generate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk generate payroll',
    });
  }
};

// Get payroll summary
export const getPayrollSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { month, year } = req.query;

    const payrolls = await Payroll.find({
      tenantId,
      month: Number(month),
      year: Number(year),
    }).lean();

    const summary = {
      totalEmployees: payrolls.length,
      totalGrossSalary: payrolls.reduce((sum, p) => sum + p.grossSalary, 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
      totalNetSalary: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
      totalTax: payrolls.reduce((sum, p) => sum + p.incomeTax, 0),
      statusBreakdown: {
        draft: payrolls.filter(p => p.status === 'draft').length,
        processing: payrolls.filter(p => p.status === 'processing').length,
        processed: payrolls.filter(p => p.status === 'processed').length,
        paid: payrolls.filter(p => p.status === 'paid').length,
      },
    };

    res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error('[Payroll Service] Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll summary',
    });
  }
};

// Helper function to calculate working days
function getWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
