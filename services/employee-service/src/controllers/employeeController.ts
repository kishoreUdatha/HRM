import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Employee from '../models/Employee';
import { peekNextSequence } from '../models/Counter';

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

    const sort: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1,
    };

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('departmentId', 'name code')
        .populate('reportingManagerId', 'firstName lastName email'),
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

// Get employee by ID
export const getEmployeeById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const employee = await Employee.findOne({
      _id: id,
      tenantId,
    })
      .populate('departmentId', 'name code')
      .populate('reportingManagerId', 'firstName lastName email');

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

    const employee = await Employee.create(employeeData);

    // TODO: Publish EMPLOYEE_CREATED event to message queue

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
    const updateData = req.body;

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
