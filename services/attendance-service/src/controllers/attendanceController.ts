import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Attendance from '../models/Attendance';
import Shift from '../models/Shift';
import { faceRecognitionService, FaceEmbeddingData } from '../services/faceRecognitionService';
import { isWithinGeofence, formatDistance } from '../utils/geofencing';

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
  // Set to midnight IST
  d.setHours(0, 0, 0, 0);
  // Convert back to UTC for storage
  const utcTime = d.getTime() - (IST_OFFSET_HOURS * 3600000) - (IST_OFFSET_MINUTES * 60000);
  return new Date(utcTime);
};

// Parse date string as IST date and get UTC equivalent for start of day
const parseISTDateString = (dateStr: string): Date => {
  // Parse date as YYYY-MM-DD in IST timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at midnight IST
  const istMidnight = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Convert to UTC
  const utcTime = istMidnight.getTime() - (IST_OFFSET_HOURS * 3600000) - (IST_OFFSET_MINUTES * 60000);
  return new Date(utcTime);
};

// Get end of day in IST (23:59:59.999 IST)
const getISTEndOfDay = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at 23:59:59.999 IST
  const istEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
  // Convert to UTC
  const utcTime = istEnd.getTime() - (IST_OFFSET_HOURS * 3600000) - (IST_OFFSET_MINUTES * 60000);
  return new Date(utcTime);
};

// Cache for face embeddings to avoid frequent DB queries
let faceEmbeddingsCache: { tenantId: string; embeddings: FaceEmbeddingData[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to construct database URI for cross-database queries (Cosmos DB compatible)
const constructDbUriFaceEmbed = (baseUri: string, dbName: string): string => {
  // If URI already has the database name, replace it
  if (baseUri.includes('/hrm_attendance')) {
    return baseUri.replace('/hrm_attendance', `/${dbName}`);
  }
  // For Cosmos DB style URIs without database in path, append database name before query params
  if (baseUri.includes('?')) {
    const [base, query] = baseUri.split('?');
    return `${base.replace(/\/$/, '')}/${dbName}?${query}`;
  }
  return `${baseUri.replace(/\/$/, '')}/${dbName}`;
};

// Helper to get face embeddings from employees database
const getFaceEmbeddings = async (tenantId: string): Promise<FaceEmbeddingData[]> => {
  // Check cache first
  if (faceEmbeddingsCache &&
      faceEmbeddingsCache.tenantId === tenantId &&
      Date.now() - faceEmbeddingsCache.timestamp < CACHE_TTL) {
    return faceEmbeddingsCache.embeddings;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || '';
    console.log('[Attendance Service] getFaceEmbeddings - Original URI has db in path:', mongoUri.includes('/hrm_attendance'));
    const employeesDbUri = constructDbUriFaceEmbed(mongoUri, 'hrm_employees');
    console.log('[Attendance Service] getFaceEmbeddings - Constructed employees DB URI');
    const employeesConn = await mongoose.createConnection(employeesDbUri).asPromise();

    const faceEmbeddingSchema = new mongoose.Schema({
      tenantId: mongoose.Schema.Types.ObjectId,
      employeeId: mongoose.Schema.Types.ObjectId,
      employeeName: String,
      averageEmbedding: [Number],
      isActive: Boolean,
    });

    const FaceEmbedding = employeesConn.model('FaceEmbedding', faceEmbeddingSchema);

    const embeddings = await FaceEmbedding.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isActive: true,
    }).lean();

    await employeesConn.close();

    const result: FaceEmbeddingData[] = embeddings
      .filter(e => e.averageEmbedding && e.averageEmbedding.length > 0 && e.employeeId && e.employeeName)
      .map(e => ({
        employeeId: e.employeeId!.toString(),
        employeeName: e.employeeName as string,
        embedding: e.averageEmbedding as number[],
      }));

    // Update cache
    faceEmbeddingsCache = {
      tenantId,
      embeddings: result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error('[Attendance Service] Error fetching face embeddings:', error);
    return [];
  }
};

// Helper to get employee details from employees database
// Helper function to construct database URI for cross-database queries
const constructDbUri = (baseUri: string, dbName: string): string => {
  // If URI already has the database name, replace it
  if (baseUri.includes('/hrm_attendance')) {
    return baseUri.replace('/hrm_attendance', `/${dbName}`);
  }
  // For Cosmos DB style URIs without database in path, append it before query params
  const url = new URL(baseUri);
  url.pathname = `/${dbName}`;
  return url.toString();
};

const getEmployeeDetails = async (employeeIds: string[], tenantId: string) => {
  try {
    // Connect to employees database
    const mongoUri = process.env.MONGODB_URI || '';
    const employeesDbUri = constructDbUri(mongoUri, 'hrm_employees');
    console.log('[Attendance Service] Connecting to employees DB for lookup...');

    const employeesConn = await mongoose.createConnection(employeesDbUri).asPromise();

    // Define a minimal employee schema for querying
    const employeeSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      employeeCode: String,
      email: String,
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
      tenantId: mongoose.Schema.Types.ObjectId,
    });

    const departmentSchema = new mongoose.Schema({
      name: String,
      code: String,
    });

    const Employee = employeesConn.model('Employee', employeeSchema);
    const Department = employeesConn.model('Department', departmentSchema);

    const employees = await Employee.find({
      _id: { $in: employeeIds.map(id => new mongoose.Types.ObjectId(id)) },
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).lean();

    // Get department details
    const deptIds = employees.map(e => e.departmentId).filter(Boolean);
    const departments = await Department.find({ _id: { $in: deptIds } }).lean();
    const deptMap = new Map(departments.map(d => [d._id.toString(), d]));

    await employeesConn.close();

    // Create a map for quick lookup
    const employeeMap = new Map();
    for (const emp of employees) {
      const dept = emp.departmentId ? deptMap.get(emp.departmentId.toString()) : null;
      employeeMap.set(emp._id.toString(), {
        _id: emp._id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeCode: emp.employeeCode,
        email: emp.email,
        departmentId: dept ? { _id: dept._id, name: dept.name } : null,
      });
    }

    return employeeMap;
  } catch (error) {
    console.error('[Attendance Service] Error fetching employee details:', error);
    return new Map();
  }
};

