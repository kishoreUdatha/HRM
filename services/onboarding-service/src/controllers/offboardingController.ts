import { Request, Response } from 'express';
import Offboarding from '../models/Offboarding';
import OffboardingTemplate from '../models/OffboardingTemplate';
import mongoose from 'mongoose';

// Template Controllers
export const createOffboardingTemplate = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const template = new OffboardingTemplate({
      ...req.body,
      tenantId,
      createdBy: req.body.userId,
    });
    await template.save();
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffboardingTemplates = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const templates = await OffboardingTemplate.find({ tenantId, isActive: true });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOffboardingTemplate = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const template = await OffboardingTemplate.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Offboarding Controllers
export const initiateOffboarding = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const {
      employeeId,
      separationType,
      resignationDate,
      lastWorkingDate,
      noticePeriodDays,
      templateId,
    } = req.body;

    // Check if offboarding already exists
    const existing = await Offboarding.findOne({
      tenantId,
      employeeId,
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Active offboarding already exists for this employee',
      });
    }

    // Get template if provided
    let tasks: any[] = [];
    let template = null;

    if (templateId) {
      template = await OffboardingTemplate.findOne({ _id: templateId, tenantId });
      if (template) {
        const lwdDate = new Date(lastWorkingDate);
        tasks = template.tasks.map(task => ({
          taskId: new mongoose.Types.ObjectId(),
          title: task.title,
          description: task.description,
          category: task.category,
          assigneeType: task.assigneeType,
          dueDate: new Date(lwdDate.getTime() - task.daysBeforeLWD * 24 * 60 * 60 * 1000),
          status: 'pending',
          isMandatory: task.isMandatory,
        }));
      }
    }

    // Default clearance departments
    const clearance = [
      { department: 'IT', status: 'pending' },
      { department: 'Finance', status: 'pending' },
      { department: 'HR', status: 'pending' },
      { department: 'Admin', status: 'pending' },
    ];

    // Default documents to generate
    const documents = [
      { type: 'resignation_letter', name: 'Resignation Letter', status: 'pending' },
      { type: 'acceptance_letter', name: 'Resignation Acceptance', status: 'pending' },
      { type: 'experience_letter', name: 'Experience Letter', status: 'pending' },
      { type: 'relieving_letter', name: 'Relieving Letter', status: 'pending' },
      { type: 'fnf_statement', name: 'Full & Final Statement', status: 'pending' },
    ];

    const offboarding = new Offboarding({
      tenantId,
      employeeId,
      separationType,
      resignationDate,
      lastWorkingDate,
      noticePeriodDays: noticePeriodDays || 0,
      tasks,
      clearance,
      documents,
      status: 'initiated',
      initiatedBy: req.body.userId,
      finalSettlement: {
        status: 'pending',
      },
    });

    await offboarding.save();
    res.status(201).json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffboardings = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, separationType, page = 1, limit = 10 } = req.query;

    const query: any = { tenantId };
    if (status) query.status = status;
    if (separationType) query.separationType = separationType;

    const skip = (Number(page) - 1) * Number(limit);

    const [offboardings, total] = await Promise.all([
      Offboarding.find(query)
        .sort({ lastWorkingDate: 1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('employeeId', 'firstName lastName email employeeCode'),
      Offboarding.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: offboardings,
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

export const getOffboardingById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const offboarding = await Offboarding.findOne({ _id: id, tenantId })
      .populate('employeeId');

    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffboardingByEmployee = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const offboarding = await Offboarding.findOne({
      tenantId,
      employeeId,
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOffboarding = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const offboarding = await Offboarding.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, taskId } = req.params;
    const { status, notes, attachments, assigneeId } = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    const task = offboarding.tasks.find(t => t.taskId.toString() === taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedDate = new Date();
    }
    if (notes) task.notes = notes;
    if (attachments) task.attachments = attachments;
    if (assigneeId) task.assigneeId = assigneeId;

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const conductExitInterview = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const exitInterviewData = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    offboarding.exitInterview = {
      ...exitInterviewData,
      conductedDate: new Date(),
    };
    offboarding.status = 'clearance';

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAssetReturn = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, assetIndex } = req.params;
    const { returnStatus, condition, remarks } = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    const index = parseInt(assetIndex);
    if (index >= offboarding.assetReturn.length) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    offboarding.assetReturn[index].returnStatus = returnStatus;
    offboarding.assetReturn[index].condition = condition;
    offboarding.assetReturn[index].remarks = remarks;
    if (returnStatus === 'returned') {
      offboarding.assetReturn[index].returnDate = new Date();
    }

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClearance = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, department } = req.params;
    const { status, remarks, approvedBy } = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    const clearanceItem = offboarding.clearance.find(c => c.department === department);
    if (!clearanceItem) {
      return res.status(404).json({ success: false, message: 'Clearance department not found' });
    }

    clearanceItem.status = status;
    clearanceItem.remarks = remarks;
    if (status === 'approved') {
      clearanceItem.approvedBy = approvedBy;
      clearanceItem.approvedAt = new Date();
    }

    // Check if all clearances are approved
    const allApproved = offboarding.clearance.every(c => c.status === 'approved');
    if (allApproved) {
      offboarding.status = 'settlement';
    }

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokeAccess = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, accessIndex } = req.params;
    const { revokedBy } = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    const index = parseInt(accessIndex);
    if (index >= offboarding.accessRevocation.length) {
      return res.status(404).json({ success: false, message: 'Access item not found' });
    }

    offboarding.accessRevocation[index].status = 'revoked';
    offboarding.accessRevocation[index].revokedAt = new Date();
    offboarding.accessRevocation[index].revokedBy = revokedBy;

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const calculateFinalSettlement = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const settlementData = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    const netPayable =
      (settlementData.basicSalary || 0) +
      (settlementData.leaveEncashment || 0) +
      (settlementData.bonus || 0) +
      (settlementData.gratuity || 0) +
      (settlementData.otherEarnings || 0) -
      (settlementData.deductions || 0) -
      (settlementData.recoveries || 0);

    offboarding.finalSettlement = {
      ...settlementData,
      netPayable,
      status: 'calculated',
    };

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processSettlement = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { paymentReference } = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    offboarding.finalSettlement.status = 'paid';
    offboarding.finalSettlement.processedAt = new Date();
    offboarding.finalSettlement.paymentReference = paymentReference;

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateDocument = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, documentType } = req.params;
    const { url } = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    const doc = offboarding.documents.find(d => d.type === documentType);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document type not found' });
    }

    doc.url = url;
    doc.generatedAt = new Date();
    doc.status = 'generated';

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeOffboarding = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { rehireEligibility, rehireRemarks } = req.body;

    const offboarding = await Offboarding.findOne({ _id: id, tenantId });
    if (!offboarding) {
      return res.status(404).json({ success: false, message: 'Offboarding not found' });
    }

    // Validate all clearances are approved
    const pendingClearances = offboarding.clearance.filter(c => c.status !== 'approved');
    if (pendingClearances.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete. Pending clearances exist.',
        pendingClearances,
      });
    }

    offboarding.status = 'completed';
    offboarding.completedAt = new Date();
    offboarding.rehireEligibility = rehireEligibility;
    offboarding.rehireRemarks = rehireRemarks;

    await offboarding.save();
    res.json({ success: true, data: offboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffboardingStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const query: any = { tenantId: new mongoose.Types.ObjectId(tenantId) };
    if (startDate && endDate) {
      query.lastWorkingDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const stats = await Offboarding.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$separationType',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = await Offboarding.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Exit interview ratings average
    const ratingsAvg = await Offboarding.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          'exitInterview.rating': { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgWorkEnvironment: { $avg: '$exitInterview.rating.workEnvironment' },
          avgManagement: { $avg: '$exitInterview.rating.management' },
          avgCompensation: { $avg: '$exitInterview.rating.compensation' },
          avgGrowth: { $avg: '$exitInterview.rating.growthOpportunities' },
          avgWorkLife: { $avg: '$exitInterview.rating.workLifeBalance' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        separationTypeStats: stats,
        statusStats,
        exitInterviewRatings: ratingsAvg[0] || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
