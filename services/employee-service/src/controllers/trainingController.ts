import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Training from '../models/Training';
import TrainingEnrollment from '../models/TrainingEnrollment';
import mongoose from 'mongoose';

// ==================== TRAINING CONTROLLERS ====================

export const createTraining = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const training = new Training({
      ...req.body,
      tenantId,
      createdBy: userId,
    });

    await training.save();

    res.status(201).json({
      success: true,
      message: 'Training program created successfully',
      data: { training },
    });
  } catch (error: unknown) {
    console.error('[Employee Service] Create training error:', error);
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({ success: false, message: 'Training code already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create training program' });
  }
};

export const getTrainings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, category, type, isMandatory, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.type = type;
    if (isMandatory !== undefined) query.isMandatory = isMandatory === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [trainings, total] = await Promise.all([
      Training.find(query)
        .populate('departmentIds', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Training.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        trainings,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get trainings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trainings' });
  }
};

export const getTrainingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const training = await Training.findOne({ _id: id, tenantId })
      .populate('departmentIds', 'name')
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!training) {
      res.status(404).json({ success: false, message: 'Training program not found' });
      return;
    }

    res.status(200).json({ success: true, data: { training } });
  } catch (error) {
    console.error('[Employee Service] Get training error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training' });
  }
};

export const updateTraining = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const training = await Training.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!training) {
      res.status(404).json({ success: false, message: 'Training program not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Training program updated',
      data: { training },
    });
  } catch (error) {
    console.error('[Employee Service] Update training error:', error);
    res.status(500).json({ success: false, message: 'Failed to update training' });
  }
};

export const deleteTraining = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    // Check if there are enrollments
    const enrollmentCount = await TrainingEnrollment.countDocuments({ trainingId: id });
    if (enrollmentCount > 0) {
      res.status(400).json({ success: false, message: 'Cannot delete training with existing enrollments' });
      return;
    }

    const training = await Training.findOneAndDelete({ _id: id, tenantId });

    if (!training) {
      res.status(404).json({ success: false, message: 'Training program not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Training program deleted' });
  } catch (error) {
    console.error('[Employee Service] Delete training error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete training' });
  }
};

// ==================== ENROLLMENT CONTROLLERS ====================

export const enrollEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { trainingId, employeeId } = req.body;

    // Verify training exists and has capacity
    const training = await Training.findOne({ _id: trainingId, tenantId });
    if (!training) {
      res.status(404).json({ success: false, message: 'Training program not found' });
      return;
    }

    if (training.maxParticipants && training.enrollmentCount >= training.maxParticipants) {
      res.status(400).json({ success: false, message: 'Training is at full capacity' });
      return;
    }

    const enrollment = new TrainingEnrollment({
      tenantId,
      trainingId,
      employeeId,
      enrolledBy: userId,
    });

    await enrollment.save();

    // Update enrollment count
    await Training.findByIdAndUpdate(trainingId, { $inc: { enrollmentCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Employee enrolled successfully',
      data: { enrollment },
    });
  } catch (error: unknown) {
    console.error('[Employee Service] Enroll employee error:', error);
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({ success: false, message: 'Employee already enrolled in this training' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to enroll employee' });
  }
};

export const getEnrollments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { trainingId, employeeId, status, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (trainingId) query.trainingId = trainingId;
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [enrollments, total] = await Promise.all([
      TrainingEnrollment.find(query)
        .populate('trainingId', 'title code category type')
        .populate('employeeId', 'firstName lastName employeeId')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TrainingEnrollment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        enrollments,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get enrollments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch enrollments' });
  }
};

export const updateEnrollmentProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { progress, status } = req.body;

    const enrollment = await TrainingEnrollment.findOne({ _id: id, tenantId });
    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Enrollment not found' });
      return;
    }

    if (progress !== undefined) enrollment.progress = progress;
    if (status) enrollment.status = status;

    // Auto-update status based on progress
    if (progress === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();

      // Update completion count
      await Training.findByIdAndUpdate(enrollment.trainingId, { $inc: { completionCount: 1 } });
    } else if (progress > 0 && enrollment.status === 'enrolled') {
      enrollment.status = 'in_progress';
      enrollment.startedAt = new Date();
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: 'Enrollment progress updated',
      data: { enrollment },
    });
  } catch (error) {
    console.error('[Employee Service] Update enrollment progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
};

export const completeTraining = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { score, certificateUrl, feedback, rating } = req.body;

    const enrollment = await TrainingEnrollment.findOne({ _id: id, tenantId });
    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Enrollment not found' });
      return;
    }

    enrollment.status = 'completed';
    enrollment.progress = 100;
    enrollment.completedAt = new Date();
    if (score !== undefined) enrollment.score = score;
    if (certificateUrl) enrollment.certificateUrl = certificateUrl;
    if (feedback) enrollment.feedback = feedback;
    if (rating) enrollment.rating = rating;

    await enrollment.save();

    // Update training stats
    const training = await Training.findById(enrollment.trainingId);
    if (training) {
      training.completionCount += 1;

      // Update average rating
      if (rating) {
        const enrollments = await TrainingEnrollment.find({
          trainingId: enrollment.trainingId,
          rating: { $exists: true }
        });
        const totalRating = enrollments.reduce((sum, e) => sum + (e.rating || 0), 0) + rating;
        training.averageRating = totalRating / (enrollments.length + 1);
      }

      await training.save();
    }

    res.status(200).json({
      success: true,
      message: 'Training completed',
      data: { enrollment },
    });
  } catch (error) {
    console.error('[Employee Service] Complete training error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete training' });
  }
};

export const dropEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const enrollment = await TrainingEnrollment.findOneAndUpdate(
      { _id: id, tenantId, status: { $nin: ['completed', 'dropped'] } },
      { status: 'dropped' },
      { new: true }
    );

    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Enrollment not found or cannot be dropped' });
      return;
    }

    // Update enrollment count
    await Training.findByIdAndUpdate(enrollment.trainingId, { $inc: { enrollmentCount: -1 } });

    res.status(200).json({
      success: true,
      message: 'Enrollment dropped',
      data: { enrollment },
    });
  } catch (error) {
    console.error('[Employee Service] Drop enrollment error:', error);
    res.status(500).json({ success: false, message: 'Failed to drop enrollment' });
  }
};

export const getTrainingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const [
      totalTrainings,
      activeTrainings,
      totalEnrollments,
      completedEnrollments,
      byCategory,
      byType
    ] = await Promise.all([
      Training.countDocuments({ tenantId }),
      Training.countDocuments({ tenantId, status: { $in: ['scheduled', 'in_progress'] } }),
      TrainingEnrollment.countDocuments({ tenantId }),
      TrainingEnrollment.countDocuments({ tenantId, status: 'completed' }),
      Training.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Training.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTrainings,
        activeTrainings,
        totalEnrollments,
        completedEnrollments,
        completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments * 100).toFixed(1) : 0,
        byCategory: Object.fromEntries(byCategory.map(c => [c._id, c.count])),
        byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get training stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch training stats' });
  }
};