// Helper to get employee by userId or by looking up user email
const getEmployeeByUserIdOrEmail = async (userId: string, tenantId: string) => {
  try {
    const mongoUri = process.env.MONGODB_URI || '';
    const employeesDbUri = constructDbUri(mongoUri, 'hrm_employees');
    console.log('[Attendance Service] getEmployeeByUserIdOrEmail - Looking up userId:', userId);

    const employeesConn = await mongoose.createConnection(employeesDbUri).asPromise();

    const employeeSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      employeeCode: String,
      email: String,
      phone: String,
      userId: mongoose.Schema.Types.ObjectId,
      tenantId: mongoose.Schema.Types.ObjectId,
    });

    const Employee = employeesConn.model('Employee', employeeSchema);

    // First try to find directly by _id (for mobile login where employeeId IS the user._id)
    let employee = null;
    try {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        employee = await Employee.findOne({
          _id: new mongoose.Types.ObjectId(userId),
          tenantId: new mongoose.Types.ObjectId(tenantId),
        }).lean();
        if (employee) {
          console.log('[Attendance Service] Found employee directly by _id:', employee._id);
          await employeesConn.close();
          return employee;
        }
      }
    } catch (e) {
      // Continue to other lookup methods
    }

    // Then try to find by userId field
    employee = await Employee.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).lean();

    // If not found by userId, get user's email and search by email
    if (!employee) {
      console.log('[Attendance Service] Employee not found by userId, trying by email...');

      // Connect to auth database to get user email
      const authDbUri = constructDbUri(mongoUri, 'hrm_auth');
      const authConn = await mongoose.createConnection(authDbUri).asPromise();

      const userSchema = new mongoose.Schema({
        email: String,
        tenantId: mongoose.Schema.Types.ObjectId,
      });

      const User = authConn.model('User', userSchema);
      const user = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) }).lean();
      await authConn.close();

      if (user && user.email) {
        console.log('[Attendance Service] Found user email:', user.email);
        // Search employee by email
        employee = await Employee.findOne({
          email: user.email.toLowerCase(),
          tenantId: new mongoose.Types.ObjectId(tenantId),
        }).lean();

        if (employee) {
          console.log('[Attendance Service] Found employee by email:', employee._id);

          // Update the employee record to link userId for future lookups
          await Employee.updateOne(
            { _id: employee._id },
            { userId: new mongoose.Types.ObjectId(userId) }
          );
          console.log('[Attendance Service] Linked employee to user');
        }
      }
    }

    await employeesConn.close();

    if (employee) {
      return {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
        email: employee.email,
      };
    }

    return null;
  } catch (error) {
    console.error('[Attendance Service] Error fetching employee by userId/email:', error);
    return null;
  }
};

// Helper to get tenant's geofencing settings
interface GeofencingSettings {
  enabled: boolean;
  locations: Array<{
    _id?: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    radius: number;
  }>;
  defaultRadius: number;
  strictMode: boolean;
}

