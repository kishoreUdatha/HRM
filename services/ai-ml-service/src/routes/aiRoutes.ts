import { Router } from 'express';
import * as aiController from '../controllers/aiController';

const router = Router();

// Resume Analysis
router.post('/:tenantId/resume/analyze', aiController.analyzeResumeFile);
router.get('/:tenantId/resume/:analysisId', aiController.getResumeAnalysis);
router.post('/:tenantId/resume/:analysisId/match-jobs', aiController.matchResumeToJobs);

// Predictions - Attrition
router.post('/:tenantId/predictions/attrition/:employeeId', aiController.getAttritionPrediction);
router.post('/:tenantId/predictions/attrition/batch', aiController.getBatchAttritionPredictions);

// Predictions - Performance
router.post('/:tenantId/predictions/performance/:employeeId', aiController.getPerformancePrediction);

// Predictions - Engagement
router.post('/:tenantId/predictions/engagement', aiController.getEngagementPrediction);

// Predictions - Salary
router.post('/:tenantId/predictions/salary', aiController.getSalaryPrediction);

// Predictions - Promotion
router.post('/:tenantId/predictions/promotion-readiness', aiController.getPromotionReadiness);

// Predictions History
router.get('/:tenantId/predictions/history/:employeeId', aiController.getPredictionHistory);
router.post('/:tenantId/predictions/:predictionId/outcome', aiController.recordPredictionOutcome);

// Skill Matching
router.post('/:tenantId/skills/match-candidates', aiController.matchCandidates);
router.post('/:tenantId/skills/match-to-job', aiController.matchToJob);
router.post('/:tenantId/skills/gap-analysis', aiController.analyzeTeamSkillGaps);
router.post('/:tenantId/skills/learning-path', aiController.getLearningPath);

// Sentiment Analysis
router.post('/:tenantId/sentiment/analyze', aiController.analyzeFeedbackSentiment);
router.post('/:tenantId/sentiment/batch', aiController.analyzeBatchSentiment);

// Skill Taxonomy
router.post('/:tenantId/taxonomy/skills', aiController.createSkill);
router.get('/:tenantId/taxonomy/skills', aiController.getSkills);
router.put('/:tenantId/taxonomy/skills/:skillId', aiController.updateSkill);

// ML Models
router.get('/:tenantId/models', aiController.getMLModels);
router.get('/:tenantId/models/:modelId/performance', aiController.getModelPerformance);

export default router;
