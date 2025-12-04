import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import LeaveType from '../models/LeaveType';

// Create leave type
export const createLeaveType = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const leaveType = new LeaveType({ ...req.body, tenantId });
    await leaveType.save();

    res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: { leaveType },
    });
  } catch (error: unknown) {
    console.error('[Leave Service] Create leave type error:', error);
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Leave type with this code already exists',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create leave type',
    });
  }
};

// Get all leave types
export const getLeaveTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { isActive } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const leaveTypes = await LeaveType.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: { leaveTypes },
    });
  } catch (error) {
    console.error('[Leave Service] Get leave types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave types',
    });
  }
};

// Get leave type by ID
export const getLeaveTypeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const leaveType = await LeaveType.findOne({ _id: id, tenantId }).lean();

    if (!leaveType) {
      res.status(404).json({ success: false, message: 'Leave type not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { leaveType },
    });
  } catch (error) {
    console.error('[Leave Service] Get leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave type',
    });
  }
};

// Update leave type
export const updateLeaveType = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const leaveType = await LeaveType.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!leaveType) {
      res.status(404).json({ success: false, message: 'Leave type not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Leave type updated successfully',
      data: { leaveType },
    });
  } catch (error) {
    console.error('[Leave Service] Update leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave type',
    });
  }
};

// Delete leave type
export const deleteLeaveType = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const leaveType = await LeaveType.findOneAndDelete({ _id: id, tenantId });

    if (!leaveType) {
      res.status(404).json({ success: false, message: 'Leave type not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Leave type deleted successfully',
    });
  } catch (error) {
    console.error('[Leave Service] Delete leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave type',
    });
  }
};

// Seed default leave types
export const seedLeaveTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const defaultTypes = [
      { name: 'Annual Leave', code: 'AL', defaultDays: 21, maxDays: 30, carryForward: true, maxCarryForwardDays: 5, isPaid: true },
      { name: 'Sick Leave', code: 'SL', defaultDays: 12, maxDays: 15, carryForward: false, isPaid: true, minDaysNotice: 0 },
      { name: 'Casual Leave', code: 'CL', defaultDays: 6, maxDays: 6, carryForward: false, isPaid: true },
      { name: 'Maternity Leave', code: 'ML', defaultDays: 90, maxDays: 180, isPaid: true, applicableGender: 'female' },
      { name: 'Paternity Leave', code: 'PL', defaultDays: 5, maxDays: 15, isPaid: true, applicableGender: 'male' },
      { name: 'Unpaid Leave', code: 'UL', defaultDays: 0, maxDays: 60, isPaid: false, allowNegativeBalance: true },
      { name: 'Compensatory Off', code: 'CO', defaultDays: 0, maxDays: 30, carryForward: true, isPaid: true },
    ];

    const created = [];
    for (const type of defaultTypes) {
      const existing = await LeaveType.findOne({ tenantId, code: type.code });
      if (!existing) {
        const leaveType = new LeaveType({ ...type, tenantId });
        await leaveType.save();
        created.push(leaveType);
      }
    }

    res.status(200).json({
      success: true,
      message: `${created.length} leave types created`,
      data: { leaveTypes: created },
    });
  } catch (error) {
    console.error('[Leave Service] Seed leave types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed leave types',
    });
  }
};
