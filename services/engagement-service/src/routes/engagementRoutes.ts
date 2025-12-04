import { Router } from 'express';
import * as surveyController from '../controllers/surveyController';
import * as feedback360Controller from '../controllers/feedback360Controller';
import * as recognitionController from '../controllers/recognitionController';
import * as goalController from '../controllers/goalController';

const router = Router();

// Survey routes
router.post('/:tenantId/surveys', surveyController.createSurvey);
router.get('/:tenantId/surveys', surveyController.getSurveys);
router.get('/:tenantId/surveys/:surveyId', surveyController.getSurvey);
router.put('/:tenantId/surveys/:surveyId', surveyController.updateSurvey);
router.delete('/:tenantId/surveys/:surveyId', surveyController.deleteSurvey);
router.post('/:tenantId/surveys/:surveyId/publish', surveyController.publishSurvey);
router.post('/:tenantId/surveys/:surveyId/close', surveyController.closeSurvey);
router.post('/:tenantId/surveys/:surveyId/responses', surveyController.submitResponse);
router.get('/:tenantId/surveys/:surveyId/results', surveyController.getSurveyResults);

// 360 Feedback routes
router.post('/:tenantId/feedback-cycles', feedback360Controller.createCycle);
router.get('/:tenantId/feedback-cycles', feedback360Controller.getCycles);
router.get('/:tenantId/feedback-cycles/:cycleId', feedback360Controller.getCycle);
router.put('/:tenantId/feedback-cycles/:cycleId', feedback360Controller.updateCycle);
router.post('/:tenantId/feedback-cycles/:cycleId/participants', feedback360Controller.addParticipants);
router.post('/:tenantId/feedback-cycles/:cycleId/participants/:employeeId/reviewers', feedback360Controller.nominateReviewers);
router.post('/:tenantId/feedback-cycles/:cycleId/start', feedback360Controller.startFeedbackCollection);
router.post('/:tenantId/feedback-cycles/:cycleId/feedback/:targetEmployeeId', feedback360Controller.submitFeedback);
router.get('/:tenantId/feedback-cycles/:cycleId/results/:employeeId', feedback360Controller.getEmployeeResults);
router.get('/:tenantId/employees/:employeeId/pending-feedbacks', feedback360Controller.getMyPendingFeedbacks);

// Recognition routes
router.post('/:tenantId/recognitions', recognitionController.createRecognition);
router.get('/:tenantId/recognitions', recognitionController.getRecognitions);
router.get('/:tenantId/recognitions/feed', recognitionController.getRecognitionsFeed);
router.post('/:tenantId/recognitions/:recognitionId/reactions', recognitionController.addReaction);
router.post('/:tenantId/recognitions/:recognitionId/comments', recognitionController.addComment);
router.get('/:tenantId/leaderboard', recognitionController.getLeaderboard);
router.get('/:tenantId/employees/:employeeId/points', recognitionController.getPointsLedger);
router.post('/:tenantId/employees/:employeeId/points/redeem', recognitionController.redeemPoints);

// Goal/OKR routes
router.post('/:tenantId/goals', goalController.createGoal);
router.get('/:tenantId/goals', goalController.getGoals);
router.get('/:tenantId/goals/tree', goalController.getGoalTree);
router.get('/:tenantId/goals/stats', goalController.getGoalStats);
router.get('/:tenantId/goals/:goalId', goalController.getGoal);
router.put('/:tenantId/goals/:goalId', goalController.updateGoal);
router.delete('/:tenantId/goals/:goalId', goalController.deleteGoal);
router.post('/:tenantId/goals/:goalId/key-results/:keyResultId', goalController.updateKeyResult);
router.post('/:tenantId/goals/:goalId/check-ins', goalController.addCheckIn);
router.post('/:tenantId/goals/:goalId/align', goalController.alignGoal);

export default router;
