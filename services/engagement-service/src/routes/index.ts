import { Router } from 'express';
import * as controller from '../controllers/engagementController';

const router = Router();

// Surveys
router.post('/:tenantId/surveys', controller.createSurvey);
router.get('/:tenantId/surveys', controller.getSurveys);
router.put('/:tenantId/surveys/:id', controller.updateSurvey);

// Recognition
router.post('/:tenantId/recognitions', controller.giveRecognition);
router.get('/:tenantId/recognitions', controller.getRecognitions);
router.post('/:tenantId/recognitions/:id/reactions', controller.addReaction);

// Reward Points
router.get('/:tenantId/points/:employeeId', controller.getEmployeePoints);
router.post('/:tenantId/points/:employeeId/redeem', controller.redeemPoints);
router.get('/:tenantId/leaderboard', controller.getLeaderboard);

// Celebrations
router.post('/:tenantId/celebrations', controller.createCelebration);
router.get('/:tenantId/celebrations', controller.getCelebrations);
router.post('/:tenantId/celebrations/:id/wishes', controller.addWish);

// Stats
router.get('/:tenantId/stats', controller.getEngagementStats);

export default router;
