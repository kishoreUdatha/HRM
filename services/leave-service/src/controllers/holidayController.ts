import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Holiday from '../models/Holiday';

// Create holiday
export const createHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const holiday = new Holiday({ ...req.body, tenantId });
    await holiday.save();

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: { holiday },
    });
  } catch (error) {
    console.error('[Leave Service] Create holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create holiday',
    });
  }
};

// Get holidays
export const getHolidays = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { year, type, isActive } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (year) {
      const startOfYear = new Date(Number(year), 0, 1);
      const endOfYear = new Date(Number(year), 11, 31);
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }

    if (type) {
      query.type = type;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const holidays = await Holiday.find(query).sort({ date: 1 }).lean();

    res.status(200).json({
      success: true,
      data: { holidays },
    });
  } catch (error) {
    console.error('[Leave Service] Get holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holidays',
    });
  }
};

// Get holiday by ID
export const getHolidayById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const holiday = await Holiday.findOne({ _id: id, tenantId }).lean();

    if (!holiday) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { holiday },
    });
  } catch (error) {
    console.error('[Leave Service] Get holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holiday',
    });
  }
};

// Update holiday
export const updateHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const holiday = await Holiday.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!holiday) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: { holiday },
    });
  } catch (error) {
    console.error('[Leave Service] Update holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update holiday',
    });
  }
};

// Delete holiday
export const deleteHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const holiday = await Holiday.findOneAndDelete({ _id: id, tenantId });

    if (!holiday) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('[Leave Service] Delete holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete holiday',
    });
  }
};

// Bulk create holidays
export const bulkCreateHolidays = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { holidays } = req.body;

    const created = [];
    for (const holidayData of holidays) {
      const holiday = new Holiday({ ...holidayData, tenantId });
      await holiday.save();
      created.push(holiday);
    }

    res.status(201).json({
      success: true,
      message: `${created.length} holidays created`,
      data: { holidays: created },
    });
  } catch (error) {
    console.error('[Leave Service] Bulk create holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create holidays',
    });
  }
};

// Check if date is holiday
export const isHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { date } = req.params;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(checkDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const holiday = await Holiday.findOne({
      tenantId,
      date: { $gte: checkDate, $lt: nextDay },
      isActive: true,
    }).lean();

    res.status(200).json({
      success: true,
      data: {
        isHoliday: !!holiday,
        holiday,
      },
    });
  } catch (error) {
    console.error('[Leave Service] Check holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check holiday',
    });
  }
};
