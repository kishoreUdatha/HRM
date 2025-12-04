import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Feedback360Cycle from '../models/Feedback360';
import FeedbackResponse from '../models/FeedbackResponse';

export const createCycle = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const cycle = new Feedback360Cycle({
      ...req.body,
      tenantId,
      criteria: req.body.criteria?.map((c: any) => ({ ...c, id: c.id || uuidv4() })) || []
    });
    await cycle.save();
    res.status(201).json({ success: true, data: cycle });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create feedback cycle', error });
  }
};

export const getCycles = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (status) query.status = status;

    const cycles = await Feedback360Cycle.find(query).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit);
    const total = await Feedback360Cycle.countDocuments(query);

    res.json({ success: true, data: cycles, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch cycles', error });
  }
};

export const getCycle = async (req: Request, res: Response) => {
  try {
    const cycle = await Feedback360Cycle.findById(req.params.cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    res.json({ success: true, data: cycle });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch cycle', error });
  }
};

export const updateCycle = async (req: Request, res: Response) => {
  try {
    const cycle = await Feedback360Cycle.findByIdAndUpdate(req.params.cycleId, req.body, { new: true });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    res.json({ success: true, data: cycle });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update cycle', error });
  }
};

export const addParticipants = async (req: Request, res: Response) => {
  try {
    const cycle = await Feedback360Cycle.findById(req.params.cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const { employeeIds } = req.body;
    const newParticipants = employeeIds.filter((id: string) => !cycle.participants.some(p => p.employeeId === id))
      .map((employeeId: string) => ({ employeeId, reviewers: [], status: 'nomination' as const }));

    cycle.participants.push(...newParticipants);
    await cycle.save();
    res.json({ success: true, data: cycle, message: `Added ${newParticipants.length} participants` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add participants', error });
  }
};

export const nominateReviewers = async (req: Request, res: Response) => {
  try {
    const cycle = await Feedback360Cycle.findById(req.params.cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const { employeeId } = req.params;
    const { reviewers } = req.body;

    const participant = cycle.participants.find(p => p.employeeId === employeeId);
    if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });

    reviewers.forEach((r: { employeeId: string; relationship: string }) => {
      if (!participant.reviewers.some(existing => existing.employeeId === r.employeeId)) {
        participant.reviewers.push({
          employeeId: r.employeeId,
          relationship: r.relationship as any,
          status: 'pending',
          invitedAt: new Date(),
          reminderCount: 0
        });
      }
    });

    await cycle.save();
    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to nominate reviewers', error });
  }
};

export const startFeedbackCollection = async (req: Request, res: Response) => {
  try {
    const cycle = await Feedback360Cycle.findById(req.params.cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    cycle.status = 'feedback_collection';
    cycle.participants.forEach(p => { p.status = 'feedback_collection'; });
    await cycle.save();
    res.json({ success: true, data: cycle });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start feedback collection', error });
  }
};

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { tenantId, cycleId, targetEmployeeId } = req.params;
    const { reviewerEmployeeId, relationship, ratings, overallComments } = req.body;

    const cycle = await Feedback360Cycle.findById(cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    let response = await FeedbackResponse.findOne({ cycleId, targetEmployeeId, reviewerEmployeeId });
    if (response) {
      response.ratings = ratings;
      response.overallComments = overallComments;
      response.status = 'submitted';
      response.submittedAt = new Date();
    } else {
      response = new FeedbackResponse({
        tenantId, cycleId, targetEmployeeId, reviewerEmployeeId, relationship, ratings, overallComments, status: 'submitted', submittedAt: new Date()
      });
    }
    await response.save();

    const participant = cycle.participants.find(p => p.employeeId === targetEmployeeId);
    if (participant) {
      const reviewer = participant.reviewers.find(r => r.employeeId === reviewerEmployeeId);
      if (reviewer) {
        reviewer.status = 'completed';
        reviewer.completedAt = new Date();
        await cycle.save();
      }
    }

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback', error });
  }
};

export const getEmployeeResults = async (req: Request, res: Response) => {
  try {
    const { cycleId, employeeId } = req.params;
    const cycle = await Feedback360Cycle.findById(cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const feedbacks = await FeedbackResponse.find({ cycleId, targetEmployeeId: employeeId, status: 'submitted' });

    const criteriaResults = cycle.criteria.map(criteria => {
      const byRelationship: Record<string, { ratings: number[]; avg: number }> = {};
      ['self', 'manager', 'peer', 'direct_report'].forEach(rel => {
        const relFeedbacks = feedbacks.filter(f => f.relationship === rel);
        const ratings = relFeedbacks.map(f => f.ratings.find(r => r.criteriaId === criteria.id)?.rating).filter((r): r is number => r !== undefined);
        byRelationship[rel] = { ratings, avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0 };
      });

      const allRatings = feedbacks.map(f => f.ratings.find(r => r.criteriaId === criteria.id)?.rating).filter((r): r is number => r !== undefined);
      return {
        criteriaId: criteria.id,
        criteriaName: criteria.name,
        category: criteria.category,
        overallAverage: allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0,
        byRelationship
      };
    });

    const comments = {
      strengths: feedbacks.filter(f => f.overallComments?.strengths).map(f => ({
        relationship: cycle.settings.anonymousPeerFeedback && f.relationship === 'peer' ? 'anonymous' : f.relationship,
        text: f.overallComments.strengths
      })),
      areasForImprovement: feedbacks.filter(f => f.overallComments?.areasForImprovement).map(f => ({
        relationship: cycle.settings.anonymousPeerFeedback && f.relationship === 'peer' ? 'anonymous' : f.relationship,
        text: f.overallComments.areasForImprovement
      }))
    };

    res.json({
      success: true,
      data: {
        employeeId,
        cycleId,
        cycleName: cycle.name,
        totalFeedbacks: feedbacks.length,
        criteriaResults,
        overallScore: criteriaResults.reduce((acc, c) => acc + c.overallAverage, 0) / (criteriaResults.length || 1),
        comments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch results', error });
  }
};

export const getMyPendingFeedbacks = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const activeCycles = await Feedback360Cycle.find({ tenantId, status: 'feedback_collection' });

    const pending: any[] = [];
    activeCycles.forEach(cycle => {
      cycle.participants.forEach(participant => {
        const myReview = participant.reviewers.find(r => r.employeeId === employeeId && r.status === 'pending');
        if (myReview) {
          pending.push({
            cycleId: cycle._id,
            cycleName: cycle.name,
            targetEmployeeId: participant.employeeId,
            relationship: myReview.relationship,
            dueDate: cycle.schedule.feedbackEnd
          });
        }
      });
    });

    res.json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending feedbacks', error });
  }
};
