import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import LeaveRequest from '../models/LeaveRequest';
import LeaveBalance from '../models/LeaveBalance';
import LeaveType from '../models/LeaveType';

// Helper to get employee/user details from employee database
const getEmployeeDetails = async (employeeIds: string[], tenantId: string) => {
  const employeeMap = new Map();

  if (!employeeIds || employeeIds.length === 0) {
    return employeeMap;
  }

  try {
    // Connect to employees database
    const mongoUri = process.env.MONGODB_URI || '';
    // For Cosmos DB, we need to specify the database name explicitly
    const employeesConn = await mongoose.createConnection(mongoUri, {
      dbName: 'hrm_employees',
    }).asPromise();

    const employeeSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      firstName: String,
      lastName: String,
      employeeCode: String,
      email: String,
      department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    });

    const Employee = employeesConn.model('Employee', employeeSchema);

    // Convert string IDs to ObjectIds for query
    const objectIds = employeeIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    }).filter(id => id !== null);

    console.log(`[Leave Service] Looking up employees with IDs: ${objectIds.map(id => id?.toString()).join(', ')}`);
    console.log(`[Leave Service] TenantId for query: ${tenantId}`);

    // First try with tenantId filter
    let employees = await Employee.find({
      _id: { $in: objectIds },
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).select('_id firstName lastName employeeCode email tenantId').lean();

    // If no results, try without tenantId filter (in case of mismatch)
    if (employees.length === 0 && objectIds.length > 0) {
      console.log(`[Leave Service] No employees found with tenantId filter, trying without...`);
      employees = await Employee.find({
        _id: { $in: objectIds },
      }).select('_id firstName lastName employeeCode email tenantId').lean();

      if (employees.length > 0) {
        console.log(`[Leave Service] Found ${employees.length} employees without tenantId filter. Employee tenantIds: ${employees.map(e => e.tenantId?.toString()).join(', ')}`);
      }
    }

    await employeesConn.close();

    // Build map
    for (const emp of employees) {
      employeeMap.set(emp._id.toString(), {
        _id: emp._id.toString(),
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        employeeCode: emp.employeeCode || '',
        email: emp.email || '',
      });
    }

    console.log(`[Leave Service] Fetched ${employees.length} employees for ${employeeIds.length} IDs`);
  } catch (error) {
    console.error('[Leave Service] Error fetching employee details:', error);
    // Return empty map on error - will show "Unknown" in frontend
  }

  return employeeMap;
};

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
    const {
      employeeId,
      status,
      leaveTypeId,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Build simple query for Cosmos DB compatibility
    const query: Record<string, unknown> = { tenantId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (leaveTypeId) query.leaveTypeId = leaveTypeId;

    if (startDate) {
      query.startDate = { $gte: new Date(startDate as string) };
    }
    if (endDate) {
      query.endDate = { $lte: new Date(endDate as string) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Fetch requests without complex sort or populate (Cosmos DB compatibility)
    console.log('[Leave Service] Fetching leave requests with query:', JSON.stringify(query));

    const requests = await LeaveRequest.find(query)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    console.log('[Leave Service] Found', requests.length, 'requests');

    const total = await LeaveRequest.countDocuments(query);
    console.log('[Leave Service] Total count:', total);

    // Try to fetch employee details, but don't fail if it doesn't work
    let requestsWithEmployees = requests.map(request => ({
      ...request,
      employee: null,
    }));

    try {
      const employeeIds = requests.map(r => r.employeeId.toString());
      if (employeeIds.length > 0) {
        const employeeMap = await getEmployeeDetails(employeeIds, tenantId);
        requestsWithEmployees = requests.map(request => {
          const empId = request.employeeId.toString();
          const employee = employeeMap.get(empId);
          return {
            ...request,
            employee: employee || null,
          };
        });
      }
    } catch (empError) {
      console.error('[Leave Service] Error fetching employee details (continuing without):', empError);
    }

    res.status(200).json({
      success: true,
      data: {
        leaves: requestsWithEmployees,
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

    // Get leave type to check if negative balance is allowed
    const leaveType = await LeaveType.findOne({ _id: leaveRequest.leaveTypeId, tenantId });
    if (!leaveType) {
      res.status(404).json({ success: false, message: 'Leave type not found' });
      return;
    }

    // Check or create leave balance before approving
    const currentYear = new Date().getFullYear();
    let balance = await LeaveBalance.findOne({
      tenantId,
      employeeId: leaveRequest.employeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year: currentYear,
    });

    // Create balance if it doesn't exist (initialize with default days from leave type)
    if (!balance) {
      balance = new LeaveBalance({
        tenantId,
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
        year: currentYear,
        entitled: leaveType.defaultDays || 0,
        used: 0,
        pending: leaveRequest.days, // Include pending from this request
        carriedForward: 0,
        adjusted: 0,
      });
      await balance.save();
    }

    // Check if balance is sufficient (only if negative balance not allowed)
    if (!leaveType.allowNegativeBalance) {
      const availableBalance = balance.balance - balance.pending + leaveRequest.days;
      if (availableBalance < leaveRequest.days) {
        res.status(400).json({
          success: false,
          message: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${leaveRequest.days} days for ${leaveType.name}`,
        });
        return;
      }
    }

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = userId as unknown as typeof leaveRequest.approvedBy;
    leaveRequest.approvedAt = new Date();
    await leaveRequest.save();

    // Update leave balance
    balance.pending = Math.max(0, balance.pending - leaveRequest.days);
    balance.used += leaveRequest.days;
    await balance.save();

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
      data: balances,
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

// Get all employees' leave balances (admin view)
export const getAllLeaveBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { year = new Date().getFullYear(), leaveTypeId, page = 1, limit = 50 } = req.query;

    const query: Record<string, unknown> = { tenantId, year: Number(year) };
    if (leaveTypeId) query.leaveTypeId = leaveTypeId;

    const skip = (Number(page) - 1) * Number(limit);

    const [balances, total] = await Promise.all([
      LeaveBalance.find(query)
        .populate('leaveTypeId', 'name code isPaid')
        .sort({ employeeId: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      LeaveBalance.countDocuments(query),
    ]);

    // Fetch employee details
    const employeeIds = [...new Set(balances.map(b => b.employeeId.toString()))];
    const employeeMap = await getEmployeeDetails(employeeIds, tenantId);

    // Attach employee details
    const balancesWithEmployees = balances.map(balance => ({
      ...balance,
      employee: employeeMap.get(balance.employeeId.toString()) || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        balances: balancesWithEmployees,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Leave Service] Get all balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balances',
    });
  }
};

// Adjust leave balance
export const adjustLeaveBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, leaveTypeId, year = new Date().getFullYear(), adjustment, reason } = req.body;

    let balance = await LeaveBalance.findOne({
      tenantId,
      employeeId,
      leaveTypeId,
      year,
    });

    if (!balance) {
      // Create balance if it doesn't exist
      const leaveType = await LeaveType.findOne({ _id: leaveTypeId, tenantId });
      if (!leaveType) {
        res.status(404).json({ success: false, message: 'Leave type not found' });
        return;
      }

      balance = new LeaveBalance({
        tenantId,
        employeeId,
        leaveTypeId,
        year,
        entitled: leaveType.defaultDays,
        used: 0,
        pending: 0,
        carriedForward: 0,
        adjusted: adjustment,
      });
    } else {
      balance.adjusted += adjustment;
    }

    await balance.save();

    res.status(200).json({
      success: true,
      message: `Leave balance adjusted by ${adjustment} days`,
      data: { balance },
    });
  } catch (error) {
    console.error('[Leave Service] Adjust balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust leave balance',
    });
  }
};

// Update leave balance entitled days
export const updateLeaveBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { entitled, carriedForward, adjusted } = req.body;

    const balance = await LeaveBalance.findOne({ _id: id, tenantId });

    if (!balance) {
      res.status(404).json({ success: false, message: 'Leave balance not found' });
      return;
    }

    if (entitled !== undefined) balance.entitled = entitled;
    if (carriedForward !== undefined) balance.carriedForward = carriedForward;
    if (adjusted !== undefined) balance.adjusted = adjusted;

    await balance.save();

    res.status(200).json({
      success: true,
      message: 'Leave balance updated',
      data: { balance },
    });
  } catch (error) {
    console.error('[Leave Service] Update balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave balance',
    });
  }
};

// Bulk initialize balances for all employees
export const bulkInitializeBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { year = new Date().getFullYear(), force = false } = req.body;

    // Fetch all employees from employees database
    const mongoUri = process.env.MONGODB_URI || '';
    // For Cosmos DB, we need to specify the database name explicitly
    const employeesConn = await mongoose.createConnection(mongoUri, {
      dbName: 'hrm_employees',
    }).asPromise();
    console.log(`[Leave Service] Connected to hrm_employees database`);

    const employeeSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      status: String,
      firstName: String,
      lastName: String,
    });

    const Employee = employeesConn.model('Employee', employeeSchema);

    // Debug: count ALL employees in database (no filter)
    const allInDb = await Employee.find({}).select('_id tenantId status').limit(10).lean();
    console.log(`[Leave Service] Sample employees in DB: ${allInDb.length}, tenantIds: ${allInDb.map(e => e.tenantId?.toString()).join(', ')}`);

    // Debug: count all employees for this tenant
    const allEmployees = await Employee.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).select('_id firstName lastName status').lean();
    console.log(`[Leave Service] Total employees for tenant ${tenantId}: ${allEmployees.length}`);
    if (allEmployees.length > 0) {
      console.log(`[Leave Service] Sample employee statuses: ${allEmployees.slice(0, 5).map(e => e.status).join(', ')}`);
    }

    const employees = await Employee.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: 'active',
    }).select('_id firstName lastName').lean();

    console.log(`[Leave Service] Found ${employees.length} active employees for tenant ${tenantId}`);
    console.log(`[Leave Service] Employee IDs: ${employees.map(e => e._id.toString()).join(', ')}`);

    await employeesConn.close();

    const leaveTypes = await LeaveType.find({ tenantId, isActive: true });
    const validEmployeeIds = employees.map(e => e._id.toString());

    // If force=true, delete orphaned balances (those with employeeIds that don't exist)
    let deleted = 0;
    if (force) {
      // Get all existing balances for this tenant/year
      const existingBalances = await LeaveBalance.find({ tenantId, year: Number(year) });

      // Find and delete orphaned ones
      for (const balance of existingBalances) {
        if (!validEmployeeIds.includes(balance.employeeId.toString())) {
          await LeaveBalance.deleteOne({ _id: balance._id });
          deleted++;
        }
      }

      console.log(`[Leave Service] Deleted ${deleted} orphaned leave balances`);
    }

    let created = 0;
    let skipped = 0;

    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        const existing = await LeaveBalance.findOne({
          tenantId,
          employeeId: employee._id,
          leaveTypeId: leaveType._id,
          year,
        });

        if (!existing) {
          const balance = new LeaveBalance({
            tenantId,
            employeeId: employee._id,
            leaveTypeId: leaveType._id,
            year,
            entitled: leaveType.defaultDays,
            used: 0,
            pending: 0,
            carriedForward: 0,
            adjusted: 0,
          });
          await balance.save();
          created++;
        } else {
          skipped++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Initialized ${created} leave balances for ${employees.length} employees (${skipped} already existed${deleted > 0 ? `, ${deleted} orphaned deleted` : ''})`,
      data: { created, skipped, deleted, employeeCount: employees.length },
    });
  } catch (error) {
    console.error('[Leave Service] Bulk initialize error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk initialize leave balances',
    });
  }
};
