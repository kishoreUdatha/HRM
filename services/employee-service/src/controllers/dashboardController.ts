import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Employee from '../models/Employee';
import Department from '../models/Department';

// IST timezone offset: UTC+5:30
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

// Get current time in IST
const getISTDate = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (IST_OFFSET_HOURS * 3600000) + (IST_OFFSET_MINUTES * 60000));
};

// Get start of day in IST (returns UTC time that corresponds to IST midnight)
const getISTStartOfDay = (date?: Date): Date => {
  const d = date ? new Date(date) : getISTDate();
  d.setHours(0, 0, 0, 0);
  const utcTime = d.getTime() - (IST_OFFSET_HOURS * 3600000) - (IST_OFFSET_MINUTES * 60000);
  return new Date(utcTime);
};

// Helper function to construct database URI for cross-database queries
const constructDbUri = (baseUri: string, dbName: string): string => {
  if (baseUri.includes('/hrm_employees')) {
    return baseUri.replace('/hrm_employees', `/${dbName}`);
  }
  const url = new URL(baseUri);
  url.pathname = `/${dbName}`;
  return url.toString();
};

// Get today's attendance data from attendance service database
const getTodayAttendanceData = async (tenantId: string): Promise<{
  presentToday: number;
  absentToday: number;
  lateToday: number;
}> => {
  try {
    const mongoUri = process.env.MONGODB_URI || '';
    const attendanceDbUri = constructDbUri(mongoUri, 'hrm_attendance');
    const attendanceConn = await mongoose.createConnection(attendanceDbUri).asPromise();

    const attendanceSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      employeeId: mongoose.Schema.Types.ObjectId,
      date: Date,
      status: String,
      checkIn: Date,
      checkOut: Date,
    });

    const Attendance = attendanceConn.model('Attendance', attendanceSchema);

    const today = getISTStartOfDay();

    // Get today's attendance records
    const todayRecords = await Attendance.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      date: today,
    }).lean();

    await attendanceConn.close();

    // Count by status
    let presentToday = 0;
    let lateToday = 0;

    for (const record of todayRecords) {
      if (record.status === 'present') {
        presentToday++;
      } else if (record.status === 'late') {
        lateToday++;
        presentToday++; // Late is still present
      } else if (record.status === 'half_day') {
        presentToday++;
      }
    }

    // Get total active employees to calculate absent
    const activeEmployees = await Employee.countDocuments({ tenantId, status: 'active' });
    const absentToday = Math.max(0, activeEmployees - presentToday);

    return { presentToday, absentToday, lateToday };
  } catch (error) {
    console.error('[Dashboard] Error fetching attendance data:', error);
    return { presentToday: 0, absentToday: 0, lateToday: 0 };
  }
};

// Get pending leaves from leave service database
const getPendingLeavesCount = async (tenantId: string): Promise<number> => {
  try {
    const mongoUri = process.env.MONGODB_URI || '';
    const leaveDbUri = constructDbUri(mongoUri, 'hrm_leaves');
    const leaveConn = await mongoose.createConnection(leaveDbUri).asPromise();

    const leaveRequestSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      status: String,
    });

    const LeaveRequest = leaveConn.model('LeaveRequest', leaveRequestSchema);

    const pendingCount = await LeaveRequest.countDocuments({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: 'pending',
    });

    await leaveConn.close();
    return pendingCount;
  } catch (error) {
    console.error('[Dashboard] Error fetching pending leaves:', error);
    return 0;
  }
};

// Get attendance trend for the last 7 days
const getAttendanceTrend = async (tenantId: string): Promise<{
  date: string;
  present: number;
  absent: number;
}[]> => {
  try {
    const mongoUri = process.env.MONGODB_URI || '';
    const attendanceDbUri = constructDbUri(mongoUri, 'hrm_attendance');
    const attendanceConn = await mongoose.createConnection(attendanceDbUri).asPromise();

    const attendanceSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      employeeId: mongoose.Schema.Types.ObjectId,
      date: Date,
      status: String,
    });

    const Attendance = attendanceConn.model('Attendance', attendanceSchema);

    const today = getISTDate();
    const trend: { date: string; present: number; absent: number }[] = [];

    // Get total active employees
    const activeEmployees = await Employee.countDocuments({ tenantId, status: 'active' });

    // Get last 7 days (Monday to Sunday of current week, or last 7 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = getISTStartOfDay(date);

      const dayRecords = await Attendance.find({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        date: startOfDay,
      }).lean();

      // Count present (including late and half_day)
      let present = 0;
      for (const record of dayRecords) {
        if (record.status === 'present' || record.status === 'late' || record.status === 'half_day') {
          present++;
        }
      }

      const absent = Math.max(0, activeEmployees - present);
      trend.push({
        date: dayNames[date.getDay()],
        present,
        absent,
      });
    }

    await attendanceConn.close();
    return trend;
  } catch (error) {
    console.error('[Dashboard] Error fetching attendance trend:', error);
    return [];
  }
};

// Get department distribution with employee counts
const getDepartmentDistribution = async (tenantId: string): Promise<{
  department: string;
  count: number;
}[]> => {
  try {
    // Get all departments for this tenant
    const departments = await Department.find({ tenantId, status: 'active' }).lean();

    const distribution: { department: string; count: number }[] = [];

    for (const dept of departments) {
      const count = await Employee.countDocuments({
        tenantId,
        departmentId: dept._id,
        status: 'active',
      });

      if (count > 0) {
        distribution.push({
          department: dept.name,
          count,
        });
      }
    }

    // Sort by count descending
    distribution.sort((a, b) => b.count - a.count);

    return distribution;
  } catch (error) {
    console.error('[Dashboard] Error fetching department distribution:', error);
    return [];
  }
};

// Get upcoming birthdays (within next 30 days)
const getUpcomingBirthdays = async (tenantId: string): Promise<any[]> => {
  try {
    const employees = await Employee.find({
      tenantId,
      status: 'active',
      dateOfBirth: { $exists: true, $ne: null },
    })
      .select('firstName lastName dateOfBirth avatar designation')
      .lean();

    const today = getISTDate();
    const upcoming: any[] = [];

    for (const emp of employees) {
      if (!emp.dateOfBirth) continue;

      const dob = new Date(emp.dateOfBirth);
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

      // Check if birthday is within next 30 days
      const diffDays = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 30) {
        upcoming.push({
          ...emp,
          daysUntilBirthday: diffDays,
        });
      } else if (diffDays < 0) {
        // Check next year's birthday
        const nextYearBirthday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
        const nextDiffDays = Math.ceil((nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (nextDiffDays <= 30) {
          upcoming.push({
            ...emp,
            daysUntilBirthday: nextDiffDays,
          });
        }
      }
    }

    // Sort by days until birthday
    upcoming.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    return upcoming.slice(0, 5); // Return top 5
  } catch (error) {
    console.error('[Dashboard] Error fetching upcoming birthdays:', error);
    return [];
  }
};

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Fetch basic employee stats from employees database
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

    // Fetch real data from other databases in parallel
    const [
      attendanceData,
      pendingLeaves,
      attendanceTrend,
      departmentDistribution,
      upcomingBirthdays,
    ] = await Promise.all([
      getTodayAttendanceData(tenantId),
      getPendingLeavesCount(tenantId),
      getAttendanceTrend(tenantId),
      getDepartmentDistribution(tenantId),
      getUpcomingBirthdays(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        newHires,
        pendingLeaves,
        presentToday: attendanceData.presentToday,
        absentToday: attendanceData.absentToday,
        lateToday: attendanceData.lateToday,
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
