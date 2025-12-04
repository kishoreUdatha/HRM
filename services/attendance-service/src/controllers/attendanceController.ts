import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Attendance from '../models/Attendance';
import Shift from '../models/Shift';

// Check In
export const checkIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, location, notes } = req.body;

    const targetEmployeeId = employeeId || userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      tenantId,
      employeeId: targetEmployeeId,
      date: today,
    });

    if (existingAttendance && existingAttendance.checkIn) {
      res.status(400).json({
        success: false,
        message: 'Already checked in today',
      });
      return;
    }

    const now = new Date();

    // Get employee's shift to determine if late
    const shift = await Shift.findOne({ tenantId, isDefault: true });
    let status: 'present' | 'late' = 'present';

    if (shift) {
      const [shiftHour, shiftMinute] = shift.startTime.split(':').map(Number);
      const shiftStart = new Date(today);
      shiftStart.setHours(shiftHour, shiftMinute + shift.graceMinutes, 0, 0);

      if (now > shiftStart) {
        status = 'late';
      }
    }

    const attendance = existingAttendance || new Attendance({
      tenantId,
      employeeId: targetEmployeeId,
      date: today,
    });

    attendance.checkIn = now;
    attendance.status = status;
    if (location) {
      attendance.checkInLocation = location;
    }
    if (notes) {
      attendance.notes = notes;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: { attendance },
    });
  } catch (error) {
    console.error('[Attendance Service] Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in',
    });
  }
};

// Check Out
export const checkOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, location, notes } = req.body;

    const targetEmployeeId = employeeId || userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      tenantId,
      employeeId: targetEmployeeId,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      res.status(400).json({
        success: false,
        message: 'No check-in record found for today',
      });
      return;
    }

    if (attendance.checkOut) {
      res.status(400).json({
        success: false,
        message: 'Already checked out today',
      });
      return;
    }

    attendance.checkOut = new Date();
    if (location) {
      attendance.checkOutLocation = location;
    }
    if (notes) {
      attendance.notes = (attendance.notes || '') + ' ' + notes;
    }

    // Check if half day (less than 4 hours)
    const workHours = (attendance.checkOut.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
    if (workHours < 4) {
      attendance.status = 'half_day';
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Check-out successful',
      data: { attendance },
    });
  } catch (error) {
    console.error('[Attendance Service] Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check out',
    });
  }
};

// Get attendance records
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, startDate, endDate, status, page = 1, limit = 50 } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        (query.date as Record<string, unknown>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (query.date as Record<string, unknown>).$lte = new Date(endDate as string);
      }
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, checkIn: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Attendance.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
    });
  }
};

// Get today's attendance status
export const getTodayStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      tenantId,
      employeeId,
      date: today,
    });

    res.status(200).json({
      success: true,
      data: {
        attendance,
        isCheckedIn: !!attendance?.checkIn,
        isCheckedOut: !!attendance?.checkOut,
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Get today status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today status',
    });
  }
};

// Get attendance summary/stats
export const getAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, month, year } = req.query;

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const query: Record<string, unknown> = {
      tenantId,
      date: { $gte: startDate, $lte: endDate },
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const records = await Attendance.find(query).lean();

    const summary = {
      totalDays: endDate.getDate(),
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
      onLeave: records.filter(r => r.status === 'on_leave').length,
      holidays: records.filter(r => r.status === 'holiday').length,
      weekends: records.filter(r => r.status === 'weekend').length,
      totalWorkHours: records.reduce((sum, r) => sum + (r.workHours || 0), 0),
      totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
    };

    res.status(200).json({
      success: true,
      data: { summary, records },
    });
  } catch (error) {
    console.error('[Attendance Service] Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary',
    });
  }
};

// Mark attendance (admin)
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, date, status, checkIn, checkOut, notes } = req.body;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      tenantId,
      employeeId,
      date: attendanceDate,
    });

    if (attendance) {
      attendance.status = status;
      if (checkIn) attendance.checkIn = new Date(checkIn);
      if (checkOut) attendance.checkOut = new Date(checkOut);
      if (notes) attendance.notes = notes;
      attendance.approvedBy = userId as unknown as typeof attendance.approvedBy;
    } else {
      attendance = new Attendance({
        tenantId,
        employeeId,
        date: attendanceDate,
        status,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        notes,
        approvedBy: userId,
      });
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: { attendance },
    });
  } catch (error) {
    console.error('[Attendance Service] Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
    });
  }
};

// Bulk mark attendance
export const bulkMarkAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { records } = req.body;

    const results = [];

    for (const record of records) {
      const { employeeId, date, status } = record;
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOneAndUpdate(
        { tenantId, employeeId, date: attendanceDate },
        {
          tenantId,
          employeeId,
          date: attendanceDate,
          status,
          approvedBy: userId,
        },
        { upsert: true, new: true }
      );

      results.push(attendance);
    }

    res.status(200).json({
      success: true,
      message: `${results.length} attendance records updated`,
      data: { records: results },
    });
  } catch (error) {
    console.error('[Attendance Service] Bulk mark error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk mark attendance',
    });
  }
};
