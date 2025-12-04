import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Shift from '../models/Shift';

// Create shift
export const createShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const { name, code, startTime, endTime, breakDuration, graceMinutes, workingDays, isDefault } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await Shift.updateMany({ tenantId, isDefault: true }, { isDefault: false });
    }

    const shift = new Shift({
      tenantId,
      name,
      code,
      startTime,
      endTime,
      breakDuration,
      graceMinutes,
      workingDays,
      isDefault,
    });

    await shift.save();

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: { shift },
    });
  } catch (error: unknown) {
    console.error('[Attendance Service] Create shift error:', error);
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Shift with this code already exists',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create shift',
    });
  }
};

// Get all shifts
export const getShifts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { isActive } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const shifts = await Shift.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: { shifts },
    });
  } catch (error) {
    console.error('[Attendance Service] Get shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts',
    });
  }
};

// Get shift by ID
export const getShiftById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const shift = await Shift.findOne({ _id: id, tenantId }).lean();

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { shift },
    });
  } catch (error) {
    console.error('[Attendance Service] Get shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shift',
    });
  }
};

// Update shift
export const updateShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const updateData = req.body;

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await Shift.updateMany({ tenantId, isDefault: true, _id: { $ne: id } }, { isDefault: false });
    }

    const shift = await Shift.findOneAndUpdate(
      { _id: id, tenantId },
      updateData,
      { new: true }
    );

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Shift updated successfully',
      data: { shift },
    });
  } catch (error) {
    console.error('[Attendance Service] Update shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shift',
    });
  }
};

// Delete shift
export const deleteShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const shift = await Shift.findOneAndDelete({ _id: id, tenantId });

    if (!shift) {
      res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('[Attendance Service] Delete shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift',
    });
  }
};
