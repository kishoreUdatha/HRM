import { Request, Response, NextFunction } from 'express';
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
      recentHires,
    ] = await Promise.all([
      Employee.countDocuments({ tenantId }),
      Employee.countDocuments({ tenantId, status: 'active' }),
      Employee.countDocuments({
        tenantId,
        joiningDate: { $gte: startOfMonth },
      }),
      Employee.find({ tenantId })
        .sort({ joiningDate: -1 })
        .select('firstName lastName joiningDate avatar designation')
        .limit(5)
        .lean(),
    ]);

    // Simplified department distribution (Cosmos DB doesn't support $lookup well)
    const departmentDistribution: { department: string; count: number }[] = [];

    // Simplified upcoming birthdays (Cosmos DB doesn't support $expr with date functions)
    const upcomingBirthdays: unknown[] = [];

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