const getTenantGeofencing = async (tenantId: string): Promise<GeofencingSettings | null> => {
  try {
    const mongoUri = process.env.MONGODB_URI || '';
    const tenantDbUri = mongoUri.replace('/hrm_attendance', '/hrm_tenants');
    const tenantConn = await mongoose.createConnection(tenantDbUri).asPromise();

    const tenantSchema = new mongoose.Schema({
      settings: {
        geofencing: {
          enabled: Boolean,
          locations: [{
            name: String,
            latitude: Number,
            longitude: Number,
            address: String,
            radius: Number,
          }],
          defaultRadius: Number,
          strictMode: Boolean,
        },
      },
    });

    const Tenant = tenantConn.model('Tenant', tenantSchema);
    const tenant = await Tenant.findById(new mongoose.Types.ObjectId(tenantId)).lean();
    await tenantConn.close();

    if (tenant && tenant.settings?.geofencing) {
      // Map locations to ensure correct type
      const locations = (tenant.settings.geofencing.locations || []).map((loc: any) => ({
        _id: loc._id?.toString(),
        name: loc.name || '',
        latitude: loc.latitude || 0,
        longitude: loc.longitude || 0,
        address: loc.address,
        radius: loc.radius || 100,
      }));
      return {
        enabled: tenant.settings.geofencing.enabled || false,
        locations,
        defaultRadius: tenant.settings.geofencing.defaultRadius || 100,
        strictMode: tenant.settings.geofencing.strictMode !== false, // default true
      };
    }

    return null;
  } catch (error) {
    console.error('[Attendance Service] Error fetching tenant geofencing settings:', error);
    return null;
  }
};

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

    // If employeeId is provided, use it directly; otherwise look up employee by userId
    let targetEmployeeId = employeeId;
    if (!targetEmployeeId && userId) {
      const employee = await getEmployeeByUserIdOrEmail(userId, tenantId);
      if (employee) {
        targetEmployeeId = employee._id.toString();
        console.log('[Attendance Service] Check-in: Resolved userId to employeeId:', targetEmployeeId);
      } else {
        targetEmployeeId = userId; // Fallback to userId
      }
    }

    // Use IST date for today
    const today = getISTStartOfDay();
    console.log('[Attendance Service] Check-in: Using IST date:', today.toISOString());

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

    // If employeeId is provided, use it directly; otherwise look up employee by userId
    let targetEmployeeId = employeeId;
    if (!targetEmployeeId && userId) {
      const employee = await getEmployeeByUserIdOrEmail(userId, tenantId);
      if (employee) {
        targetEmployeeId = employee._id.toString();
        console.log('[Attendance Service] Check-out: Resolved userId to employeeId:', targetEmployeeId);
      } else {
        targetEmployeeId = userId; // Fallback to userId
      }
    }

    // Use IST date for today
    const today = getISTStartOfDay();
    console.log('[Attendance Service] Check-out: Using IST date:', today.toISOString());

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
    const {
      employeeId,
      startDate,
      endDate,
      status,
      search,
      departmentId,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // If search or departmentId is provided, we need to filter by employee first
    let filteredEmployeeIds: string[] | null = null;

    if (search || departmentId) {
      try {
        const mongoUri = process.env.MONGODB_URI || '';
        const employeesDbUri = mongoUri.replace('/hrm_attendance', '/hrm_employees');
        const employeesConn = await mongoose.createConnection(employeesDbUri).asPromise();

        const employeeSchema = new mongoose.Schema({
          firstName: String,
          lastName: String,
          employeeCode: String,
          email: String,
          departmentId: mongoose.Schema.Types.ObjectId,
          tenantId: mongoose.Schema.Types.ObjectId,
        });

        const Employee = employeesConn.model('Employee', employeeSchema);

        const employeeQuery: Record<string, unknown> = {
          tenantId: new mongoose.Types.ObjectId(tenantId),
        };

        if (search) {
          const searchRegex = { $regex: search, $options: 'i' };
          employeeQuery.$or = [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { employeeCode: searchRegex },
            { email: searchRegex },
          ];
        }

        if (departmentId) {
          employeeQuery.departmentId = new mongoose.Types.ObjectId(departmentId as string);
        }

        const matchingEmployees = await Employee.find(employeeQuery).select('_id').lean();
        filteredEmployeeIds = matchingEmployees.map(e => e._id.toString());

        await employeesConn.close();

        // If no employees match the search/filter, return empty results
        if (filteredEmployeeIds.length === 0) {
          res.status(200).json({
            success: true,
            data: {
              records: [],
              pagination: {
                total: 0,
                page: Number(page),
                limit: Number(limit),
                pages: 0,
              },
            },
          });
          return;
        }
      } catch (error) {
        console.error('[Attendance Service] Error filtering employees:', error);
      }
    }

    const query: Record<string, unknown> = { tenantId };

    if (employeeId) {
      // Try to get employee by userId if the provided ID doesn't match an employee
      let actualEmployeeId = employeeId as string;
      const employee = await getEmployeeByUserIdOrEmail(employeeId as string, tenantId);
      if (employee) {
        actualEmployeeId = employee._id.toString();
      }
      query.employeeId = actualEmployeeId;
    } else if (filteredEmployeeIds) {
      query.employeeId = { $in: filteredEmployeeIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // Parse start date as IST and get UTC equivalent for start of day
        (query.date as Record<string, unknown>).$gte = parseISTDateString(startDate as string);
        console.log('[Attendance Service] Query startDate (IST):', startDate, '-> UTC:', parseISTDateString(startDate as string).toISOString());
      }
      if (endDate) {
        // Parse end date as IST and get UTC equivalent for end of day
        (query.date as Record<string, unknown>).$lte = getISTEndOfDay(endDate as string);
        console.log('[Attendance Service] Query endDate (IST):', endDate, '-> UTC:', getISTEndOfDay(endDate as string).toISOString());
      }
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Dynamic sorting
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1,
    };

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Attendance.countDocuments(query),
    ]);

    // Fetch employee details
    const employeeIds = records.map(r => r.employeeId.toString());
    const employeeMap = await getEmployeeDetails(employeeIds, tenantId);

    // Attach employee details to records
    const recordsWithEmployees = records.map(record => ({
      ...record,
      employee: employeeMap.get(record.employeeId.toString()) || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        records: recordsWithEmployees,
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

    // Use IST date for today
    const today = getISTStartOfDay();

    // First try to find attendance by the provided ID
    let attendance = await Attendance.findOne({
      tenantId,
      employeeId,
      date: today,
    });

    // If not found and this might be a userId, look up the employee first
    if (!attendance) {
      const employee = await getEmployeeByUserIdOrEmail(employeeId, tenantId);
      if (employee) {
        attendance = await Attendance.findOne({
          tenantId,
          employeeId: employee._id.toString(),
          date: today,
        });
      }
    }

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

// Get my today status (self-service using user ID from headers)
export const getMyTodayStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID not found in headers',
      });
      return;
    }

    // Use IST date for today
    const today = getISTStartOfDay();

    // Look up employee by userId
    const employee = await getEmployeeByUserIdOrEmail(userId, tenantId);

    let attendance = null;
    if (employee) {
      attendance = await Attendance.findOne({
        tenantId,
        employeeId: employee._id.toString(),
        date: today,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        attendance,
        employee: employee ? { _id: employee._id, firstName: employee.firstName, lastName: employee.lastName } : null,
        isCheckedIn: !!attendance?.checkIn,
        isCheckedOut: !!attendance?.checkOut,
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Get my today status error:', error);
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

    // Default to current month/year if not provided (using IST)
    const currentDate = getISTDate();
    const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
    const targetYear = year ? Number(year) : currentDate.getFullYear();

    // Create IST dates and convert to UTC for query
    const startDate = parseISTDateString(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`);
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = getISTEndOfDay(`${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`);

    const query: Record<string, unknown> = {
      tenantId,
      date: { $gte: startDate, $lte: endDate },
    };

    if (employeeId) {
      // Try to get employee by userId if the provided ID doesn't match an employee
      let actualEmployeeId = employeeId as string;
      const employee = await getEmployeeByUserIdOrEmail(employeeId as string, tenantId);
      if (employee) {
        actualEmployeeId = employee._id.toString();
      }
      query.employeeId = actualEmployeeId;
    }

    const records = await Attendance.find(query).lean();

    const summary = {
      totalDays: lastDayOfMonth,
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

// Face Check In
export const faceCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, faceImage, location, notes } = req.body;

    if (!faceImage) {
      res.status(400).json({
        success: false,
        message: 'Face image is required',
      });
      return;
    }

    const targetEmployeeId = employeeId || userId;
    // Use IST date for today
    const today = getISTStartOfDay();

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

    // TODO: Integrate with face verification service (AWS Rekognition, Azure Face API, etc.)
    // For now, we simulate face verification
    // In production, you would:
    // 1. Get the employee's registered face encoding from the database
    // 2. Send the captured image to a face verification service
    // 3. Compare the face encoding with the captured image
    // 4. Return the verification result and confidence score

    const faceVerificationResult = {
      verified: true, // Simulated - replace with actual verification
      score: 0.95,    // Confidence score (0-1)
    };

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
    attendance.checkInMethod = 'face';
    attendance.checkInFaceImage = faceImage; // Store or URL to stored image
    attendance.checkInFaceVerified = faceVerificationResult.verified;
    attendance.checkInFaceScore = faceVerificationResult.score;

    if (location) {
      attendance.checkInLocation = location;
    }
    if (notes) {
      attendance.notes = notes;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: faceVerificationResult.verified
        ? 'Face verified and check-in successful'
        : 'Face verification failed but check-in recorded',
      data: {
        attendance,
        faceVerified: faceVerificationResult.verified,
        faceVerificationScore: faceVerificationResult.score,
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Face check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in with face verification',
    });
  }
};

// Face Check Out
export const faceCheckOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, faceImage, location, notes } = req.body;

    if (!faceImage) {
      res.status(400).json({
        success: false,
        message: 'Face image is required',
      });
      return;
    }

    const targetEmployeeId = employeeId || userId;
    // Use IST date for today
    const today = getISTStartOfDay();

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

    // TODO: Integrate with face verification service
    const faceVerificationResult = {
      verified: true,
      score: 0.93,
    };

    attendance.checkOut = new Date();
    attendance.checkOutMethod = 'face';
    attendance.checkOutFaceImage = faceImage;
    attendance.checkOutFaceVerified = faceVerificationResult.verified;
    attendance.checkOutFaceScore = faceVerificationResult.score;

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
      message: faceVerificationResult.verified
        ? 'Face verified and check-out successful'
        : 'Face verification failed but check-out recorded',
      data: {
        attendance,
        faceVerified: faceVerificationResult.verified,
        faceVerificationScore: faceVerificationResult.score,
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Face check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check out with face verification',
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

// Verify Face - Identify employee from face image
export const verifyFace = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { faceImage, location } = req.body;

    if (!faceImage) {
      res.status(400).json({
        success: false,
        status: 'NO_IMAGE',
        message: 'Face image is required',
      });
      return;
    }

    console.log('[Attendance Service] Verifying face for tenant:', tenantId);

    // Get stored face embeddings for this tenant
    const storedEmbeddings = await getFaceEmbeddings(tenantId);

    if (storedEmbeddings.length === 0) {
      res.status(200).json({
        success: false,
        status: 'NO_ENROLLMENTS',
        message: 'No employees are enrolled for face recognition. Please contact HR to enroll your face.',
      });
      return;
    }

    console.log('[Attendance Service] Found', storedEmbeddings.length, 'enrolled faces');

    // Match face against stored embeddings
    const matchResult = await faceRecognitionService.matchFace(faceImage, storedEmbeddings);

    console.log('[Attendance Service] Match result:', matchResult.status);

    res.status(200).json({
      success: matchResult.status === 'MATCHED',
      status: matchResult.status,
      employeeId: matchResult.employeeId,
      employeeName: matchResult.employeeName,
      confidence: matchResult.confidence,
      message: matchResult.message,
    });
  } catch (error) {
    console.error('[Attendance Service] Face verification error:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      message: 'Failed to verify face. Please try again.',
    });
  }
};

// Confirm Face Check-In - After face verification
export const confirmFaceCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, location, notes, confidence } = req.body;

    if (!employeeId) {
      res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
      return;
    }

    // Use IST date for today
    const today = getISTStartOfDay();

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      tenantId,
      employeeId,
      date: today,
    });

    if (existingAttendance && existingAttendance.checkIn) {
      res.status(400).json({
        success: false,
        message: 'Already checked in today',
      });
      return;
    }

    // Geo-fence validation
    let geofenceResult: {
      isWithin: boolean;
      nearestOffice: string | null;
      nearestOfficeId: string | null;
      distanceMeters: number;
      allowedRadius: number;
    } | null = null;

    const geofencingSettings = await getTenantGeofencing(tenantId);

    if (geofencingSettings?.enabled && geofencingSettings.locations.length > 0) {
      if (!location || !location.latitude || !location.longitude) {
        res.status(400).json({
          success: false,
          message: 'Location is required for geo-fenced check-in',
          code: 'LOCATION_REQUIRED',
        });
        return;
      }

      // Validate employee location against geo-fences
      geofenceResult = isWithinGeofence(
        { latitude: location.latitude, longitude: location.longitude },
        geofencingSettings.locations,
        geofencingSettings.defaultRadius
      );

      console.log('[Attendance Service] Geo-fence validation:', {
        employeeLocation: location,
        isWithin: geofenceResult.isWithin,
        nearestOffice: geofenceResult.nearestOffice,
        distance: `${geofenceResult.distanceMeters}m`,
        allowedRadius: `${geofenceResult.allowedRadius}m`,
      });

      // In strict mode, reject check-in if outside geo-fence
      if (!geofenceResult.isWithin && geofencingSettings.strictMode) {
        res.status(403).json({
          success: false,
          message: `You are outside the allowed check-in area. You are ${formatDistance(geofenceResult.distanceMeters)} away from ${geofenceResult.nearestOffice || 'the office'}. Allowed radius: ${formatDistance(geofenceResult.allowedRadius)}.`,
          code: 'OUTSIDE_GEOFENCE',
          data: {
            nearestOffice: geofenceResult.nearestOffice,
            distanceMeters: geofenceResult.distanceMeters,
            allowedRadius: geofenceResult.allowedRadius,
          },
        });
        return;
      }
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
      employeeId,
      date: today,
    });

    attendance.checkIn = now;
    attendance.status = status;
    attendance.checkInMethod = 'face';
    attendance.checkInFaceVerified = true;
    attendance.checkInFaceScore = confidence || 0.9;

    if (location) {
      attendance.checkInLocation = location;
    }
    if (notes) {
      attendance.notes = notes;
    }

    // Store geo-fence validation result if available
    if (geofenceResult) {
      attendance.geofenceValidation = {
        isWithinGeofence: geofenceResult.isWithin,
        nearestOffice: geofenceResult.nearestOffice,
        nearestOfficeId: geofenceResult.nearestOfficeId,
        distanceMeters: geofenceResult.distanceMeters,
        allowedRadius: geofenceResult.allowedRadius,
        validatedAt: new Date(),
      };
    }

    await attendance.save();

    // Get employee name for response
    const employeeMap = await getEmployeeDetails([employeeId], tenantId);
    const employee = employeeMap.get(employeeId);

    // Include geo-fence warning in message if not strict mode
    let message = `Thank you, ${employee?.firstName || 'Employee'}! Have a productive day!`;
    if (geofenceResult && !geofenceResult.isWithin) {
      message = `Check-in recorded with location warning. You are ${formatDistance(geofenceResult.distanceMeters)} away from ${geofenceResult.nearestOffice || 'the office'}.`;
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        attendance,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employee',
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Confirm face check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm check-in',
    });
  }
};

// Enroll Face - Save face embeddings for an employee
export const enrollFace = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, images } = req.body;

    if (!employeeId) {
      res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
      return;
    }

    if (!images || !Array.isArray(images) || images.length < 1) {
      res.status(400).json({
        success: false,
        message: 'At least 1 face image is required for enrollment',
      });
      return;
    }

    console.log('[Attendance Service] Enrolling face for employee/user:', employeeId);
    console.log('[Attendance Service] Number of images:', images.length);

    // Get employee details first - try by employee ID
    let employeeMap = await getEmployeeDetails([employeeId], tenantId);
    let employee = employeeMap.get(employeeId);
    let actualEmployeeId = employeeId;

    // If not found, try looking up by userId or email
    if (!employee) {
      console.log('[Attendance Service] Employee not found by ID, trying by userId/email...');
      const employeeByUser = await getEmployeeByUserIdOrEmail(employeeId, tenantId);
      if (employeeByUser) {
        employee = employeeByUser;
        actualEmployeeId = employeeByUser._id.toString();
        console.log('[Attendance Service] Found employee by userId/email:', actualEmployeeId);
      }
    }

    if (!employee) {
      res.status(404).json({
        success: false,
        message: 'Employee not found. Please contact HR.',
      });
      return;
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`;

    // Process each image and generate embeddings
    const embeddings: Array<{
      vector: number[];
      capturedAt: Date;
      quality: number;
      angle: string;
    }> = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const detection = await faceRecognitionService.detectFace(images[i]);

        if (detection.detected && detection.descriptor && detection.faceCount === 1) {
          embeddings.push({
            vector: Array.from(detection.descriptor),
            capturedAt: new Date(),
            quality: detection.quality,
            angle: i === 0 ? 'front' : i === 1 ? 'left' : i === 2 ? 'right' : 'front',
          });
          console.log(`[Attendance Service] Image ${i + 1}: Face detected with quality ${detection.quality.toFixed(2)}`);
        } else {
          console.log(`[Attendance Service] Image ${i + 1}: No valid face detected`);
        }
      } catch (err) {
        console.error(`[Attendance Service] Error processing image ${i + 1}:`, err);
      }
    }

    if (embeddings.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid faces detected in the provided images. Please ensure clear, front-facing photos.',
      });
      return;
    }

    // Calculate average embedding
    const vectorLength = embeddings[0].vector.length;
    const avgVector = new Array(vectorLength).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < vectorLength; i++) {
        avgVector[i] += embedding.vector[i];
      }
    }

    for (let i = 0; i < vectorLength; i++) {
      avgVector[i] /= embeddings.length;
    }

    // Normalize the average vector
    const magnitude = Math.sqrt(avgVector.reduce((sum: number, val: number) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vectorLength; i++) {
        avgVector[i] /= magnitude;
      }
    }

    // Save to employees database
    try {
      const mongoUri = process.env.MONGODB_URI || '';
      console.log('[Attendance Service] Saving face embedding - constructing employees DB URI');
      const employeesDbUri = constructDbUri(mongoUri, 'hrm_employees');
      console.log('[Attendance Service] Connecting to employees DB for save...');
      const employeesConn = await mongoose.createConnection(employeesDbUri).asPromise();
      console.log('[Attendance Service] Connected to employees DB successfully');

      const faceEmbeddingSchema = new mongoose.Schema({
        tenantId: mongoose.Schema.Types.ObjectId,
        employeeId: mongoose.Schema.Types.ObjectId,
        employeeName: String,
        embeddings: [{
          vector: [Number],
          capturedAt: Date,
          quality: Number,
          angle: String,
        }],
        averageEmbedding: [Number],
        enrolledAt: Date,
        enrolledBy: mongoose.Schema.Types.ObjectId,
        isActive: Boolean,
        version: Number,
        lastMatchedAt: Date,
        matchCount: Number,
      });

      const FaceEmbedding = employeesConn.model('FaceEmbedding', faceEmbeddingSchema);

      // Check if already enrolled
      const existing = await FaceEmbedding.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        employeeId: new mongoose.Types.ObjectId(actualEmployeeId),
      });

      if (existing) {
        // Update existing enrollment
        (existing as any).embeddings = embeddings;
        (existing as any).averageEmbedding = avgVector;
        existing.enrolledAt = new Date();
        existing.enrolledBy = new mongoose.Types.ObjectId(userId);
        existing.version = (existing.version || 0) + 1;
        await existing.save();
      } else {
        // Create new enrollment
        await FaceEmbedding.create({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          employeeId: new mongoose.Types.ObjectId(actualEmployeeId),
          employeeName,
          embeddings,
          averageEmbedding: avgVector,
          enrolledAt: new Date(),
          enrolledBy: new mongoose.Types.ObjectId(userId),
          isActive: true,
          version: 1,
          matchCount: 0,
        });
      }

      // Update employee record
      const employeeSchema = new mongoose.Schema({
        faceEnrolled: Boolean,
        faceEnrollmentDate: Date,
      });

      const Employee = employeesConn.model('Employee', employeeSchema);
      await Employee.updateOne(
        { _id: new mongoose.Types.ObjectId(actualEmployeeId) },
        { faceEnrolled: true, faceEnrollmentDate: new Date() }
      );

      await employeesConn.close();

      // Clear cache to pick up new enrollment
      faceEmbeddingsCache = null;

      console.log(`[Attendance Service] Face enrolled successfully for ${employeeName} (${actualEmployeeId})`);
      res.status(200).json({
        success: true,
        message: `Face enrolled successfully for ${employeeName}`,
        data: {
          employeeId: actualEmployeeId,
          employeeName,
          enrolledImages: embeddings.length,
          totalImages: images.length,
        },
      });
    } catch (dbError) {
      console.error('[Attendance Service] Database error during enrollment:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('[Attendance Service] Face enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll face',
    });
  }
};

