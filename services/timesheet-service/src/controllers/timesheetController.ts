import { Request, Response } from 'express';
import Timesheet from '../models/Timesheet';
import TimeEntry from '../models/TimeEntry';
import Project from '../models/Project';
import mongoose from 'mongoose';

// Helper to get employee details from employees database
const getEmployeeDetails = async (employeeIds: string[], tenantId: string) => {
  let employeesConn: mongoose.Connection | null = null;

  try {
    if (!employeeIds || employeeIds.length === 0) {
      console.log('[Timesheet Service] No employee IDs to fetch');
      return new Map();
    }

    console.log('[Timesheet Service] Fetching employee details for IDs:', employeeIds);

    const mongoUri = process.env.MONGODB_URI || '';
    const employeesDbUri = mongoUri.replace('/hrm_timesheets', '/hrm_employees');
    console.log('[Timesheet Service] Connecting to employees DB:', employeesDbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

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

    // Connect to employees database
    employeesConn = mongoose.createConnection(employeesDbUri);
    await employeesConn.asPromise();

    const employeesCollection = employeesConn.collection('employees');

    // Search by _id
    console.log('[Timesheet Service] Searching employees with tenantId:', tenantId, 'objectIds:', objectIds.map(id => id.toString()));
    const employees = await employeesCollection.find({
      tenantId: tenantObjectId,
      _id: { $in: objectIds },
    }).toArray();

    console.log('[Timesheet Service] Found employees:', employees.length);

    // Build map from employee records
    for (const emp of employees) {
      const employeeData = {
        _id: emp._id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeCode: emp.employeeCode,
        email: emp.email,
      };
      employeeMap.set(emp._id.toString(), employeeData);
      console.log('[Timesheet Service] Mapped employee:', emp._id.toString(), emp.firstName, emp.lastName);
    }

    return employeeMap;
  } catch (error) {
    console.error('[Timesheet Service] Error fetching employee details:', error);
    return new Map();
  } finally {
    if (employeesConn) {
      try { await employeesConn.close(); } catch (e) { /* ignore */ }
    }
  }
};

// Helper to get week start/end dates
const getWeekDates = (date: Date): { start: Date; end: Date } => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Helper to get tenant ID from header
const getTenantId = (req: Request): string | null => {
  return req.headers['x-tenant-id'] as string || null;
};

// Project Controllers
export const createProject = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const project = new Project({
      ...req.body,
      tenantId,
      createdBy: req.body.userId,
    });
    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { status, employeeId, isActive } = req.query;

    const query: any = { tenantId };
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (employeeId) {
      query['members.employeeId'] = employeeId;
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Collect all employee IDs (managers and members)
    const employeeIds: string[] = [];
    projects.forEach(p => {
      if (p.managerId) employeeIds.push(p.managerId.toString());
      p.members?.forEach((m: any) => {
        if (m.employeeId) employeeIds.push(m.employeeId.toString());
      });
    });

    // Fetch employee details from employees database
    const uniqueEmployeeIds = [...new Set(employeeIds)];
    const employeeMap = await getEmployeeDetails(uniqueEmployeeIds, tenantId);

    // Merge employee data into projects
    const projectsWithEmployees = projects.map(project => {
      const managerId = project.managerId?.toString();
      const managerData = managerId ? employeeMap.get(managerId) : null;

      const membersWithData = project.members?.map((m: any) => {
        const memberId = m.employeeId?.toString();
        const memberData = memberId ? employeeMap.get(memberId) : null;
        return {
          ...m,
          employeeId: memberData || { _id: m.employeeId, firstName: 'Unknown', lastName: 'Employee' },
        };
      }) || [];

      return {
        ...project,
        managerId: managerData || { _id: project.managerId, firstName: 'Unknown', lastName: 'Manager' },
        members: membersWithData,
      };
    });

    res.json({ success: true, data: projectsWithEmployees });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;
    const project = await Project.findOne({ _id: id, tenantId }).lean();

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Collect all employee IDs (manager and members)
    const employeeIds: string[] = [];
    if (project.managerId) employeeIds.push(project.managerId.toString());
    project.members?.forEach((m: any) => {
      if (m.employeeId) employeeIds.push(m.employeeId.toString());
    });

    // Fetch employee details from employees database
    const uniqueEmployeeIds = [...new Set(employeeIds)];
    const employeeMap = await getEmployeeDetails(uniqueEmployeeIds, tenantId);

    // Merge employee data
    const managerId = project.managerId?.toString();
    const managerData = managerId ? employeeMap.get(managerId) : null;

    const membersWithData = project.members?.map((m: any) => {
      const memberId = m.employeeId?.toString();
      const memberData = memberId ? employeeMap.get(memberId) : null;
      return {
        ...m,
        employeeId: memberData || { _id: m.employeeId, firstName: 'Unknown', lastName: 'Employee', email: '' },
      };
    }) || [];

    const projectWithEmployees = {
      ...project,
      managerId: managerData || { _id: project.managerId, firstName: 'Unknown', lastName: 'Manager', email: '' },
      members: membersWithData,
    };

    res.json({ success: true, data: projectWithEmployees });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;
    const project = await Project.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addProjectMember = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;
    const memberData = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: id, tenantId },
      { $push: { members: memberData } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Timesheet Controllers
export const getOrCreateTimesheet = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { employeeId, date } = req.query;

    const { start, end } = getWeekDates(new Date(date as string));

    let timesheet = await Timesheet.findOne({
      tenantId,
      employeeId,
      weekStartDate: start,
    });

    if (!timesheet) {
      timesheet = new Timesheet({
        tenantId,
        employeeId,
        weekStartDate: start,
        weekEndDate: end,
        periodType: 'weekly',
        entries: [],
        status: 'draft',
      });
      await timesheet.save();
    }

    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimesheets = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { employeeId, status, startDate, endDate, weekNumber, month, year, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    // Handle month/year query - find timesheets that overlap with the selected month
    if (month && year) {
      const targetMonth = Number(month);
      const targetYear = Number(year);

      // Calculate first and last day of the target month
      const firstDayOfMonth = new Date(targetYear, targetMonth - 1, 1);
      const lastDayOfMonth = new Date(targetYear, targetMonth, 0);

      // Find timesheets where the week overlaps with the target month
      // A week overlaps if: weekStartDate <= lastDayOfMonth AND weekEndDate >= firstDayOfMonth
      query.$and = [
        { weekStartDate: { $lte: lastDayOfMonth } },
        { weekEndDate: { $gte: firstDayOfMonth } }
      ];

      // If weekNumber is also specified, filter by that
      if (weekNumber) {
        // Calculate the week's start date based on weekNumber in the month
        const weekNum = Number(weekNumber);
        const firstMonday = new Date(firstDayOfMonth);
        const dayOfWeek = firstMonday.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        firstMonday.setDate(firstMonday.getDate() + diff);

        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Override the date range for specific week
        query.$and = [
          { weekStartDate: { $lte: weekEnd } },
          { weekEndDate: { $gte: weekStart } }
        ];
      }
    } else {
      // Legacy support: if only weekNumber is specified without month/year
      if (weekNumber) query.weekNumber = Number(weekNumber);
      if (month) query.month = Number(month);
      if (year) query.year = Number(year);
    }

    if (startDate && endDate) {
      query.weekStartDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [timesheets, total] = await Promise.all([
      Timesheet.find(query)
        .sort({ weekStartDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Timesheet.countDocuments(query),
    ]);

    // Fetch employee details from employees database
    const employeeIds = [...new Set(timesheets.map(t => t.employeeId?.toString()).filter(Boolean))];
    const employeeMap = await getEmployeeDetails(employeeIds as string[], tenantId);

    // Merge employee data into timesheets
    const timesheetsWithEmployees = timesheets.map(timesheet => {
      const empId = timesheet.employeeId?.toString();
      const employeeData = empId ? employeeMap.get(empId) : null;
      return {
        ...timesheet,
        employeeId: empId, // Keep employeeId as string ID
        employee: employeeData || { _id: timesheet.employeeId, firstName: 'Unknown', lastName: 'Employee', employeeCode: '', email: '' },
      };
    });

    res.json({
      success: true,
      data: timesheetsWithEmployees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimesheetById = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;
    const timesheet = await Timesheet.findOne({ _id: id, tenantId })
      .populate('entries.projectId', 'name code')
      .lean();

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    // Fetch employee details from employees database
    const empId = timesheet.employeeId?.toString();
    let employeeData = null;
    if (empId) {
      const employeeMap = await getEmployeeDetails([empId], tenantId);
      employeeData = employeeMap.get(empId);
    }

    const timesheetWithEmployee = {
      ...timesheet,
      employeeId: employeeData || { _id: timesheet.employeeId, firstName: 'Unknown', lastName: 'Employee', email: '' },
    };

    res.json({ success: true, data: timesheetWithEmployee });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;
    const entryData = req.body;

    const timesheet = await Timesheet.findOne({ _id: id, tenantId, status: 'draft' });
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found or not editable' });
    }

    // Check for duplicate entry on same date/project
    const existingEntry = timesheet.entries.find(
      e => e.date && e.projectId &&
        e.date.toDateString() === new Date(entryData.date).toDateString() &&
        e.projectId.toString() === entryData.projectId
    );

    if (existingEntry) {
      // Update existing entry
      existingEntry.hours += entryData.hours;
      existingEntry.description += `\n${entryData.description}`;
    } else {
      timesheet.entries.push(entryData);
    }

    await timesheet.save();

    // Update project hours
    await Project.findByIdAndUpdate(entryData.projectId, {
      $inc: {
        totalHoursLogged: entryData.hours,
        totalBillableHours: entryData.isBillable ? entryData.hours : 0,
      },
    });

    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id, entryId } = req.params;
    const updateData = req.body;

    const timesheet = await Timesheet.findOne({ _id: id, tenantId, status: 'draft' });
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found or not editable' });
    }

    const entry = timesheet.entries.find(e => e._id?.toString() === entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    Object.assign(entry, updateData);
    await timesheet.save();

    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id, entryId } = req.params;

    const timesheet = await Timesheet.findOne({ _id: id, tenantId, status: 'draft' });
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found or not editable' });
    }

    timesheet.entries = timesheet.entries.filter(e => e._id?.toString() !== entryId);
    await timesheet.save();

    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitTimesheet = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;

    const timesheet = await Timesheet.findOneAndUpdate(
      { _id: id, tenantId, status: 'draft' },
      {
        status: 'submitted',
        submittedAt: new Date(),
      },
      { new: true }
    );

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found or already submitted' });
    }

    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveTimesheet = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;
    const { approvedBy, comments } = req.body;

    const timesheet = await Timesheet.findOneAndUpdate(
      { _id: id, tenantId, status: 'submitted' },
      {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        $push: comments ? { comments: { by: approvedBy, text: comments, at: new Date() } } : {},
      },
      { new: true }
    );

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found or not submitted' });
    }

    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectTimesheet = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;
    const { rejectedBy, reason } = req.body;

    const timesheet = await Timesheet.findOneAndUpdate(
      { _id: id, tenantId, status: 'submitted' },
      {
        status: 'rejected',
        rejectionReason: reason,
        $push: { comments: { by: rejectedBy, text: reason, at: new Date() } },
      },
      { new: true }
    );

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Time Entry Controllers (for timer-based tracking)
export const startTimer = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { employeeId, projectId, taskId, description, isBillable } = req.body;

    // Stop any running timers
    await TimeEntry.updateMany(
      { tenantId, employeeId, status: 'running' },
      { status: 'stopped', endTime: new Date() }
    );

    const entry = new TimeEntry({
      tenantId,
      employeeId,
      projectId,
      taskId,
      description,
      isBillable,
      date: new Date(),
      startTime: new Date(),
      status: 'running',
    });

    await entry.save();
    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const stopTimer = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { id } = req.params;

    const entry = await TimeEntry.findOne({ _id: id, tenantId, status: 'running' });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Running timer not found' });
    }

    entry.endTime = new Date();
    entry.status = 'stopped';
    await entry.save();

    res.json({ success: true, data: entry });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimeEntries = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { employeeId, projectId, startDate, endDate } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (projectId) query.projectId = projectId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const entries = await TimeEntry.find(query)
      .populate('projectId', 'name code')
      .sort({ date: -1, startTime: -1 });

    res.json({ success: true, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reports & Stats
export const getTimesheetStats = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { startDate, endDate, employeeId } = req.query;

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.weekStartDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const matchStage: any = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      status: 'approved',
      ...dateFilter,
    };

    if (employeeId) {
      matchStage.employeeId = new mongoose.Types.ObjectId(employeeId as string);
    }

    const stats = await Timesheet.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$totalHours' },
          billableHours: { $sum: '$billableHours' },
          nonBillableHours: { $sum: '$nonBillableHours' },
          overtimeHours: { $sum: '$overtimeHours' },
          timesheetCount: { $sum: 1 },
        },
      },
    ]);

    const projectHours = await Timesheet.aggregate([
      { $match: matchStage },
      { $unwind: '$entries' },
      {
        $group: {
          _id: '$entries.projectId',
          totalHours: { $sum: '$entries.hours' },
          billableHours: {
            $sum: { $cond: ['$entries.isBillable', '$entries.hours', 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      {
        $project: {
          projectName: '$project.name',
          projectCode: '$project.code',
          totalHours: 1,
          billableHours: 1,
        },
      },
      { $sort: { totalHours: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || {
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          overtimeHours: 0,
          timesheetCount: 0,
        },
        projectHours,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUtilizationReport = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { startDate, endDate } = req.query;

    const utilization = await Timesheet.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: 'approved',
          weekStartDate: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string),
          },
        },
      },
      {
        $group: {
          _id: '$employeeId',
          totalHours: { $sum: '$totalHours' },
          billableHours: { $sum: '$billableHours' },
          weeks: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
      {
        $project: {
          employeeName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
          totalHours: 1,
          billableHours: 1,
          weeks: 1,
          avgHoursPerWeek: { $divide: ['$totalHours', '$weeks'] },
          utilizationRate: {
            $multiply: [{ $divide: ['$billableHours', { $max: ['$totalHours', 1] }] }, 100],
          },
        },
      },
      { $sort: { utilizationRate: -1 } },
    ]);

    res.json({ success: true, data: utilization });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to get attendance records from attendance database
const getAttendanceRecords = async (tenantId: string, startDate: Date, endDate: Date) => {
  let attendanceConn: mongoose.Connection | null = null;

  try {
    const mongoUri = process.env.MONGODB_URI || '';
    const attendanceDbUri = mongoUri.replace('/hrm_timesheets', '/hrm_attendance');

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    attendanceConn = mongoose.createConnection(attendanceDbUri);
    await attendanceConn.asPromise();

    const attendanceCollection = attendanceConn.collection('attendances');

    const attendances = await attendanceCollection.find({
      tenantId: tenantObjectId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).toArray();

    return attendances;
  } catch (error) {
    console.error('[Timesheet Service] Error fetching attendance records:', error);
    return [];
  } finally {
    if (attendanceConn) {
      try { await attendanceConn.close(); } catch (e) { /* ignore */ }
    }
  }
};

// Helper to get all employees for a tenant
const getAllEmployees = async (tenantId: string) => {
  let employeesConn: mongoose.Connection | null = null;

  try {
    const mongoUri = process.env.MONGODB_URI || '';
    const employeesDbUri = mongoUri.replace('/hrm_timesheets', '/hrm_employees');

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    employeesConn = mongoose.createConnection(employeesDbUri);
    await employeesConn.asPromise();

    const employeesCollection = employeesConn.collection('employees');

    const employees = await employeesCollection.find({
      tenantId: tenantObjectId,
      status: { $in: ['active', 'Active', undefined] },
    }).toArray();

    return employees;
  } catch (error) {
    console.error('[Timesheet Service] Error fetching employees:', error);
    return [];
  } finally {
    if (employeesConn) {
      try { await employeesConn.close(); } catch (e) { /* ignore */ }
    }
  }
};

// Calculate hours between two times
const calculateHours = (checkIn: Date | string | null, checkOut: Date | string | null): number => {
  if (!checkIn || !checkOut) return 0;

  const inTime = new Date(checkIn);
  const outTime = new Date(checkOut);

  if (isNaN(inTime.getTime()) || isNaN(outTime.getTime())) return 0;

  const diffMs = outTime.getTime() - inTime.getTime();
  const hours = diffMs / (1000 * 60 * 60);

  return Math.max(0, Math.round(hours * 100) / 100); // Round to 2 decimal places
};

// Get day of week name from date
const getDayOfWeek = (date: Date): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

// Generate timesheets from attendance records
export const generateTimesheetsFromAttendance = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { startDate, endDate, weekNumber, month, year } = req.query;

    let weekStart: Date;
    let weekEnd: Date;

    if (startDate && endDate) {
      weekStart = new Date(startDate as string);
      weekEnd = new Date(endDate as string);
    } else if (weekNumber && month && year) {
      // Calculate week dates from week number
      const firstDayOfMonth = new Date(Number(year), Number(month) - 1, 1);
      const weekOffset = (Number(weekNumber) - 1) * 7;
      weekStart = new Date(firstDayOfMonth);
      weekStart.setDate(firstDayOfMonth.getDate() + weekOffset);
      // Adjust to Monday
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
    } else {
      // Default to current week
      const result = getWeekDates(new Date());
      weekStart = result.start;
      weekEnd = result.end;
    }

    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    console.log(`[Timesheet Service] Generating timesheets for ${tenantId} from ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

    // Get all employees for this tenant
    const employees = await getAllEmployees(tenantId);
    if (employees.length === 0) {
      return res.json({
        success: true,
        message: 'No employees found for this tenant',
        data: { created: 0, updated: 0, timesheets: [] },
      });
    }

    // Get attendance records for the week
    const attendances = await getAttendanceRecords(tenantId, weekStart, weekEnd);
    console.log(`[Timesheet Service] Found ${attendances.length} attendance records and ${employees.length} employees`);

    // Group attendance by employee
    const attendanceByEmployee = new Map<string, any[]>();
    for (const att of attendances) {
      const empId = att.employeeId?.toString();
      if (empId) {
        if (!attendanceByEmployee.has(empId)) {
          attendanceByEmployee.set(empId, []);
        }
        attendanceByEmployee.get(empId)!.push(att);
      }
    }

    const results = {
      created: 0,
      updated: 0,
      timesheets: [] as any[],
    };

    // Create or update timesheets for each employee
    for (const employee of employees) {
      const empId = employee._id.toString();
      const empAttendances = attendanceByEmployee.get(empId) || [];

      // Calculate daily hours from attendance
      const dailyHours: Record<string, number> = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      };

      for (const att of empAttendances) {
        const attDate = new Date(att.date);
        const dayName = getDayOfWeek(attDate);

        // Calculate hours from check-in/check-out
        let hours = 0;
        if (att.checkIn && att.checkOut) {
          hours = calculateHours(att.checkIn, att.checkOut);
        } else if (att.totalHours) {
          hours = Number(att.totalHours) || 0;
        } else if (att.workingHours) {
          hours = Number(att.workingHours) || 0;
        } else if (att.status === 'present' || att.status === 'Present') {
          hours = 8; // Default to 8 hours if marked present but no time data
        }

        dailyHours[dayName] += hours;
      }

      const totalHours = Object.values(dailyHours).reduce((sum, h) => sum + h, 0);
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(0, totalHours - 40);

      // Check if timesheet already exists for this week
      let timesheet = await Timesheet.findOne({
        tenantId,
        employeeId: employee._id,
        weekStartDate: weekStart,
      });

      // Create timesheet entry for "General Work" project
      const entry = {
        projectId: null,
        projectCode: 'GENERAL',
        projectName: 'General Work',
        description: 'Auto-generated from attendance',
        monday: Math.round(dailyHours.monday * 100) / 100,
        tuesday: Math.round(dailyHours.tuesday * 100) / 100,
        wednesday: Math.round(dailyHours.wednesday * 100) / 100,
        thursday: Math.round(dailyHours.thursday * 100) / 100,
        friday: Math.round(dailyHours.friday * 100) / 100,
        saturday: Math.round(dailyHours.saturday * 100) / 100,
        sunday: Math.round(dailyHours.sunday * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        isBillable: true,
      };

      if (timesheet) {
        // Update existing timesheet
        timesheet.entries = [entry];
        timesheet.totalHours = totalHours;
        timesheet.regularHours = regularHours;
        timesheet.overtimeHours = overtimeHours;
        timesheet.billableHours = totalHours;
        timesheet.nonBillableHours = 0;
        await timesheet.save();
        results.updated++;
      } else {
        // Create new timesheet
        const weekNum = Math.ceil((weekStart.getDate()) / 7);
        timesheet = new Timesheet({
          tenantId,
          employeeId: employee._id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          weekNumber: weekNum,
          month: weekStart.getMonth() + 1,
          year: weekStart.getFullYear(),
          periodType: 'weekly',
          entries: [entry],
          totalHours,
          regularHours,
          overtimeHours,
          billableHours: totalHours,
          nonBillableHours: 0,
          status: 'draft',
        });
        await timesheet.save();
        results.created++;
      }

      // Add employee info to the result
      results.timesheets.push({
        _id: timesheet._id,
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          email: employee.email,
        },
        totalHours,
        regularHours,
        overtimeHours,
        status: timesheet.status,
        dailyHours,
      });
    }

    res.json({
      success: true,
      message: `Generated ${results.created} new timesheets, updated ${results.updated} existing timesheets`,
      data: results,
    });
  } catch (error: any) {
    console.error('[Timesheet Service] Error generating timesheets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sync all timesheets for current month from attendance
export const syncTimesheetsFromAttendance = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID required' });
    }
    const { month, year } = req.query;

    const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
    const targetYear = year ? Number(year) : new Date().getFullYear();

    // Get first and last day of the month
    const firstDay = new Date(targetYear, targetMonth - 1, 1);
    const lastDay = new Date(targetYear, targetMonth, 0);

    // Calculate weeks in the month
    const weeks: { start: Date; end: Date; weekNumber: number }[] = [];
    let currentDate = new Date(firstDay);

    // Adjust to Monday of the first week
    const dayOfWeek = currentDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentDate.setDate(currentDate.getDate() + diff);

    let weekNumber = 1;
    while (currentDate <= lastDay || weekNumber <= 4) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekStart.getDate() + 6);

      weeks.push({
        start: new Date(weekStart),
        end: new Date(weekEnd),
        weekNumber,
      });

      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;

      if (weekNumber > 5) break; // Max 5 weeks per month
    }

    const results = {
      month: targetMonth,
      year: targetYear,
      weeksProcessed: 0,
      totalCreated: 0,
      totalUpdated: 0,
    };

    // Process each week
    for (const week of weeks) {
      const employees = await getAllEmployees(tenantId);
      const attendances = await getAttendanceRecords(tenantId, week.start, week.end);

      // Group attendance by employee
      const attendanceByEmployee = new Map<string, any[]>();
      for (const att of attendances) {
        const empId = att.employeeId?.toString();
        if (empId) {
          if (!attendanceByEmployee.has(empId)) {
            attendanceByEmployee.set(empId, []);
          }
          attendanceByEmployee.get(empId)!.push(att);
        }
      }

      for (const employee of employees) {
        const empId = employee._id.toString();
        const empAttendances = attendanceByEmployee.get(empId) || [];

        const dailyHours: Record<string, number> = {
          monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
          friday: 0, saturday: 0, sunday: 0,
        };

        for (const att of empAttendances) {
          const attDate = new Date(att.date);
          const dayName = getDayOfWeek(attDate);
          let hours = 0;

          if (att.checkIn && att.checkOut) {
            hours = calculateHours(att.checkIn, att.checkOut);
          } else if (att.totalHours || att.workingHours) {
            hours = Number(att.totalHours || att.workingHours) || 0;
          } else if (att.status === 'present' || att.status === 'Present') {
            hours = 8;
          }

          dailyHours[dayName] += hours;
        }

        const totalHours = Object.values(dailyHours).reduce((sum, h) => sum + h, 0);

        const entry = {
          projectId: null,
          projectCode: 'GENERAL',
          projectName: 'General Work',
          description: 'Auto-generated from attendance',
          ...dailyHours,
          totalHours: Math.round(totalHours * 100) / 100,
          isBillable: true,
        };

        let timesheet = await Timesheet.findOne({
          tenantId,
          employeeId: employee._id,
          weekStartDate: week.start,
        });

        if (timesheet) {
          timesheet.entries = [entry];
          timesheet.totalHours = totalHours;
          timesheet.regularHours = Math.min(totalHours, 40);
          timesheet.overtimeHours = Math.max(0, totalHours - 40);
          await timesheet.save();
          results.totalUpdated++;
        } else {
          timesheet = new Timesheet({
            tenantId,
            employeeId: employee._id,
            weekStartDate: week.start,
            weekEndDate: week.end,
            weekNumber: week.weekNumber,
            month: targetMonth,
            year: targetYear,
            periodType: 'weekly',
            entries: [entry],
            totalHours,
            regularHours: Math.min(totalHours, 40),
            overtimeHours: Math.max(0, totalHours - 40),
            billableHours: totalHours,
            nonBillableHours: 0,
            status: 'draft',
          });
          await timesheet.save();
          results.totalCreated++;
        }
      }

      results.weeksProcessed++;
    }

    res.json({
      success: true,
      message: `Synced timesheets for ${results.weeksProcessed} weeks in ${targetMonth}/${targetYear}`,
      data: results,
    });
  } catch (error: any) {
    console.error('[Timesheet Service] Error syncing timesheets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
