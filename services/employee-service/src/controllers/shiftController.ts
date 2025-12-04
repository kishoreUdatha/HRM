import { Request, Response } from 'express';
import Shift from '../models/Shift';
import Employee from '../models/Employee';

// Get all shifts
export const getAllShifts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const { active } = req.query;
    const query: Record<string, unknown> = { tenantId };

    if (active === 'true') {
      query.isActive = true;
    }

    const shifts = await Shift.find(query).sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      data: shifts,
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shifts' });
  }
};

// Get shift by ID
export const getShiftById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const shift = await Shift.findOne({ _id: req.params.id, tenantId });

    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    // Get employee count for this shift
    const employeeCount = await Employee.countDocuments({ tenantId, shiftId: shift._id });

    res.json({
      success: true,
      data: { ...shift.toObject(), employeeCount },
    });
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shift' });
  }
};

// Create shift
export const createShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const shift = new Shift({
      ...req.body,
      tenantId,
    });

    await shift.save();

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift,
    });
  } catch (error: unknown) {
    console.error('Error creating shift:', error);
    if ((error as { code?: number }).code === 11000) {
      res.status(400).json({ success: false, message: 'Shift with this name or code already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create shift' });
  }
};

// Update shift
export const updateShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: shift,
    });
  } catch (error: unknown) {
    console.error('Error updating shift:', error);
    if ((error as { code?: number }).code === 11000) {
      res.status(400).json({ success: false, message: 'Shift with this name or code already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to update shift' });
  }
};

// Delete shift
export const deleteShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    // Check if employees are assigned to this shift
    const employeeCount = await Employee.countDocuments({ tenantId, shiftId: req.params.id });
    if (employeeCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete shift. ${employeeCount} employee(s) are assigned to this shift.`,
      });
      return;
    }

    const shift = await Shift.findOneAndDelete({ _id: req.params.id, tenantId });

    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ success: false, message: 'Failed to delete shift' });
  }
};

// Set default shift
export const setDefaultShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    // Remove default from all shifts
    await Shift.updateMany({ tenantId }, { isDefault: false });

    // Set new default
    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { isDefault: true },
      { new: true }
    );

    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Default shift updated successfully',
      data: shift,
    });
  } catch (error) {
    console.error('Error setting default shift:', error);
    res.status(500).json({ success: false, message: 'Failed to set default shift' });
  }
};

// Get employees by shift
export const getEmployeesByShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const employees = await Employee.find({ tenantId, shiftId: req.params.id })
      .select('employeeCode firstName lastName email departmentId designation status')
      .populate('departmentId', 'name')
      .sort({ firstName: 1 });

    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('Error fetching employees by shift:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
};

// Bulk assign shift to employees
export const bulkAssignShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const { shiftId, employeeIds } = req.body;

    if (!shiftId || !employeeIds || !Array.isArray(employeeIds)) {
      res.status(400).json({ success: false, message: 'Shift ID and employee IDs are required' });
      return;
    }

    // Verify shift exists
    const shift = await Shift.findOne({ _id: shiftId, tenantId });
    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }

    // Update employees
    const result = await Employee.updateMany(
      { _id: { $in: employeeIds }, tenantId },
      { shiftId }
    );

    res.json({
      success: true,
      message: `Shift assigned to ${result.modifiedCount} employee(s)`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error('Error bulk assigning shift:', error);
    res.status(500).json({ success: false, message: 'Failed to assign shift' });
  }
};

// Get shift statistics
export const getShiftStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const [totalShifts, activeShifts, shifts] = await Promise.all([
      Shift.countDocuments({ tenantId }),
      Shift.countDocuments({ tenantId, isActive: true }),
      Shift.find({ tenantId, isActive: true }).lean(),
    ]);

    // Get employee counts per shift
    const shiftEmployeeCounts = await Employee.aggregate([
      { $match: { tenantId: tenantId as unknown as import('mongoose').Types.ObjectId, shiftId: { $exists: true } } },
      { $group: { _id: '$shiftId', count: { $sum: 1 } } },
    ]);

    const employeeCountMap = new Map(
      shiftEmployeeCounts.map((s) => [s._id.toString(), s.count])
    );

    // Unassigned employees
    const unassignedCount = await Employee.countDocuments({
      tenantId,
      $or: [{ shiftId: { $exists: false } }, { shiftId: null }],
    });

    const shiftDistribution = shifts.map((shift) => ({
      shiftId: shift._id,
      name: shift.name,
      code: shift.code,
      color: shift.color,
      employeeCount: employeeCountMap.get(shift._id.toString()) || 0,
    }));

    res.json({
      success: true,
      data: {
        totalShifts,
        activeShifts,
        unassignedEmployees: unassignedCount,
        shiftDistribution,
      },
    });
  } catch (error) {
    console.error('Error fetching shift stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shift statistics' });
  }
};

// Seed default shifts
export const seedDefaultShifts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    // Check if shifts already exist
    const existingShifts = await Shift.countDocuments({ tenantId });
    if (existingShifts > 0) {
      res.status(400).json({ success: false, message: 'Shifts already exist for this tenant' });
      return;
    }

    const defaultShifts = [
      {
        tenantId,
        name: 'General Shift',
        code: 'GEN',
        description: 'Standard 9 AM to 6 PM shift',
        startTime: '09:00',
        endTime: '18:00',
        breakDuration: 60,
        weeklyOffDays: [0, 6],
        color: '#3B82F6',
        isDefault: true,
        isActive: true,
      },
      {
        tenantId,
        name: 'Morning Shift',
        code: 'MRN',
        description: '6 AM to 2 PM shift',
        startTime: '06:00',
        endTime: '14:00',
        breakDuration: 30,
        weeklyOffDays: [0],
        color: '#10B981',
        isActive: true,
      },
      {
        tenantId,
        name: 'Evening Shift',
        code: 'EVE',
        description: '2 PM to 10 PM shift',
        startTime: '14:00',
        endTime: '22:00',
        breakDuration: 30,
        weeklyOffDays: [0],
        color: '#F59E0B',
        isActive: true,
      },
      {
        tenantId,
        name: 'Night Shift',
        code: 'NGT',
        description: '10 PM to 6 AM shift',
        startTime: '22:00',
        endTime: '06:00',
        breakDuration: 30,
        weeklyOffDays: [0],
        color: '#6366F1',
        isActive: true,
      },
      {
        tenantId,
        name: 'Flexible Hours',
        code: 'FLX',
        description: 'Flexible working hours',
        startTime: '08:00',
        endTime: '20:00',
        breakDuration: 60,
        weeklyOffDays: [0, 6],
        color: '#EC4899',
        isActive: true,
      },
    ];

    const createdShifts = await Shift.insertMany(defaultShifts);

    res.status(201).json({
      success: true,
      message: `Created ${createdShifts.length} default shifts`,
      data: createdShifts,
    });
  } catch (error) {
    console.error('Error seeding default shifts:', error);
    res.status(500).json({ success: false, message: 'Failed to create default shifts' });
  }
};
