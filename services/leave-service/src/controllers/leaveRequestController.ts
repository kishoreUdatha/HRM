import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import LeaveRequest from '../models/LeaveRequest';
import LeaveBalance from '../models/LeaveBalance';
import LeaveType from '../models/LeaveType';

// Helper to get employee/user details - checks employees database first, then falls back to auth database
const getEmployeeDetails = async (employeeIds: string[], tenantId: string) => {
  let employeesConn: mongoose.Connection | null = null;
  let authConn: mongoose.Connection | null = null;

  try {
    if (!employeeIds || employeeIds.length === 0) {
      return new Map();
    }

    const mongoUri = process.env.MONGODB_URI || '';
    const employeesDbUri = mongoUri.replace('/hrm_leaves', '/hrm_employee');
    const authDbUri = mongoUri.replace('/hrm_leaves', '/hrm_auth');

    // Convert string IDs to ObjectIds
    const objectIds = employeeIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        return null;
      }
    }).filter((id): id is mongoose.Types.ObjectId => id !== null);

    if (objectIds.length === 0) {
      return new Map();
    }

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
    const employeeMap = new Map();
    const foundIds = new Set<string>();

    // First, try to find in employees database
    employeesConn = mongoose.createConnection(employeesDbUri);
    await employeesConn.asPromise();

    const employeesCollection = employeesConn.collection('employees');
    const departmentsCollection = employeesConn.collection('departments');

    // Search by both _id and userId
    const employees = await employeesCollection.find({
      tenantId: tenantObjectId,
      $or: [
        { _id: { $in: objectIds } },
        { userId: { $in: objectIds } },
      ],
    }).toArray();

    // Get department details
    const deptIds = employees.map(e => e.departmentId).filter(Boolean);
    const departments = deptIds.length > 0
      ? await departmentsCollection.find({ _id: { $in: deptIds } }).toArray()
      : [];
    const deptMap = new Map(departments.map(d => [d._id.toString(), d]));

    // Build map from employee records
    for (const emp of employees) {
      const dept = emp.departmentId ? deptMap.get(emp.departmentId.toString()) : null;
      const employeeData = {
        _id: emp._id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeCode: emp.employeeCode,
        email: emp.email,
        department: dept ? { _id: dept._id, name: dept.name } : null,
      };

      employeeMap.set(emp._id.toString(), employeeData);
      foundIds.add(emp._id.toString());
      if (emp.userId) {
        employeeMap.set(emp.userId.toString(), employeeData);
        foundIds.add(emp.userId.toString());
      }
    }

    // Check which IDs were not found in employees database
    const missingIds = objectIds.filter(id => !foundIds.has(id.toString()));

    // Fallback to auth database for missing IDs (these might be user IDs without employee records)
    if (missingIds.length > 0) {
      authConn = mongoose.createConnection(authDbUri);
      await authConn.asPromise();

      const usersCollection = authConn.collection('users');
      const users = await usersCollection.find({
        tenantId: tenantObjectId,
        _id: { $in: missingIds },
      }).toArray();

      for (const user of users) {
        // Check if we already have this user via employeeId link
        if (user.employeeId && foundIds.has(user.employeeId.toString())) {
          // Link user ID to existing employee data
          const existingData = employeeMap.get(user.employeeId.toString());
          if (existingData) {
            employeeMap.set(user._id.toString(), existingData);
          }
        } else {
          // Create user data as fallback (no employee record exists)
          const userData = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            employeeCode: null,
            email: user.email,
            department: null,
          };
          employeeMap.set(user._id.toString(), userData);
        }
      }
    }

    return employeeMap;
  } catch (error) {
    console.error('[Leave Service] Error fetching employee details:', error);
    return new Map();
  } finally {
    // Always close connections
    if (employeesConn) {
      try { await employeesConn.close(); } catch (e) { /* ignore */ }
    }
    if (authConn) {
      try { await authConn.close(); } catch (e) { /* ignore */ }
    }
  }
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
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

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

    // Text search on reason field
    if (search) {
      query.reason = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Dynamic sorting
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1,
    };

    const [requests, total] = await Promise.all([
      LeaveRequest.find(query)
        .populate('leaveTypeId', 'name code')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      LeaveRequest.countDocuments(query),
    ]);

    // Fetch employee details
    const employeeIds = requests.map(r => r.employeeId.toString());
    const employeeMap = await getEmployeeDetails(employeeIds, tenantId);

    // Attach employee details to requests
    const requestsWithEmployees = requests.map(request => {
      const empId = request.employeeId.toString();
      const employee = employeeMap.get(empId);
      return {
        ...request,
        employee: employee || null,
      };
    });

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
    const { year = new Date().getFullYear() } = req.body;

    // Fetch all employees from employees database
    const mongoUri = process.env.MONGODB_URI || '';
    const employeesDbUri = mongoUri.replace('/hrm_leaves', '/hrm_employee');
    const employeesConn = await mongoose.createConnection(employeesDbUri).asPromise();

    const employeeSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      status: String,
    });

    const Employee = employeesConn.model('Employee', employeeSchema);
    const employees = await Employee.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: 'active',
    }).select('_id').lean();

    await employeesConn.close();

    const leaveTypes = await LeaveType.find({ tenantId, isActive: true });

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
      message: `Initialized ${created} leave balances for ${employees.length} employees (${skipped} already existed)`,
      data: { created, skipped, employeeCount: employees.length },
    });
  } catch (error) {
    console.error('[Leave Service] Bulk initialize error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk initialize leave balances',
    });
  }
};
