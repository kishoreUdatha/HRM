import { Router } from 'express';
import * as controller from '../controllers/recruitmentController';

const router = Router();

// Job Postings
router.post('/:tenantId/jobs', controller.createJobPosting);
router.get('/:tenantId/jobs', controller.getJobPostings);
router.get('/:tenantId/jobs/:id', controller.getJobPostingById);
router.put('/:tenantId/jobs/:id', controller.updateJobPosting);
router.post('/:tenantId/jobs/:id/publish', controller.publishJobPosting);
router.post('/:tenantId/jobs/:id/close', controller.closeJobPosting);
router.get('/:tenantId/jobs/:jobId/pipeline', controller.getPipelineStats);

// Candidates
router.post('/:tenantId/candidates', controller.createCandidate);
router.get('/:tenantId/candidates', controller.getCandidates);
router.get('/:tenantId/candidates/:id', controller.getCandidateById);
router.put('/:tenantId/candidates/:id', controller.updateCandidate);
router.post('/:tenantId/candidates/:id/notes', controller.addCandidateNote);

// Applications
router.post('/:tenantId/applications', controller.submitApplication);
router.get('/:tenantId/applications', controller.getApplications);
router.get('/:tenantId/applications/:id', controller.getApplicationById);
router.post('/:tenantId/applications/:id/move', controller.moveApplicationStage);
router.post('/:tenantId/applications/:id/reject', controller.rejectApplication);
router.post('/:tenantId/applications/:id/scorecard', controller.submitScorecard);

// Interviews
router.post('/:tenantId/interviews', controller.scheduleInterview);
router.get('/:tenantId/interviews', controller.getInterviews);
router.put('/:tenantId/interviews/:id', controller.updateInterview);
router.post('/:tenantId/interviews/:id/feedback', controller.submitInterviewFeedback);
router.post('/:tenantId/interviews/:id/complete', controller.completeInterview);

// Offers
router.post('/:tenantId/offers', controller.createOfferLetter);
router.get('/:tenantId/offers', controller.getOfferLetters);
router.post('/:tenantId/offers/:id/send', controller.sendOfferLetter);
router.post('/:tenantId/offers/:id/respond', controller.respondToOffer);

// Analytics
router.get('/:tenantId/stats', controller.getRecruitmentStats);

export default router;
