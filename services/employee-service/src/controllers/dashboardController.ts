import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Employee from '../models/Employee';

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalEmployees,
      activeEmployees,
      newHires,
      departmentDistribution,
      upcomingBirthdays,
      recentHires,
    ] = await Promise.all([
      Employee.countDocuments({ tenantId }),
      Employee.countDocuments({ tenantId, status: 'active' }),
      Employee.countDocuments({
        tenantId,
        joiningDate: { $gte: startOfMonth },
      }),
      Employee.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'active' } },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'dept',
          },
        },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            department: { $ifNull: ['$dept.name', 'Unassigned'] },
            count: 1,
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ]),
      Employee.find({
        tenantId,
        status: 'active',
        $expr: {
          $and: [
            { $eq: [{ $month: '$dateOfBirth' }, today.getMonth() + 1] },
            { $gte: [{ $dayOfMonth: '$dateOfBirth' }, today.getDate()] },
          ],
        },
      })
        .select('firstName lastName dateOfBirth avatar departmentId')
        .populate('departmentId', 'name')
        .limit(5),
      Employee.find({ tenantId })
        .sort({ joiningDate: -1 })
        .select('firstName lastName joiningDate avatar departmentId designation')
        .populate('departmentId', 'name')
        .limit(5),
    ]);

    // Mock attendance data (will be replaced when attendance service is integrated)
    const presentToday = Math.floor(activeEmployees * 0.85);
    const absentToday = activeEmployees - presentToday;
    const pendingLeaves = Math.floor(Math.random() * 10) + 1;

    // Mock attendance trend
    const attendanceTrend = [
      { date: 'Mon', present: Math.floor(activeEmployees * 0.9), absent: Math.floor(activeEmployees * 0.1) },
      { date: 'Tue', present: Math.floor(activeEmployees * 0.88), absent: Math.floor(activeEmployees * 0.12) },
      { date: 'Wed', present: Math.floor(activeEmployees * 0.92), absent: Math.floor(activeEmployees * 0.08) },
      { date: 'Thu', present: Math.floor(activeEmployees * 0.87), absent: Math.floor(activeEmployees * 0.13) },
      { date: 'Fri', present: presentToday, absent: absentToday },
    ];

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        newHires,
        pendingLeaves,
        presentToday,
        absentToday,
        upcomingBirthdays,
        departmentDistribution,
        attendanceTrend,
        recentHires,
      },
    });
  } catch (error) {
    next(error);
  }
};
