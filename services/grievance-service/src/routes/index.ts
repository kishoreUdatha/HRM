import { Router } from 'express';
import * as controller from '../controllers/grievanceController';

const router = Router();

// Grievance management
router.post('/:tenantId/grievances', controller.submitGrievance);
router.get('/:tenantId/grievances', controller.getGrievances);
router.get('/:tenantId/grievances/:id', controller.getGrievanceById);
router.post('/:tenantId/grievances/:id/assign', controller.assignGrievance);
router.post('/:tenantId/grievances/:id/escalate', controller.escalateGrievance);
router.post('/:tenantId/grievances/:id/withdraw', controller.withdrawGrievance);
router.post('/:tenantId/grievances/:id/evidence', controller.addEvidence);

// Investigation
router.post('/:tenantId/grievances/:id/investigation/start', controller.startInvestigation);
router.post('/:tenantId/grievances/:id/investigation/interview', controller.addInterview);
router.post('/:tenantId/grievances/:id/investigation/findings', controller.submitFindings);

// Resolution
router.post('/:tenantId/grievances/:id/resolve', controller.resolveGrievance);
router.post('/:tenantId/grievances/:id/close', controller.closeGrievance);

// Employee self-service
router.get('/:tenantId/grievances/employee/:employeeId', controller.getMyGrievances);

// Stats
router.get('/:tenantId/stats', controller.getGrievanceStats);

export default router;
