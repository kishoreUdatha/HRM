import { Request, Response } from 'express';
import Grievance from '../models/Grievance';
import mongoose from 'mongoose';

const generateCaseNumber = async (tenantId: string): Promise<string> => {
  const count = await Grievance.countDocuments({ tenantId });
  return `GRV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// Submit grievance
export const submitGrievance = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const caseNumber = await generateCaseNumber(tenantId);

    const grievance = new Grievance({
      ...req.body,
      tenantId,
      caseNumber,
      timeline: [{ action: 'Grievance submitted', by: req.body.reportedBy, at: new Date() }],
    });
    await grievance.save();
    res.status(201).json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get grievances
export const getGrievances = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, category, priority, assignedTo, reportedBy, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (reportedBy) query.reportedBy = reportedBy;

    const skip = (Number(page) - 1) * Number(limit);
    const [grievances, total] = await Promise.all([
      Grievance.find(query)
        .populate('reportedBy', 'firstName lastName')
        .populate('assignedTo', 'firstName lastName')
        .select('-investigation.interviews -evidence')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Grievance.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: grievances,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get grievance by ID
export const getGrievanceById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const grievance = await Grievance.findOne({ _id: id, tenantId })
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('involvedParties.employeeId', 'firstName lastName');

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign grievance
export const assignGrievance = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { assignedTo, assignedBy, notes } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId },
      {
        assignedTo,
        assignedAt: new Date(),
        status: 'under_review',
        $push: { timeline: { action: 'Grievance assigned', by: assignedBy, at: new Date(), notes } },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start investigation
export const startInvestigation = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { investigator, initiatedBy } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId },
      {
        status: 'investigating',
        investigation: { startDate: new Date(), investigator, interviews: [] },
        $push: { timeline: { action: 'Investigation started', by: initiatedBy, at: new Date() } },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add investigation interview
export const addInterview = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { employeeId, notes, conductedBy } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId, status: 'investigating' },
      {
        $push: {
          'investigation.interviews': { employeeId, date: new Date(), notes },
          timeline: { action: `Interview conducted with employee`, by: conductedBy, at: new Date() },
        },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found or not under investigation' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit investigation findings
export const submitFindings = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { findings, recommendations, submittedBy } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId, status: 'investigating' },
      {
        status: 'pending_action',
        'investigation.endDate': new Date(),
        'investigation.findings': findings,
        'investigation.recommendations': recommendations,
        $push: { timeline: { action: 'Investigation findings submitted', by: submittedBy, at: new Date() } },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found or not under investigation' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Resolve grievance
export const resolveGrievance = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { description, actionsTaken, resolvedBy } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId },
      {
        status: 'resolved',
        resolution: { date: new Date(), description, actionsTaken, resolvedBy },
        $push: { timeline: { action: 'Grievance resolved', by: resolvedBy, at: new Date(), notes: description } },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Close grievance
export const closeGrievance = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { closedBy, satisfactionRating } = req.body;

    const update: any = {
      status: 'closed',
      $push: { timeline: { action: 'Grievance closed', by: closedBy, at: new Date() } },
    };
    if (satisfactionRating) update['resolution.satisfactionRating'] = satisfactionRating;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId, status: 'resolved' },
      update,
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found or not resolved' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Escalate grievance
export const escalateGrievance = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { escalatedTo, reason, escalatedBy } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId },
      {
        status: 'escalated',
        $push: {
          escalationHistory: { escalatedTo, escalatedAt: new Date(), reason },
          timeline: { action: 'Grievance escalated', by: escalatedBy, at: new Date(), notes: reason },
        },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Withdraw grievance
export const withdrawGrievance = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { withdrawnBy, reason } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId, reportedBy: withdrawnBy },
      {
        status: 'withdrawn',
        $push: { timeline: { action: 'Grievance withdrawn', by: withdrawnBy, at: new Date(), notes: reason } },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found or unauthorized' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add evidence
export const addEvidence = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { name, url, type, addedBy } = req.body;

    const grievance = await Grievance.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $push: {
          evidence: { name, url, type, uploadedAt: new Date() },
          timeline: { action: 'Evidence added', by: addedBy, at: new Date(), notes: name },
        },
      },
      { new: true }
    );

    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
    res.json({ success: true, data: grievance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my grievances (for reporter)
export const getMyGrievances = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const grievances = await Grievance.find({ tenantId, reportedBy: employeeId })
      .select('caseNumber subject category status priority createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: grievances });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get stats
export const getGrievanceStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const [byStatus, byCategory, bySeverity, avgResolutionTime] = await Promise.all([
      Grievance.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Grievance.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Grievance.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Grievance.aggregate([
        { $match: { tenantId: tenantObjectId, status: { $in: ['resolved', 'closed'] }, 'resolution.date': { $exists: true } } },
        { $project: { resolutionDays: { $divide: [{ $subtract: ['$resolution.date', '$createdAt'] }, 1000 * 60 * 60 * 24] } } },
        { $group: { _id: null, avgDays: { $avg: '$resolutionDays' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: { byStatus, byCategory, bySeverity, avgResolutionDays: avgResolutionTime[0]?.avgDays || 0 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
