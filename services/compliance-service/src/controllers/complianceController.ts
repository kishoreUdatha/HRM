import { Request, Response } from 'express';
import Policy from '../models/Policy';
import PolicyAcknowledgement from '../models/PolicyAcknowledgement';
import ComplianceTraining from '../models/ComplianceTraining';
import WorkPermit from '../models/WorkPermit';
import mongoose from 'mongoose';

// Policy Controllers
export const createPolicy = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const policy = new Policy({ ...req.body, tenantId, createdBy: req.body.userId });
    await policy.save();
    res.status(201).json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPolicies = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, status } = req.query;
    const query: any = { tenantId };
    if (category) query.category = category;
    if (status) query.status = status;
    const policies = await Policy.find(query).sort({ category: 1, name: 1 });
    res.json({ success: true, data: policies });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPolicyById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const policy = await Policy.findOne({ _id: id, tenantId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const policy = await Policy.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publishPolicy = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { publishedBy } = req.body;
    const policy = await Policy.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'published', publishedBy, publishedAt: new Date() },
      { new: true }
    );
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acknowledgePolicy = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { employeeId, ipAddress, userAgent, signature, comments } = req.body;

    const policy = await Policy.findOne({ _id: id, tenantId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    const ack = new PolicyAcknowledgement({
      tenantId, policyId: id, employeeId, ipAddress, userAgent, signature, comments,
      version: policy.version,
    });
    await ack.save();

    await Policy.findByIdAndUpdate(id, { $inc: { totalAcknowledgements: 1, pendingAcknowledgements: -1 } });

    res.status(201).json({ success: true, data: ack });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Already acknowledged' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAcknowledgements = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const acks = await PolicyAcknowledgement.find({ tenantId, policyId: id })
      .populate('employeeId', 'firstName lastName email');
    res.json({ success: true, data: acks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPendingPolicies = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const acknowledged = await PolicyAcknowledgement.find({ tenantId, employeeId }).distinct('policyId');
    const pending = await Policy.find({
      tenantId,
      status: 'published',
      acknowledgementRequired: true,
      _id: { $nin: acknowledged },
    });
    res.json({ success: true, data: pending });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Compliance Training Controllers
export const createTraining = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const training = new ComplianceTraining({ ...req.body, tenantId, createdBy: req.body.userId });
    await training.save();
    res.status(201).json({ success: true, data: training });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTrainings = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, status, isMandatory } = req.query;
    const query: any = { tenantId };
    if (category) query.category = category;
    if (status) query.status = status;
    if (isMandatory !== undefined) query.isMandatory = isMandatory === 'true';
    const trainings = await ComplianceTraining.find(query).sort({ name: 1 });
    res.json({ success: true, data: trainings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTraining = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const training = await ComplianceTraining.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    res.json({ success: true, data: training });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Work Permit Controllers
export const createWorkPermit = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const permit = new WorkPermit({ ...req.body, tenantId, createdBy: req.body.userId });
    // Set up default alerts
    permit.alerts = [
      { daysBeforeExpiry: 90, notified: false },
      { daysBeforeExpiry: 60, notified: false },
      { daysBeforeExpiry: 30, notified: false },
      { daysBeforeExpiry: 7, notified: false },
    ];
    await permit.save();
    res.status(201).json({ success: true, data: permit });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkPermits = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, status, expiringWithin } = req.query;
    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (expiringWithin) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(expiringWithin as string));
      query.expiryDate = { $lte: futureDate, $gte: new Date() };
    }
    const permits = await WorkPermit.find(query)
      .populate('employeeId', 'firstName lastName email')
      .sort({ expiryDate: 1 });
    res.json({ success: true, data: permits });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWorkPermit = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const permit = await WorkPermit.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!permit) return res.status(404).json({ success: false, message: 'Permit not found' });
    res.json({ success: true, data: permit });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const renewWorkPermit = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { newExpiryDate, processedBy } = req.body;

    const permit = await WorkPermit.findOne({ _id: id, tenantId });
    if (!permit) return res.status(404).json({ success: false, message: 'Permit not found' });

    permit.renewalHistory.push({
      previousExpiryDate: permit.expiryDate,
      renewedAt: new Date(),
      newExpiryDate: new Date(newExpiryDate),
      processedBy,
    });
    permit.expiryDate = new Date(newExpiryDate);
    permit.status = 'valid';
    permit.alerts = permit.alerts.map(a => ({ ...a, notified: false }));

    await permit.save();
    res.json({ success: true, data: permit });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Compliance Stats
export const getComplianceStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [policyStats, trainingStats, permitStats] = await Promise.all([
      Policy.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'published' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            acknowledged: { $sum: '$totalAcknowledgements' },
            pending: { $sum: '$pendingAcknowledgements' },
          },
        },
      ]),
      ComplianceTraining.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'active' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalEnrollments: { $sum: '$totalEnrollments' },
            totalCompletions: { $sum: '$totalCompletions' },
          },
        },
      ]),
      WorkPermit.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        policies: policyStats[0] || { total: 0, acknowledged: 0, pending: 0 },
        trainings: trainingStats[0] || { total: 0, totalEnrollments: 0, totalCompletions: 0 },
        workPermits: permitStats,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
