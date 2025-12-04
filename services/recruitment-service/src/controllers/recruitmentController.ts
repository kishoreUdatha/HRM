import { Request, Response } from 'express';
import JobPosting from '../models/JobPosting';
import Candidate from '../models/Candidate';
import Application from '../models/Application';
import Interview from '../models/Interview';
import OfferLetter from '../models/OfferLetter';
import mongoose from 'mongoose';

// Generators
const generateRequisitionNumber = async (tenantId: string): Promise<string> => {
  const count = await JobPosting.countDocuments({ tenantId });
  return `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

const generateApplicationNumber = async (tenantId: string): Promise<string> => {
  const count = await Application.countDocuments({ tenantId });
  return `APP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
};

const generateOfferNumber = async (tenantId: string): Promise<string> => {
  const count = await OfferLetter.countDocuments({ tenantId });
  return `OFR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// Job Posting Controllers
export const createJobPosting = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const requisitionNumber = await generateRequisitionNumber(tenantId);
    const defaultPipeline = [
      { stage: 'applied', order: 1, isRequired: true },
      { stage: 'screening', order: 2, isRequired: true },
      { stage: 'interview', order: 3, isRequired: true },
      { stage: 'offer', order: 4, isRequired: true },
    ];
    const job = new JobPosting({
      ...req.body,
      tenantId,
      requisitionNumber,
      pipeline: req.body.pipeline || defaultPipeline,
    });
    await job.save();
    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobPostings = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, departmentId, hiringManager, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (status) query.status = status;
    if (departmentId) query.departmentId = departmentId;
    if (hiringManager) query.hiringManager = hiringManager;

    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      JobPosting.find(query)
        .populate('departmentId', 'name')
        .populate('hiringManager', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      JobPosting.countDocuments(query),
    ]);
    res.json({ success: true, data: jobs, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobPostingById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const job = await JobPosting.findOne({ _id: id, tenantId })
      .populate('departmentId')
      .populate('hiringManager', 'firstName lastName email')
      .populate('recruiters', 'firstName lastName');
    if (!job) return res.status(404).json({ success: false, message: 'Job posting not found' });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJobPosting = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const job = await JobPosting.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job posting not found' });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publishJobPosting = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { channels } = req.body;
    const publishedChannels = channels.map((ch: string) => ({ channel: ch, publishedAt: new Date() }));
    const job = await JobPosting.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'open', publishedAt: new Date(), $push: { publishedChannels: { $each: publishedChannels } } },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: 'Job posting not found' });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const closeJobPosting = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const job = await JobPosting.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'closed', closedAt: new Date() },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: 'Job posting not found' });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Candidate Controllers
export const createCandidate = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const candidate = new Candidate({ ...req.body, tenantId });
    await candidate.save();
    res.status(201).json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCandidates = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, source, skills, search, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (status) query.status = status;
    if (source) query.source = source;
    if (skills) query.skills = { $in: (skills as string).split(',') };
    if (search) query.$text = { $search: search as string };

    const skip = (Number(page) - 1) * Number(limit);
    const [candidates, total] = await Promise.all([
      Candidate.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Candidate.countDocuments(query),
    ]);
    res.json({ success: true, data: candidates, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCandidateById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const candidate = await Candidate.findOne({ _id: id, tenantId }).populate('referredBy', 'firstName lastName');
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCandidate = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const candidate = await Candidate.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCandidateNote = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { by, text } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: id, tenantId },
      { $push: { notes: { by, text, at: new Date() } } },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Application Controllers
export const submitApplication = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { jobPostingId, candidateId, coverLetter, screeningAnswers, source } = req.body;

    const applicationNumber = await generateApplicationNumber(tenantId);
    const application = new Application({
      tenantId,
      applicationNumber,
      jobPostingId,
      candidateId,
      coverLetter,
      screeningAnswers,
      source,
      currentStage: 'applied',
      stageHistory: [{ stage: 'applied', enteredAt: new Date() }],
      timeline: [{ action: 'Application submitted', at: new Date() }],
    });
    await application.save();

    await JobPosting.findByIdAndUpdate(jobPostingId, { $inc: { applicationCount: 1 } });

    res.status(201).json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApplications = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { jobPostingId, status, currentStage, assignedRecruiter, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (jobPostingId) query.jobPostingId = jobPostingId;
    if (status) query.status = status;
    if (currentStage) query.currentStage = currentStage;
    if (assignedRecruiter) query.assignedRecruiter = assignedRecruiter;

    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('candidateId', 'firstName lastName email phone')
        .populate('jobPostingId', 'title requisitionNumber')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(query),
    ]);
    res.json({ success: true, data: applications, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const application = await Application.findOne({ _id: id, tenantId })
      .populate('candidateId')
      .populate('jobPostingId')
      .populate('assignedRecruiter', 'firstName lastName');
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const moveApplicationStage = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { stage, movedBy, notes } = req.body;

    const application = await Application.findOne({ _id: id, tenantId });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    const lastHistory = application.stageHistory[application.stageHistory.length - 1];
    if (lastHistory) lastHistory.exitedAt = new Date();

    application.currentStage = stage;
    application.stageHistory.push({ stage, enteredAt: new Date(), movedBy, notes });
    application.timeline.push({ action: `Moved to ${stage}`, by: movedBy, at: new Date(), details: notes });
    application.lastActivityAt = new Date();

    if (stage === 'screening') application.status = 'screening';
    else if (stage === 'interview') application.status = 'interviewing';
    else if (stage === 'offer') application.status = 'offer';

    await application.save();
    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectApplication = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { reason, rejectedBy } = req.body;

    const application = await Application.findOneAndUpdate(
      { _id: id, tenantId },
      {
        status: 'rejected',
        rejectionReason: reason,
        lastActivityAt: new Date(),
        $push: { timeline: { action: 'Application rejected', by: rejectedBy, at: new Date(), details: reason } },
      },
      { new: true }
    );
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitScorecard = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { evaluatorId, scores, overallScore, recommendation, interviewId } = req.body;

    const application = await Application.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $push: {
          scorecards: { interviewId, evaluatorId, scores, overallScore, recommendation, submittedAt: new Date() },
          timeline: { action: 'Scorecard submitted', by: evaluatorId, at: new Date() },
        },
        lastActivityAt: new Date(),
      },
      { new: true }
    );
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Interview Controllers
export const scheduleInterview = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const interview = new Interview({ ...req.body, tenantId });
    await interview.save();

    await Application.findByIdAndUpdate(req.body.applicationId, {
      $push: { timeline: { action: `Interview scheduled: ${req.body.title}`, at: new Date() } },
      lastActivityAt: new Date(),
    });

    res.status(201).json({ success: true, data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInterviews = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { applicationId, status, interviewerId, from, to, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (applicationId) query.applicationId = applicationId;
    if (status) query.status = status;
    if (interviewerId) query['interviewers.employeeId'] = interviewerId;
    if (from || to) {
      query.scheduledAt = {};
      if (from) query.scheduledAt.$gte = new Date(from as string);
      if (to) query.scheduledAt.$lte = new Date(to as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [interviews, total] = await Promise.all([
      Interview.find(query)
        .populate('candidateId', 'firstName lastName email')
        .populate('jobPostingId', 'title')
        .populate('interviewers.employeeId', 'firstName lastName')
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Interview.countDocuments(query),
    ]);
    res.json({ success: true, data: interviews, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInterview = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const interview = await Interview.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitInterviewFeedback = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const feedbackData = { ...req.body, submittedAt: new Date() };

    const interview = await Interview.findOneAndUpdate(
      { _id: id, tenantId },
      { $push: { feedback: feedbackData } },
      { new: true }
    );
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeInterview = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const interview = await Interview.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'completed' },
      { new: true }
    );
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Offer Letter Controllers
export const createOfferLetter = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const offerNumber = await generateOfferNumber(tenantId);
    const offer = new OfferLetter({ ...req.body, tenantId, offerNumber });
    await offer.save();

    await Application.findByIdAndUpdate(req.body.applicationId, {
      status: 'offer',
      $push: { timeline: { action: 'Offer letter created', at: new Date() } },
    });

    res.status(201).json({ success: true, data: offer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOfferLetters = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, applicationId } = req.query;
    const query: any = { tenantId };
    if (status) query.status = status;
    if (applicationId) query.applicationId = applicationId;

    const offers = await OfferLetter.find(query)
      .populate('candidateId', 'firstName lastName email')
      .populate('jobPostingId', 'title')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: offers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendOfferLetter = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const offer = await OfferLetter.findOneAndUpdate(
      { _id: id, tenantId, status: { $in: ['draft', 'approved'] } },
      { status: 'sent', sentAt: new Date() },
      { new: true }
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found or cannot be sent' });
    res.json({ success: true, data: offer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const respondToOffer = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { accepted, declineReason, signedDocumentUrl } = req.body;

    const update: any = {
      status: accepted ? 'accepted' : 'declined',
      respondedAt: new Date(),
    };
    if (!accepted) update.declineReason = declineReason;
    if (accepted && signedDocumentUrl) {
      update.signedDocument = { url: signedDocumentUrl, signedAt: new Date() };
    }

    const offer = await OfferLetter.findOneAndUpdate(
      { _id: id, tenantId, status: { $in: ['sent', 'viewed'] } },
      update,
      { new: true }
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    if (accepted) {
      await Application.findByIdAndUpdate(offer.applicationId, { status: 'hired' });
      await Candidate.findByIdAndUpdate(offer.candidateId, { status: 'hired' });
      await JobPosting.findByIdAndUpdate(offer.jobPostingId, { $inc: { filled: 1 } });
    }

    res.json({ success: true, data: offer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Analytics
export const getRecruitmentStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const [jobStats, applicationStats, sourceStats, timeToHire] = await Promise.all([
      JobPosting.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 }, openings: { $sum: '$openings' }, filled: { $sum: '$filled' } } },
      ]),
      Application.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Candidate.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Application.aggregate([
        { $match: { tenantId: tenantObjectId, status: 'hired' } },
        { $project: { days: { $divide: [{ $subtract: ['$updatedAt', '$appliedAt'] }, 1000 * 60 * 60 * 24] } } },
        { $group: { _id: null, avgDays: { $avg: '$days' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: { jobStats, applicationStats, sourceStats, avgTimeToHire: timeToHire[0]?.avgDays || 0 },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPipelineStats = async (req: Request, res: Response) => {
  try {
    const { tenantId, jobId } = req.params;
    const stats = await Application.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), jobPostingId: new mongoose.Types.ObjectId(jobId) } },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
