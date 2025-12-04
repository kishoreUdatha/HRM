import { Request, Response } from 'express';
import Position from '../models/Position';
import HeadcountPlan from '../models/HeadcountPlan';
import SuccessionPlan from '../models/SuccessionPlan';
import mongoose from 'mongoose';

// Position Controllers
export const createPosition = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const position = new Position({ ...req.body, tenantId });
    await position.save();
    res.status(201).json({ success: true, data: position });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPositions = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { departmentId, isActive, page = 1, limit = 50 } = req.query;
    const query: any = { tenantId };
    if (departmentId) query.departmentId = departmentId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [positions, total] = await Promise.all([
      Position.find(query).populate('departmentId', 'name').populate('reportsTo', 'title').sort({ level: 1, title: 1 }).skip(skip).limit(Number(limit)),
      Position.countDocuments(query),
    ]);
    res.json({ success: true, data: positions, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPositionById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const position = await Position.findOne({ _id: id, tenantId }).populate('departmentId').populate('reportsTo');
    if (!position) return res.status(404).json({ success: false, message: 'Position not found' });
    res.json({ success: true, data: position });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePosition = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const position = await Position.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!position) return res.status(404).json({ success: false, message: 'Position not found' });
    res.json({ success: true, data: position });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHeadcount = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { budgeted, filled } = req.body;
    const position = await Position.findOneAndUpdate(
      { _id: id, tenantId },
      { 'headcount.budgeted': budgeted, 'headcount.filled': filled, 'headcount.vacant': budgeted - filled },
      { new: true }
    );
    if (!position) return res.status(404).json({ success: false, message: 'Position not found' });
    res.json({ success: true, data: position });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Headcount Plan Controllers
export const createHeadcountPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const plan = new HeadcountPlan({ ...req.body, tenantId });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHeadcountPlans = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { fiscalYear, status, departmentId } = req.query;
    const query: any = { tenantId };
    if (fiscalYear) query.fiscalYear = Number(fiscalYear);
    if (status) query.status = status;
    if (departmentId) query.departmentId = departmentId;

    const plans = await HeadcountPlan.find(query).populate('departmentId', 'name').sort({ fiscalYear: -1, createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHeadcountPlanById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const plan = await HeadcountPlan.findOne({ _id: id, tenantId }).populate('departmentId').populate('positions.positionId');
    if (!plan) return res.status(404).json({ success: false, message: 'Headcount plan not found' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHeadcountPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const plan = await HeadcountPlan.findOneAndUpdate({ _id: id, tenantId, status: 'draft' }, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found or not in draft' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitHeadcountPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { submittedBy } = req.body;
    const plan = await HeadcountPlan.findOneAndUpdate(
      { _id: id, tenantId, status: 'draft' },
      { status: 'submitted', submittedBy, submittedAt: new Date() },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found or not in draft' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveHeadcountPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { approvedBy, comments } = req.body;
    const plan = await HeadcountPlan.findOneAndUpdate(
      { _id: id, tenantId, status: 'submitted' },
      {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        $push: { approvalWorkflow: { level: 1, approverId: approvedBy, status: 'approved', actionDate: new Date(), comments } },
      },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found or not submitted' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Succession Plan Controllers
export const createSuccessionPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const plan = new SuccessionPlan({ ...req.body, tenantId });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSuccessionPlans = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { riskLevel, status, positionId } = req.query;
    const query: any = { tenantId };
    if (riskLevel) query.riskLevel = riskLevel;
    if (status) query.status = status;
    if (positionId) query.positionId = positionId;

    const plans = await SuccessionPlan.find(query)
      .populate('positionId', 'title code')
      .populate('currentIncumbent', 'firstName lastName')
      .populate('successors.employeeId', 'firstName lastName')
      .sort({ riskLevel: -1, createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSuccessionPlanById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const plan = await SuccessionPlan.findOne({ _id: id, tenantId })
      .populate('positionId')
      .populate('currentIncumbent', 'firstName lastName email')
      .populate('successors.employeeId', 'firstName lastName')
      .populate('successors.mentorId', 'firstName lastName')
      .populate('talentPool', 'firstName lastName');
    if (!plan) return res.status(404).json({ success: false, message: 'Succession plan not found' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSuccessionPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const plan = await SuccessionPlan.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Succession plan not found' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addSuccessor = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const successorData = req.body;
    const plan = await SuccessionPlan.findOneAndUpdate(
      { _id: id, tenantId },
      { $push: { successors: successorData } },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Succession plan not found' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSuccessor = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, employeeId } = req.params;
    const updateData = req.body;

    const plan = await SuccessionPlan.findOneAndUpdate(
      { _id: id, tenantId, 'successors.employeeId': employeeId },
      { $set: { 'successors.$': { employeeId, ...updateData, lastReviewedAt: new Date() } } },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan or successor not found' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeSuccessor = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, employeeId } = req.params;
    const plan = await SuccessionPlan.findOneAndUpdate(
      { _id: id, tenantId },
      { $pull: { successors: { employeeId } } },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Succession plan not found' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Analytics
export const getWorkforceAnalytics = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const [positionsByDept, vacancies, successionRisk, headcountTrend] = await Promise.all([
      Position.aggregate([
        { $match: { tenantId: tenantObjectId, isActive: true } },
        { $group: { _id: '$departmentId', count: { $sum: 1 }, totalHeadcount: { $sum: '$headcount.budgeted' }, filled: { $sum: '$headcount.filled' } } },
      ]),
      Position.aggregate([
        { $match: { tenantId: tenantObjectId, isActive: true, 'headcount.vacant': { $gt: 0 } } },
        { $project: { title: 1, code: 1, vacant: '$headcount.vacant', departmentId: 1 } },
      ]),
      SuccessionPlan.aggregate([
        { $match: { tenantId: tenantObjectId, status: 'active' } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      ]),
      HeadcountPlan.aggregate([
        { $match: { tenantId: tenantObjectId, status: { $in: ['approved', 'active'] } } },
        { $group: { _id: '$fiscalYear', plannedHires: { $sum: '$summary.plannedHires' }, plannedAttrition: { $sum: '$summary.plannedAttrition' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ success: true, data: { positionsByDept, vacancies, successionRisk, headcountTrend } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrgChart = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { departmentId } = req.query;
    const query: any = { tenantId, isActive: true };
    if (departmentId) query.departmentId = departmentId;

    const positions = await Position.find(query)
      .populate('departmentId', 'name')
      .populate('reportsTo', 'title code')
      .select('title code level reportsTo departmentId headcount');

    res.json({ success: true, data: positions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