// Confirm Face Check-Out - After face verification
export const confirmFaceCheckOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, location, notes, confidence } = req.body;

    if (!employeeId) {
      res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
      return;
    }

    // Use IST date for today
    const today = getISTStartOfDay();

    const attendance = await Attendance.findOne({
      tenantId,
      employeeId,
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
    attendance.checkOutMethod = 'face';
    attendance.checkOutFaceVerified = true;
    attendance.checkOutFaceScore = confidence || 0.9;

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

    // Get employee name for response
    const employeeMap = await getEmployeeDetails([employeeId], tenantId);
    const employee = employeeMap.get(employeeId);

    res.status(200).json({
      success: true,
      message: `Goodbye, ${employee?.firstName || 'Employee'}! See you tomorrow!`,
      data: {
        attendance,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employee',
        workHours: workHours.toFixed(2),
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Confirm face check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm check-out',
    });
  }
};

// Get Face Recognition Service Status
export const getFaceRecognitionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Initialize the service if not already
    await faceRecognitionService.initialize();

    const status = faceRecognitionService.getStatus();

    res.status(200).json({
      success: true,
      data: {
        ...status,
        message: status.mockMode
          ? 'Face recognition is running in MOCK mode (canvas not available). Install Visual Studio Build Tools and canvas package for production mode.'
          : 'Face recognition is running in PRODUCTION mode with real ML inference.',
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Get face recognition status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get face recognition status',
    });
  }
};

