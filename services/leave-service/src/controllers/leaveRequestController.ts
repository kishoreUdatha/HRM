import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import LeaveRequest from '../models/LeaveRequest';
import LeaveBalance from '../models/LeaveBalance';
import LeaveType from '../models/LeaveType';

// Create leave request
export const createLeaveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { leaveTypeId, startDate, endDate, reason, isHalfDay, halfDayType, attachments } = req.body;
    const employeeId = req.body.employeeId || userId;

    // Get leave type
    const leaveType = await LeaveType.findOne({ _id: leaveTypeId, tenantId });
    if (!leaveType) {
      res.status(404).json({ success: false, message: 'Leave type not found' });
      return;
    }

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (isHalfDay) {
      days = 0.5;
    }

    // Check balance
    const currentYear = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      tenantId,
      employeeId,
      leaveTypeId,
      year: currentYear,
    });

    if (balance && !leaveType.allowNegativeBalance) {
      if (balance.balance < days) {
        res.status(400).json({
          success: false,
          message: `Insufficient leave balance. Available: ${balance.balance}, Requested: ${days}`,
        });
        return;
      }
    }

    // Check for overlapping requests
    const overlapping = await LeaveRequest.findOne({
      tenantId,
      employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      res.status(400).json({
        success: false,
        message: 'You have an overlapping leave request for these dates',
      });
      return;
    }

    const leaveRequest = new LeaveRequest({
      tenantId,
      employeeId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      isHalfDay,
      halfDayType,
      reason,
      attachments,
      status: leaveType.requiresApproval ? 'pending' : 'approved',
    });

    await leaveRequest.save();

    // Update pending balance
    if (balance) {
      balance.pending += days;
      await balance.save();
    }

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('[Leave Service] Create request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
    });
  }
};

// Get leave requests
export const getLeaveRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, status, leaveTypeId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (leaveTypeId) query.leaveTypeId = leaveTypeId;

    if (startDate || endDate) {
      if (startDate) {
        query.startDate = { $gte: new Date(startDate as string) };
      }
      if (endDate) {
        query.endDate = { $lte: new Date(endDate as string) };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      LeaveRequest.find(query)
        .populate('leaveTypeId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      LeaveRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        leaves: requests,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Leave Service] Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
    });
  }
};

// Get leave request by ID
export const getLeaveRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findOne({ _id: id, tenantId })
      .populate('leaveTypeId', 'name code')
      .lean();

    if (!leaveRequest) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('[Leave Service] Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave request',
    });
  }
};

// Approve leave request
export const approveLeaveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findOne({ _id: id, tenantId });

    if (!leaveRequest) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    if (leaveRequest.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Leave request is not pending' });
      return;
    }

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = userId as unknown as typeof leaveRequest.approvedBy;
    leaveRequest.approvedAt = new Date();
    await leaveRequest.save();

    // Update leave balance
    const currentYear = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      tenantId,
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year: currentYear,
    });

    if (balance) {
      balance.pending -= leaveRequest.days;
      balance.used += leaveRequest.days;
      await balance.save();
    }

    res.status(200).json({
      success: true,
      message: 'Leave request approved',
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('[Leave Service] Approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve leave request',
    });
  }
};

// Reject leave request
export const rejectLeaveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { reason } = req.body;

    const leaveRequest = await LeaveRequest.findOne({ _id: id, tenantId });

    if (!leaveRequest) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    if (leaveRequest.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Leave request is not pending' });
      return;
    }

    leaveRequest.status = 'rejected';
    leaveRequest.approvedBy = userId as unknown as typeof leaveRequest.approvedBy;
    leaveRequest.rejectionReason = reason;
    await leaveRequest.save();

    // Restore pending balance
    const currentYear = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      tenantId,
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year: currentYear,
    });

    if (balance) {
      balance.pending -= leaveRequest.days;
      await balance.save();
    }

    res.status(200).json({
      success: true,
      message: 'Leave request rejected',
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('[Leave Service] Reject error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject leave request',
    });
  }
};

// Cancel leave request
export const cancelLeaveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findOne({ _id: id, tenantId });

    if (!leaveRequest) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    if (leaveRequest.employeeId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'You can only cancel your own leave requests' });
      return;
    }

    if (!['pending', 'approved'].includes(leaveRequest.status)) {
      res.status(400).json({ success: false, message: 'Cannot cancel this leave request' });
      return;
    }

    const previousStatus = leaveRequest.status;
    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    // Restore balance
    const currentYear = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      tenantId,
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year: currentYear,
    });

    if (balance) {
      if (previousStatus === 'pending') {
        balance.pending -= leaveRequest.days;
      } else if (previousStatus === 'approved') {
        balance.used -= leaveRequest.days;
      }
      await balance.save();
    }

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled',
      data: { leaveRequest },
    });
  } catch (error) {
    console.error('[Leave Service] Cancel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
    });
  }
};

// Get leave balance for employee
export const getLeaveBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const balances = await LeaveBalance.find({
      tenantId,
      employeeId,
      year: Number(year),
    }).populate('leaveTypeId', 'name code isPaid').lean();

    res.status(200).json({
      success: true,
      data: { balances },
    });
  } catch (error) {
    console.error('[Leave Service] Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance',
    });
  }
};

// Initialize leave balance for employee
export const initializeLeaveBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, year = new Date().getFullYear() } = req.body;

    const leaveTypes = await LeaveType.find({ tenantId, isActive: true });

    const balances = [];
    for (const leaveType of leaveTypes) {
      const existing = await LeaveBalance.findOne({
        tenantId,
        employeeId,
        leaveTypeId: leaveType._id,
        year,
      });

      if (!existing) {
        const balance = new LeaveBalance({
          tenantId,
          employeeId,
          leaveTypeId: leaveType._id,
          year,
          entitled: leaveType.defaultDays,
          used: 0,
          pending: 0,
          carriedForward: 0,
          adjusted: 0,
        });
        await balance.save();
        balances.push(balance);
      } else {
        balances.push(existing);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Leave balances initialized',
      data: { balances },
    });
  } catch (error) {
    console.error('[Leave Service] Initialize balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize leave balance',
    });
  }
};
