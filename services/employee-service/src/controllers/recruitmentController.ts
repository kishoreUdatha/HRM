import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import JobPosting from '../models/JobPosting';
import JobApplication from '../models/JobApplication';

// ==================== JOB POSTING CONTROLLERS ====================

export const createJobPosting = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const jobPosting = new JobPosting({
      ...req.body,
      tenantId,
      postedBy: userId,
    });

    await jobPosting.save();

    res.status(201).json({
      success: true,
      message: 'Job posting created successfully',
      data: { jobPosting },
    });
  } catch (error: unknown) {
    console.error('[Employee Service] Create job posting error:', error);
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({ success: false, message: 'Job code already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create job posting' });
  }
};

export const getJobPostings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, departmentId, employmentType, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (status) query.status = status;
    if (departmentId) query.departmentId = departmentId;
    if (employmentType) query.employmentType = employmentType;

    const skip = (Number(page) - 1) * Number(limit);

    const [jobPostings, total] = await Promise.all([
      JobPosting.find(query)
        .populate('departmentId', 'name')
        .populate('hiringManagerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      JobPosting.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        jobPostings,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get job postings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch job postings' });
  }
};

export const getJobPostingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const jobPosting = await JobPosting.findOne({ _id: id, tenantId })
      .populate('departmentId', 'name')
      .populate('hiringManagerId', 'firstName lastName')
      .lean();

    if (!jobPosting) {
      res.status(404).json({ success: false, message: 'Job posting not found' });
      return;
    }

    res.status(200).json({ success: true, data: { jobPosting } });
  } catch (error) {
    console.error('[Employee Service] Get job posting error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch job posting' });
  }
};

export const updateJobPosting = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const jobPosting = await JobPosting.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!jobPosting) {
      res.status(404).json({ success: false, message: 'Job posting not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Job posting updated',
      data: { jobPosting },
    });
  } catch (error) {
    console.error('[Employee Service] Update job posting error:', error);
    res.status(500).json({ success: false, message: 'Failed to update job posting' });
  }
};

export const publishJobPosting = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const jobPosting = await JobPosting.findOneAndUpdate(
      { _id: id, tenantId, status: 'draft' },
      { status: 'open', postedAt: new Date() },
      { new: true }
    );

    if (!jobPosting) {
      res.status(404).json({ success: false, message: 'Job posting not found or not in draft' });
      return;
    }

    res.status(200).json({ success: true, message: 'Job posting published', data: { jobPosting } });
  } catch (error) {
    console.error('[Employee Service] Publish job posting error:', error);
    res.status(500).json({ success: false, message: 'Failed to publish job posting' });
  }
};

export const closeJobPosting = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const jobPosting = await JobPosting.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'closed', closedAt: new Date() },
      { new: true }
    );

    if (!jobPosting) {
      res.status(404).json({ success: false, message: 'Job posting not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Job posting closed', data: { jobPosting } });
  } catch (error) {
    console.error('[Employee Service] Close job posting error:', error);
    res.status(500).json({ success: false, message: 'Failed to close job posting' });
  }
};

// ==================== JOB APPLICATION CONTROLLERS ====================

export const createJobApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const { jobPostingId } = req.body;

    // Verify job posting exists and is open
    const jobPosting = await JobPosting.findOne({ _id: jobPostingId, tenantId, status: 'open' });
    if (!jobPosting) {
      res.status(400).json({ success: false, message: 'Job posting not found or closed' });
      return;
    }

    const application = new JobApplication({ ...req.body, tenantId });
    await application.save();

    // Update application count
    await JobPosting.findByIdAndUpdate(jobPostingId, { $inc: { applicationsCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application },
    });
  } catch (error) {
    console.error('[Employee Service] Create application error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};

export const getJobApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { jobPostingId, status, source, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (jobPostingId) query.jobPostingId = jobPostingId;
    if (status) query.status = status;
    if (source) query.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      JobApplication.find(query)
        .populate('jobPostingId', 'title code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      JobApplication.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get applications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
};

export const getJobApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const application = await JobApplication.findOne({ _id: id, tenantId })
      .populate('jobPostingId', 'title code departmentId')
      .populate('referredBy', 'firstName lastName')
      .lean();

    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.status(200).json({ success: true, data: { application } });
  } catch (error) {
    console.error('[Employee Service] Get application error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch application' });
  }
};

export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { status, notes, rejectionReason } = req.body;

    const updateData: Record<string, unknown> = { status };
    if (notes) updateData.notes = notes;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;

    // Update stage based on status
    const stageMap: Record<string, number> = {
      new: 1, screening: 2, interview: 3, technical: 4,
      hr_round: 5, offer: 6, hired: 7, rejected: 0, withdrawn: 0,
    };
    updateData.stage = stageMap[status] || 1;

    const application = await JobApplication.findOneAndUpdate(
      { _id: id, tenantId },
      updateData,
      { new: true }
    );

    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated',
      data: { application },
    });
  } catch (error) {
    console.error('[Employee Service] Update application status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update application' });
  }
};

export const scheduleInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { scheduledAt, interviewerId, type } = req.body;

    const application = await JobApplication.findOne({ _id: id, tenantId });
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    application.interviews.push({
      scheduledAt: new Date(scheduledAt),
      interviewerId,
      type,
      status: 'scheduled',
    });

    if (application.status === 'new' || application.status === 'screening') {
      application.status = 'interview';
      application.stage = 3;
    }

    await application.save();

    res.status(200).json({
      success: true,
      message: 'Interview scheduled',
      data: { application },
    });
  } catch (error) {
    console.error('[Employee Service] Schedule interview error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule interview' });
  }
};

export const makeOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { salary, joiningDate, position } = req.body;

    const application = await JobApplication.findOneAndUpdate(
      { _id: id, tenantId },
      {
        status: 'offer',
        stage: 6,
        offerDetails: {
          salary,
          joiningDate: new Date(joiningDate),
          position,
          status: 'pending',
        },
      },
      { new: true }
    );

    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Offer made successfully',
      data: { application },
    });
  } catch (error) {
    console.error('[Employee Service] Make offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to make offer' });
  }
};

export const getRecruitmentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const [openJobs, totalApplications, applicationsByStatus, applicationsBySource] = await Promise.all([
      JobPosting.countDocuments({ tenantId, status: 'open' }),
      JobApplication.countDocuments({ tenantId }),
      JobApplication.aggregate([
        { $match: { tenantId: tenantId as unknown as mongoose.Types.ObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      JobApplication.aggregate([
        { $match: { tenantId: tenantId as unknown as mongoose.Types.ObjectId } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        openJobs,
        totalApplications,
        applicationsByStatus: Object.fromEntries(applicationsByStatus.map(s => [s._id, s.count])),
        applicationsBySource: Object.fromEntries(applicationsBySource.map(s => [s._id, s.count])),
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get recruitment stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recruitment stats' });
  }
};

import mongoose from 'mongoose';
