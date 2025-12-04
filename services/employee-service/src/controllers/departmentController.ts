import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Department from '../models/Department';
import Employee from '../models/Employee';

// Get all departments
export const getAllDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const departments = await Department.find({ tenantId })
      .populate('managerId', 'firstName lastName email')
      .populate('parentDepartmentId', 'name code')
      .sort({ name: 1 });

    // Get employee count for each department
    const departmentIds = departments.map((d) => d._id);
    const employeeCounts = await Employee.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          departmentId: { $in: departmentIds },
        },
      },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(employeeCounts.map((e) => [e._id.toString(), e.count]));

    const departmentsWithCount = departments.map((dept) => ({
      ...dept.toObject(),
      employeeCount: countMap.get(dept._id.toString()) || 0,
    }));

    res.json({
      success: true,
      data: departmentsWithCount,
    });
  } catch (error) {
    next(error);
  }
};

// Get department by ID
export const getDepartmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const department = await Department.findOne({ _id: id, tenantId })
      .populate('managerId', 'firstName lastName email')
      .populate('parentDepartmentId', 'name code');

    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }

    // Get employee count
    const employeeCount = await Employee.countDocuments({
      tenantId,
      departmentId: id,
    });

    res.json({
      success: true,
      data: {
        ...department.toObject(),
        employeeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create department
export const createDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { name, code, description, managerId, parentDepartmentId } = req.body;

    // Check if department name or code already exists
    const existing = await Department.findOne({
      tenantId,
      $or: [{ name }, { code }],
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: existing.name === name ? 'Department name already exists' : 'Department code already exists',
      });
      return;
    }

    const department = await Department.create({
      tenantId,
      name,
      code: code.toUpperCase(),
      description,
      managerId,
      parentDepartmentId,
    });

    res.status(201).json({
      success: true,
      data: department,
      message: 'Department created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update department
export const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const updateData = req.body;

    // Check uniqueness if name or code being updated
    if (updateData.name || updateData.code) {
      const existing = await Department.findOne({
        tenantId,
        _id: { $ne: id },
        $or: [
          ...(updateData.name ? [{ name: updateData.name }] : []),
          ...(updateData.code ? [{ code: updateData.code }] : []),
        ],
      });

      if (existing) {
        res.status(400).json({
          success: false,
          message: 'Department name or code already exists',
        });
        return;
      }
    }

    const department = await Department.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }

    res.json({
      success: true,
      data: department,
      message: 'Department updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete department
export const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    // Check if department has employees
    const employeeCount = await Employee.countDocuments({
      tenantId,
      departmentId: id,
    });

    if (employeeCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete department with ${employeeCount} employee(s). Please reassign employees first.`,
      });
      return;
    }

    const department = await Department.findOneAndDelete({ _id: id, tenantId });

    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};
