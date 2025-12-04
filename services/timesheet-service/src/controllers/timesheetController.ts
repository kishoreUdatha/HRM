import { Request, Response } from 'express';
import Timesheet from '../models/Timesheet';
import TimeEntry from '../models/TimeEntry';
import Project from '../models/Project';
import mongoose from 'mongoose';

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

// Project Controllers
export const createProject = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
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
    const { tenantId } = req.params;
    const { status, employeeId, isActive } = req.query;

    const query: any = { tenantId };
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (employeeId) {
      query['members.employeeId'] = employeeId;
    }

    const projects = await Project.find(query)
      .populate('managerId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const project = await Project.findOne({ _id: id, tenantId })
      .populate('managerId', 'firstName lastName email')
      .populate('members.employeeId', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
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
    const { tenantId, id } = req.params;
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
    const { tenantId } = req.params;
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
    const { tenantId } = req.params;
    const { employeeId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (startDate && endDate) {
      query.weekStartDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [timesheets, total] = await Promise.all([
      Timesheet.find(query)
        .populate('employeeId', 'firstName lastName email')
        .sort({ weekStartDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Timesheet.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: timesheets,
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
    const { tenantId, id } = req.params;
    const timesheet = await Timesheet.findOne({ _id: id, tenantId })
      .populate('employeeId', 'firstName lastName email')
      .populate('entries.projectId', 'name code');

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }
    res.json({ success: true, data: timesheet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const entryData = req.body;

    const timesheet = await Timesheet.findOne({ _id: id, tenantId, status: 'draft' });
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found or not editable' });
    }

    // Check for duplicate entry on same date/project
    const existingEntry = timesheet.entries.find(
      e => e.date.toDateString() === new Date(entryData.date).toDateString() &&
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
    const { tenantId, id, entryId } = req.params;
    const updateData = req.body;

    const timesheet = await Timesheet.findOne({ _id: id, tenantId, status: 'draft' });
    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found or not editable' });
    }

    const entry = timesheet.entries.id(entryId);
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
    const { tenantId, id, entryId } = req.params;

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
    const { tenantId, id } = req.params;

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
    const { tenantId, id } = req.params;
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
    const { tenantId, id } = req.params;
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
    const { tenantId } = req.params;
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
    const { tenantId, id } = req.params;

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
    const { tenantId } = req.params;
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
    const { tenantId } = req.params;
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
    const { tenantId } = req.params;
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
