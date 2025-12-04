import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import PerformanceReview from '../models/PerformanceReview';
import mongoose from 'mongoose';

// ==================== PERFORMANCE REVIEW CONTROLLERS ====================

export const createPerformanceReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const review = new PerformanceReview({
      ...req.body,
      tenantId,
      reviewerId: userId,
    });

    await review.save();

    res.status(201).json({
      success: true,
      message: 'Performance review created successfully',
      data: { review },
    });
  } catch (error) {
    console.error('[Employee Service] Create performance review error:', error);
    res.status(500).json({ success: false, message: 'Failed to create performance review' });
  }
};

export const getPerformanceReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, reviewerId, status, type, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (reviewerId) query.reviewerId = reviewerId;
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      PerformanceReview.find(query)
        .populate('employeeId', 'firstName lastName employeeId')
        .populate('reviewerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      PerformanceReview.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get performance reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance reviews' });
  }
};

export const getPerformanceReviewById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const review = await PerformanceReview.findOne({ _id: id, tenantId })
      .populate('employeeId', 'firstName lastName employeeId departmentId')
      .populate('reviewerId', 'firstName lastName')
      .lean();

    if (!review) {
      res.status(404).json({ success: false, message: 'Performance review not found' });
      return;
    }

    res.status(200).json({ success: true, data: { review } });
  } catch (error) {
    console.error('[Employee Service] Get performance review error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance review' });
  }
};

export const updatePerformanceReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const review = await PerformanceReview.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!review) {
      res.status(404).json({ success: false, message: 'Performance review not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Performance review updated',
      data: { review },
    });
  } catch (error) {
    console.error('[Employee Service] Update performance review error:', error);
    res.status(500).json({ success: false, message: 'Failed to update performance review' });
  }
};

export const submitSelfReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { selfRating, selfComments, goals, competencies } = req.body;

    const review = await PerformanceReview.findOne({ _id: id, tenantId });
    if (!review) {
      res.status(404).json({ success: false, message: 'Performance review not found' });
      return;
    }

    review.selfRating = selfRating;
    review.selfComments = selfComments;
    if (goals) review.goals = goals;
    if (competencies) review.competencies = competencies;
    review.status = 'manager_review';
    review.submittedAt = new Date();

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Self review submitted',
      data: { review },
    });
  } catch (error) {
    console.error('[Employee Service] Submit self review error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit self review' });
  }
};

export const submitManagerReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const {
      managerRating,
      finalRating,
      managerComments,
      goals,
      competencies,
      strengths,
      areasOfImprovement,
      developmentPlan,
      promotionRecommendation,
      salaryRecommendation
    } = req.body;

    const review = await PerformanceReview.findOne({ _id: id, tenantId });
    if (!review) {
      res.status(404).json({ success: false, message: 'Performance review not found' });
      return;
    }

    review.managerRating = managerRating;
    review.finalRating = finalRating || managerRating;
    review.managerComments = managerComments;
    if (goals) review.goals = goals;
    if (competencies) review.competencies = competencies;
    if (strengths) review.strengths = strengths;
    if (areasOfImprovement) review.areasOfImprovement = areasOfImprovement;
    if (developmentPlan) review.developmentPlan = developmentPlan;
    if (promotionRecommendation !== undefined) review.promotionRecommendation = promotionRecommendation;
    if (salaryRecommendation) review.salaryRecommendation = salaryRecommendation;
    review.status = 'completed';
    review.completedAt = new Date();

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Manager review submitted',
      data: { review },
    });
  } catch (error) {
    console.error('[Employee Service] Submit manager review error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit manager review' });
  }
};

export const acknowledgeReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { employeeFeedback } = req.body;

    const review = await PerformanceReview.findOneAndUpdate(
      { _id: id, tenantId, status: 'completed' },
      {
        employeeFeedback,
        acknowledgedAt: new Date(),
      },
      { new: true }
    );

    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found or not completed' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Review acknowledged',
      data: { review },
    });
  } catch (error) {
    console.error('[Employee Service] Acknowledge review error:', error);
    res.status(500).json({ success: false, message: 'Failed to acknowledge review' });
  }
};

export const getEmployeePerformanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const reviews = await PerformanceReview.find({
      tenantId,
      employeeId,
      status: 'completed'
    })
      .select('period type finalRating completedAt')
      .sort({ completedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    console.error('[Employee Service] Get performance history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance history' });
  }
};

export const getPerformanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const [totalReviews, byStatus, avgRating, ratingDistribution] = await Promise.all([
      PerformanceReview.countDocuments({ tenantId }),
      PerformanceReview.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      PerformanceReview.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'completed' } },
        { $group: { _id: null, avgRating: { $avg: '$finalRating' } } },
      ]),
      PerformanceReview.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'completed' } },
        { $group: { _id: '$finalRating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalReviews,
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        averageRating: avgRating[0]?.avgRating || 0,
        ratingDistribution: Object.fromEntries(ratingDistribution.map(r => [r._id, r.count])),
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get performance stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance stats' });
  }
};
