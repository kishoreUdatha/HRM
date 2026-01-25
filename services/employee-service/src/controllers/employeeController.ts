import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Employee from '../models/Employee';
import { peekNextSequence } from '../models/Counter';
import { publishEvent } from '../config/rabbitmq';
import { validateEmployeeLimit } from '../utils/planLimitValidator';

// Get all employees for tenant
export const getAllEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const {
      page = 1,
      limit = 10,
      search,
      departmentId,
      status,
      employmentType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }

    if (departmentId) filter.departmentId = new mongoose.Types.ObjectId(departmentId as string);
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('departmentId', 'name code')
        .populate('shiftId', 'name startTime endTime')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Employee.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get employee by ID (also supports lookup by userId)
export const getEmployeeById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    // First try to find by employee _id
    let employee = await Employee.findOne({
      _id: id,
      tenantId,
    })
      .populate('departmentId', 'name code')
      .populate('reportingManagerId', 'firstName lastName email');

    // If not found, try to find by userId (for mobile app compatibility)
    if (!employee) {
      employee = await Employee.findOne({
        userId: id,
        tenantId,
      })
        .populate('departmentId', 'name code')
        .populate('reportingManagerId', 'firstName lastName email');
    }

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// Create employee
export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    // Validate plan limits before creating employee
    try {
      await validateEmployeeLimit(tenantId);
    } catch (limitError) {
      res.status(403).json({
        success: false,
        message: limitError instanceof Error ? limitError.message : 'Employee limit exceeded',
        code: 'PLAN_LIMIT_EXCEEDED',
      });
      return;
    }

    const employeeData = { ...req.body, tenantId };

    // Check if email already exists for this tenant
    const existingEmployee = await Employee.findOne({
      tenantId,
      email: employeeData.email,
    });

    if (existingEmployee) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }

    const newEmployee = new Employee(employeeData);
    const employee = await newEmployee.save();

    // Publish EMPLOYEE_CREATED event to message queue
    await publishEvent('employee.created', {
      eventType: 'EMPLOYEE_CREATED',
      tenantId,
      employeeId: employee._id.toString(),
      employeeCode: employee.employeeCode,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      departmentId: employee.departmentId?.toString(),
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update employee
export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const updateData = { ...req.body };

    // Sanitize ObjectId fields - convert empty strings to null
    const objectIdFields = ['shiftId', 'reportingManagerId', 'userId', 'departmentId'];
    for (const field of objectIdFields) {
      if (updateData[field] === '' || updateData[field] === null) {
        if (field === 'departmentId') {
          // departmentId is required, don't set to null
          delete updateData[field];
        } else {
          updateData[field] = null;
        }
      }
    }

    // Check email uniqueness if being updated
    if (updateData.email) {
      const existingEmployee = await Employee.findOne({
        tenantId,
        email: updateData.email,
        _id: { $ne: id },
      });

      if (existingEmployee) {
        res.status(400).json({ success: false, message: 'Email already exists' });
        return;
      }
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json({
      success: true,
      data: employee,
      message: 'Employee updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete employee
export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const employee = await Employee.findOneAndDelete({ _id: id, tenantId });

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get employee statistics
export const getEmployeeStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const [
      totalEmployees,
      activeEmployees,
      departmentStats,
      employmentTypeStats,
      newHiresThisMonth,
      genderDistribution,
    ] = await Promise.all([
      Employee.countDocuments({ tenantId }),
      Employee.countDocuments({ tenantId, status: 'active' }),
      Employee.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'department',
          },
        },
        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            department: { $ifNull: ['$department.name', 'Unknown'] },
            count: 1,
            _id: 0,
          },
        },
      ]),
      Employee.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$employmentType', count: { $sum: 1 } } },
        { $project: { type: '$_id', count: 1, _id: 0 } },
      ]),
      Employee.countDocuments({
        tenantId,
        joiningDate: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      Employee.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
        { $project: { gender: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        newHiresThisMonth,
        departmentDistribution: departmentStats,
        employmentTypeDistribution: employmentTypeStats,
        genderDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get next employee code preview
export const getNextEmployeeCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const nextSeq = await peekNextSequence(tenantId, 'employee');
    const nextCode = `EMP${String(nextSeq).padStart(5, '0')}`;

    res.json({
      success: true,
      data: {
        nextEmployeeCode: nextCode,
        nextSequence: nextSeq,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify mobile credentials for employee login
// This is called by auth-service to verify employee can login via mobile app
export const verifyMobileCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('[Employee Service] verifyMobileCredentials called with:', req.body);
    const { tenantId, phone, pin } = req.body;

    if (!tenantId || !phone || !pin) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID, phone, and PIN are required',
      });
      return;
    }

    // Find employee by phone and tenant
    // Support flexible phone matching - user may enter just digits (e.g. 9876543210)
    // while DB may store with country code (e.g. +91-9876543210 or +919876543210)
    const phoneDigits = phone.replace(/\D/g, ''); // Extract only digits
    console.log(`[Employee Service] Looking for employee with tenantId: ${tenantId}, phone: ${phone}, phoneDigits: ${phoneDigits}`);

    const employee = await Employee.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      $or: [
        { phone: phone }, // Exact match
        { phone: { $regex: phoneDigits + '$' } }, // Ends with the digits
        { phone: { $regex: phone.replace(/[-\s]/g, '') } }, // Match without hyphens/spaces
      ],
      status: 'active',
    }).populate('departmentId', 'name code');

    console.log(`[Employee Service] Employee found: ${employee ? employee.firstName + ' ' + employee.lastName : 'NOT FOUND'}`);
    if (employee) {
      console.log(`[Employee Service] Employee phone: ${employee.phone}, selfyPunch: ${employee.selfyPunch}, status: ${employee.status}`);
    }

    if (!employee) {
      // Try to find without status filter to debug
      const anyEmployee = await Employee.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        $or: [
          { phone: phone },
          { phone: { $regex: phoneDigits + '$' } },
        ],
      });
      console.log(`[Employee Service] Employee without status filter: ${anyEmployee ? `Found with status=${anyEmployee.status}` : 'NOT FOUND'}`);

      res.status(401).json({
        success: false,
        message: 'Invalid mobile number or PIN',
      });
      return;
    }

    // Check if selfyPunch is enabled for this employee
    if (!employee.selfyPunch) {
      res.status(403).json({
        success: false,
        message: 'Mobile app login is not enabled for this employee. Please contact your administrator.',
      });
      return;
    }

    // Verify PIN (default is 1122 if not set)
    const employeePin = employee.pin || '1122';
    if (employeePin !== pin) {
      res.status(401).json({
        success: false,
        message: 'Invalid mobile number or PIN',
      });
      return;
    }

    // Return employee data for auth-service to create tokens
    res.json({
      success: true,
      data: {
        employeeId: employee._id.toString(),
        tenantId: employee.tenantId.toString(),
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        phone: employee.phone,
        designation: employee.designation,
        department: employee.departmentId,
        avatar: employee.avatar,
        employeeCode: employee.employeeCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle selfyPunch for an employee (for admin/HR to enable/disable mobile app login)
export const toggleSelfyPunch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { selfyPunch } = req.body;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    if (typeof selfyPunch !== 'boolean') {
      res.status(400).json({ success: false, message: 'selfyPunch must be a boolean value' });
      return;
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, tenantId: new mongoose.Types.ObjectId(tenantId) },
      { $set: { selfyPunch } },
      { new: true }
    ).populate('departmentId', 'name code');

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json({
      success: true,
      data: employee,
      message: `Mobile app login ${selfyPunch ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// Reset employee PIN to default (1122)
export const resetPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID required' });
      return;
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, tenantId: new mongoose.Types.ObjectId(tenantId) },
      { $set: { pin: '1122' } },
      { new: true }
    ).populate('departmentId', 'name code');

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.json({
      success: true,
      data: employee,
      message: 'PIN reset to default (1122) successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update own profile (for mobile app)
export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { phone, address, emergencyContact } = req.body;

    if (!tenantId || !userId) {
      res.status(400).json({ success: false, message: 'Tenant ID and User ID required' });
      return;
    }

    // Find employee by userId
    const employee = await Employee.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!employee) {
      // Try finding by _id as userId
      const employeeById = await Employee.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        _id: new mongoose.Types.ObjectId(userId),
      });

      if (!employeeById) {
        res.status(404).json({ success: false, message: 'Employee profile not found' });
        return;
      }

      // Update and return
      const updateData: Record<string, unknown> = {};
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;

      const updatedEmployee = await Employee.findByIdAndUpdate(
        employeeById._id,
        { $set: updateData },
        { new: true }
      ).populate('departmentId', 'name code');

      res.json({
        success: true,
        data: { employee: updatedEmployee },
        message: 'Profile updated successfully',
      });
      return;
    }

    // Update allowed fields only
    const updateData: Record<string, unknown> = {};
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employee._id,
      { $set: updateData },
      { new: true }
    ).populate('departmentId', 'name code');

    res.json({
      success: true,
      data: { employee: updatedEmployee },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
