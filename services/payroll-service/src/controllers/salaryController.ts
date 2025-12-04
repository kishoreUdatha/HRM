import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import SalaryStructure from '../models/SalaryStructure';
import EmployeeSalary from '../models/EmployeeSalary';

// ==================== SALARY STRUCTURE CONTROLLERS ====================

export const createSalaryStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;

    if (req.body.isDefault) {
      await SalaryStructure.updateMany({ tenantId, isDefault: true }, { isDefault: false });
    }

    const salaryStructure = new SalaryStructure({ ...req.body, tenantId });
    await salaryStructure.save();

    res.status(201).json({
      success: true,
      message: 'Salary structure created successfully',
      data: { salaryStructure },
    });
  } catch (error: unknown) {
    console.error('[Payroll Service] Create salary structure error:', error);
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Salary structure with this code already exists',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create salary structure',
    });
  }
};

export const getSalaryStructures = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { isActive } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const salaryStructures = await SalaryStructure.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: { salaryStructures },
    });
  } catch (error) {
    console.error('[Payroll Service] Get salary structures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary structures',
    });
  }
};

export const getSalaryStructureById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const salaryStructure = await SalaryStructure.findOne({ _id: id, tenantId }).lean();

    if (!salaryStructure) {
      res.status(404).json({ success: false, message: 'Salary structure not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { salaryStructure },
    });
  } catch (error) {
    console.error('[Payroll Service] Get salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary structure',
    });
  }
};

export const updateSalaryStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (req.body.isDefault) {
      await SalaryStructure.updateMany({ tenantId, isDefault: true, _id: { $ne: id } }, { isDefault: false });
    }

    const salaryStructure = await SalaryStructure.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!salaryStructure) {
      res.status(404).json({ success: false, message: 'Salary structure not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Salary structure updated successfully',
      data: { salaryStructure },
    });
  } catch (error) {
    console.error('[Payroll Service] Update salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salary structure',
    });
  }
};

export const deleteSalaryStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    // Check if any employees are using this structure
    const employeesUsing = await EmployeeSalary.countDocuments({ tenantId, salaryStructureId: id, isActive: true });
    if (employeesUsing > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete. ${employeesUsing} employees are using this salary structure`,
      });
      return;
    }

    const salaryStructure = await SalaryStructure.findOneAndDelete({ _id: id, tenantId });

    if (!salaryStructure) {
      res.status(404).json({ success: false, message: 'Salary structure not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Salary structure deleted successfully',
    });
  } catch (error) {
    console.error('[Payroll Service] Delete salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary structure',
    });
  }
};

// Seed default salary structure
export const seedSalaryStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const existing = await SalaryStructure.findOne({ tenantId, code: 'DEFAULT' });
    if (existing) {
      res.status(200).json({
        success: true,
        message: 'Default salary structure already exists',
        data: { salaryStructure: existing },
      });
      return;
    }

    const defaultStructure = new SalaryStructure({
      tenantId,
      name: 'Default Salary Structure',
      code: 'DEFAULT',
      description: 'Standard salary structure with common components',
      isDefault: true,
      components: [
        { name: 'House Rent Allowance', code: 'HRA', type: 'earning', calculationType: 'percentage', value: 40, percentageOf: 'basic', isTaxable: true, isActive: true },
        { name: 'Dearness Allowance', code: 'DA', type: 'earning', calculationType: 'percentage', value: 10, percentageOf: 'basic', isTaxable: true, isActive: true },
        { name: 'Transport Allowance', code: 'TA', type: 'earning', calculationType: 'fixed', value: 1600, isTaxable: false, isActive: true },
        { name: 'Medical Allowance', code: 'MA', type: 'earning', calculationType: 'fixed', value: 1250, isTaxable: false, isActive: true },
        { name: 'Provident Fund', code: 'PF', type: 'deduction', calculationType: 'percentage', value: 12, percentageOf: 'basic', isTaxable: false, isActive: true },
        { name: 'Professional Tax', code: 'PT', type: 'deduction', calculationType: 'fixed', value: 200, isTaxable: false, isActive: true },
      ],
    });

    await defaultStructure.save();

    res.status(201).json({
      success: true,
      message: 'Default salary structure created',
      data: { salaryStructure: defaultStructure },
    });
  } catch (error) {
    console.error('[Payroll Service] Seed salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed salary structure',
    });
  }
};

// ==================== EMPLOYEE SALARY CONTROLLERS ====================

export const assignSalary = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, salaryStructureId, baseSalary, currency, payFrequency, bankDetails, effectiveFrom } = req.body;

    // Deactivate previous salary assignment
    await EmployeeSalary.updateMany(
      { tenantId, employeeId, isActive: true },
      { isActive: false, effectiveTo: new Date(effectiveFrom) }
    );

    const employeeSalary = new EmployeeSalary({
      tenantId,
      employeeId,
      salaryStructureId,
      baseSalary,
      currency,
      payFrequency,
      bankDetails,
      effectiveFrom: new Date(effectiveFrom),
      isActive: true,
    });

    await employeeSalary.save();

    res.status(201).json({
      success: true,
      message: 'Salary assigned successfully',
      data: { employeeSalary },
    });
  } catch (error) {
    console.error('[Payroll Service] Assign salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign salary',
    });
  }
};

export const getEmployeeSalary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const { includeHistory } = req.query;

    const query: Record<string, unknown> = { tenantId, employeeId };
    if (includeHistory !== 'true') {
      query.isActive = true;
    }

    const salaries = await EmployeeSalary.find(query)
      .populate('salaryStructureId', 'name code components')
      .sort({ effectiveFrom: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { salaries },
    });
  } catch (error) {
    console.error('[Payroll Service] Get employee salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee salary',
    });
  }
};

export const updateEmployeeSalary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const employeeSalary = await EmployeeSalary.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!employeeSalary) {
      res.status(404).json({ success: false, message: 'Employee salary not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Employee salary updated successfully',
      data: { employeeSalary },
    });
  } catch (error) {
    console.error('[Payroll Service] Update employee salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee salary',
    });
  }
};
