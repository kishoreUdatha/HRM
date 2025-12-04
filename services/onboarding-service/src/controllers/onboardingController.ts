import { Request, Response } from 'express';
import Onboarding from '../models/Onboarding';
import OnboardingTemplate from '../models/OnboardingTemplate';
import mongoose from 'mongoose';

// Template Controllers
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const template = new OnboardingTemplate({
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

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { isActive, departmentId } = req.query;

    const query: any = { tenantId };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (departmentId) query.departmentId = departmentId;

    const templates = await OnboardingTemplate.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const template = await OnboardingTemplate.findOne({ _id: id, tenantId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const template = await OnboardingTemplate.findOneAndUpdate(
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

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const template = await OnboardingTemplate.findOneAndDelete({ _id: id, tenantId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Onboarding Controllers
export const initiateOnboarding = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, templateId, startDate, buddyId, mentorId, hrContactId } = req.body;

    // Check if onboarding already exists
    const existing = await Onboarding.findOne({ tenantId, employeeId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Onboarding already exists for this employee' });
    }

    // Get template
    const template = await OnboardingTemplate.findOne({ _id: templateId, tenantId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Create tasks from template
    const tasks = template.tasks.map(task => ({
      taskId: new mongoose.Types.ObjectId(),
      title: task.title,
      description: task.description,
      category: task.category,
      assigneeType: task.assigneeType,
      dueDate: new Date(new Date(startDate).getTime() + task.dueDay * 24 * 60 * 60 * 1000),
      status: 'pending',
      isMandatory: task.isMandatory,
    }));

    const expectedEndDate = new Date(new Date(startDate).getTime() + template.probationDays * 24 * 60 * 60 * 1000);

    const onboarding = new Onboarding({
      tenantId,
      employeeId,
      templateId,
      startDate,
      expectedEndDate,
      tasks,
      buddyId,
      mentorId,
      hrContactId,
      status: 'not_started',
      currentPhase: 'pre_boarding',
      createdBy: req.body.userId,
    });

    await onboarding.save();
    res.status(201).json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardings = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, currentPhase, page = 1, limit = 10 } = req.query;

    const query: any = { tenantId };
    if (status) query.status = status;
    if (currentPhase) query.currentPhase = currentPhase;

    const skip = (Number(page) - 1) * Number(limit);

    const [onboardings, total] = await Promise.all([
      Onboarding.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('employeeId', 'firstName lastName email')
        .populate('buddyId', 'firstName lastName')
        .populate('mentorId', 'firstName lastName'),
      Onboarding.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: onboardings,
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

export const getOnboardingById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const onboarding = await Onboarding.findOne({ _id: id, tenantId })
      .populate('employeeId')
      .populate('buddyId', 'firstName lastName email')
      .populate('mentorId', 'firstName lastName email')
      .populate('templateId');

    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }
    res.json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingByEmployee = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const onboarding = await Onboarding.findOne({ tenantId, employeeId })
      .populate('buddyId', 'firstName lastName email')
      .populate('mentorId', 'firstName lastName email');

    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }
    res.json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOnboarding = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const onboarding = await Onboarding.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );
    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }
    res.json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, taskId } = req.params;
    const { status, notes, attachments, formData, assigneeId } = req.body;

    const onboarding = await Onboarding.findOne({ _id: id, tenantId });
    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }

    const task = onboarding.tasks.find(t => t.taskId.toString() === taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedDate = new Date();
    }
    if (notes) task.notes = notes;
    if (attachments) task.attachments = attachments;
    if (formData) task.formData = formData;
    if (assigneeId) task.assigneeId = assigneeId;

    await onboarding.save();
    res.json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCheckpointFeedback = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { day, name, feedback, rating, conductedBy } = req.body;

    const onboarding = await Onboarding.findOne({ _id: id, tenantId });
    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }

    onboarding.checkpointFeedback.push({
      day,
      name,
      feedback,
      rating,
      completedAt: new Date(),
      conductedBy,
    });

    await onboarding.save();
    res.json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDocumentStatus = async (req: Request, res: Response) => {
  try {
    const { tenantId, id, documentIndex } = req.params;
    const { status, url, verifiedBy } = req.body;

    const onboarding = await Onboarding.findOne({ _id: id, tenantId });
    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }

    const docIndex = parseInt(documentIndex);
    if (docIndex >= onboarding.documentsCollected.length) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    onboarding.documentsCollected[docIndex].status = status;
    if (url) onboarding.documentsCollected[docIndex].url = url;
    if (status === 'verified') {
      onboarding.documentsCollected[docIndex].verifiedBy = verifiedBy;
      onboarding.documentsCollected[docIndex].verifiedAt = new Date();
    }

    await onboarding.save();
    res.json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeOnboarding = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;

    const onboarding = await Onboarding.findOne({ _id: id, tenantId });
    if (!onboarding) {
      return res.status(404).json({ success: false, message: 'Onboarding not found' });
    }

    // Check if all mandatory tasks are completed
    const pendingMandatory = onboarding.tasks.filter(
      t => t.isMandatory && t.status !== 'completed' && t.status !== 'skipped'
    );

    if (pendingMandatory.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete onboarding. Pending mandatory tasks exist.',
        pendingTasks: pendingMandatory,
      });
    }

    onboarding.status = 'completed';
    onboarding.currentPhase = 'completed';
    onboarding.actualEndDate = new Date();

    await onboarding.save();
    res.json({ success: true, data: onboarding });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const stats = await Onboarding.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const phaseStats = await Onboarding.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'in_progress' } },
      {
        $group: {
          _id: '$currentPhase',
          count: { $sum: 1 },
        },
      },
    ]);

    const avgProgress = await Onboarding.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'in_progress' } },
      {
        $group: {
          _id: null,
          avgProgress: { $avg: '$overallProgress' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        statusStats: stats,
        phaseStats,
        averageProgress: avgProgress[0]?.avgProgress || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