// Confirm Offline Face Check-In - Sync offline punch with original timestamp
export const confirmOfflineCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, location, originalTimestamp, confidence, notes, isOffline } = req.body;

    if (!employeeId || !originalTimestamp) {
      res.status(400).json({
        success: false,
        message: 'Employee ID and original timestamp are required',
      });
      return;
    }

    // Parse original timestamp for the attendance date
    const originalTime = new Date(originalTimestamp);
    const today = getISTStartOfDay(originalTime);

    console.log('[Attendance Service] Offline check-in:', {
      employeeId,
      originalTimestamp,
      originalTime: originalTime.toISOString(),
      attendanceDate: today.toISOString(),
      isOffline,
    });

    // Check if already checked in on that date
    const existingAttendance = await Attendance.findOne({
      tenantId,
      employeeId,
      date: today,
    });

    if (existingAttendance && existingAttendance.checkIn) {
      res.status(400).json({
        success: false,
        message: 'Already checked in for this date',
      });
      return;
    }

    // Geo-fence validation (use original location)
    let geofenceResult: {
      isWithin: boolean;
      nearestOffice: string | null;
      nearestOfficeId: string | null;
      distanceMeters: number;
      allowedRadius: number;
    } | null = null;

    const geofencingSettings = await getTenantGeofencing(tenantId);

    if (geofencingSettings?.enabled && geofencingSettings.locations.length > 0 && location) {
      geofenceResult = isWithinGeofence(
        { latitude: location.latitude, longitude: location.longitude },
        geofencingSettings.locations,
        geofencingSettings.defaultRadius
      );
      // Note: For offline punches, we don't reject based on geofence - just record the result
    }

    // Determine late status based on original time
    const shift = await Shift.findOne({ tenantId, isDefault: true });
    let status: 'present' | 'late' = 'present';

    if (shift) {
      const [shiftHour, shiftMinute] = shift.startTime.split(':').map(Number);
      const shiftStart = new Date(today);
      shiftStart.setHours(shiftHour, shiftMinute + shift.graceMinutes, 0, 0);

      if (originalTime > shiftStart) {
        status = 'late';
      }
    }

    const attendance = existingAttendance || new Attendance({
      tenantId,
      employeeId,
      date: today,
    });

    // Use original timestamp for checkIn time
    attendance.checkIn = originalTime;
    attendance.status = status;
    attendance.checkInMethod = 'face';
    attendance.checkInFaceVerified = true;
    attendance.checkInFaceScore = confidence || 0.9;

    if (location) {
      attendance.checkInLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      };
    }

    // Mark as offline sync in notes
    const syncNote = `[Offline: captured ${originalTimestamp}, synced ${new Date().toISOString()}]`;
    attendance.notes = notes ? `${notes} ${syncNote}` : syncNote;

    // Store geo-fence validation result if available
    if (geofenceResult) {
      attendance.geofenceValidation = {
        isWithinGeofence: geofenceResult.isWithin,
        nearestOffice: geofenceResult.nearestOffice,
        nearestOfficeId: geofenceResult.nearestOfficeId,
        distanceMeters: geofenceResult.distanceMeters,
        allowedRadius: geofenceResult.allowedRadius,
        validatedAt: originalTime, // Use original time for validation timestamp
      };
    }

    await attendance.save();

    // Get employee name for response
    const employeeMap = await getEmployeeDetails([employeeId], tenantId);
    const employee = employeeMap.get(employeeId);

    console.log('[Attendance Service] Offline check-in synced successfully:', {
      employeeId,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
      checkInTime: originalTime.toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Offline check-in synced for ${employee?.firstName || 'Employee'}`,
      data: {
        attendance,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employee',
        wasOffline: true,
        originalTimestamp,
        syncedTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Confirm offline check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync offline check-in',
    });
  }
};

// Confirm Offline Face Check-Out - Sync offline punch with original timestamp
export const confirmOfflineCheckOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, location, originalTimestamp, confidence, notes, isOffline } = req.body;

    if (!employeeId || !originalTimestamp) {
      res.status(400).json({
        success: false,
        message: 'Employee ID and original timestamp are required',
      });
      return;
    }

    // Parse original timestamp for the attendance date
    const originalTime = new Date(originalTimestamp);
    const today = getISTStartOfDay(originalTime);

    console.log('[Attendance Service] Offline check-out:', {
      employeeId,
      originalTimestamp,
      originalTime: originalTime.toISOString(),
      attendanceDate: today.toISOString(),
      isOffline,
    });

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      tenantId,
      employeeId,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      res.status(400).json({
        success: false,
        message: 'No check-in found for this date. Cannot check out.',
      });
      return;
    }

    if (attendance.checkOut) {
      res.status(400).json({
        success: false,
        message: 'Already checked out for this date',
      });
      return;
    }

    // Use original timestamp for checkOut
    attendance.checkOut = originalTime;
    attendance.checkOutMethod = 'face';
    attendance.checkOutFaceVerified = true;
    attendance.checkOutFaceScore = confidence || 0.9;

    if (location) {
      attendance.checkOutLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      };
    }

    // Append offline sync note
    const syncNote = `[Offline checkout: captured ${originalTimestamp}, synced ${new Date().toISOString()}]`;
    attendance.notes = attendance.notes ? `${attendance.notes} ${syncNote}` : syncNote;

    // Calculate work hours
    const checkInTime = new Date(attendance.checkIn).getTime();
    const checkOutTime = originalTime.getTime();
    const workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

    attendance.workHours = workHours;

    // Update status based on work hours
    if (workHours < 4) {
      attendance.status = 'half_day';
    }

    // Calculate overtime (if > 8 hours)
    if (workHours > 8) {
      attendance.overtimeHours = workHours - 8;
    }

    await attendance.save();

    // Get employee name for response
    const employeeMap = await getEmployeeDetails([employeeId], tenantId);
    const employee = employeeMap.get(employeeId);

    console.log('[Attendance Service] Offline check-out synced successfully:', {
      employeeId,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
      checkOutTime: originalTime.toISOString(),
      workHours: workHours.toFixed(2),
    });

    res.status(200).json({
      success: true,
      message: `Offline check-out synced for ${employee?.firstName || 'Employee'}`,
      data: {
        attendance,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employee',
        workHours: workHours.toFixed(2),
        wasOffline: true,
        originalTimestamp,
        syncedTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Attendance Service] Confirm offline check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync offline check-out',
    });
  }
};
