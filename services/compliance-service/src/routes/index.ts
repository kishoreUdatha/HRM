import { Router } from 'express';
import * as controller from '../controllers/complianceController';

const router = Router();

// Policies
router.post('/:tenantId/policies', controller.createPolicy);
router.get('/:tenantId/policies', controller.getPolicies);
router.get('/:tenantId/policies/:id', controller.getPolicyById);
router.put('/:tenantId/policies/:id', controller.updatePolicy);
router.post('/:tenantId/policies/:id/publish', controller.publishPolicy);
router.post('/:tenantId/policies/:id/acknowledge', controller.acknowledgePolicy);
router.get('/:tenantId/policies/:id/acknowledgements', controller.getAcknowledgements);
router.get('/:tenantId/policies/pending/:employeeId', controller.getPendingPolicies);

// Compliance Training
router.post('/:tenantId/trainings', controller.createTraining);
router.get('/:tenantId/trainings', controller.getTrainings);
router.put('/:tenantId/trainings/:id', controller.updateTraining);

// Work Permits
router.post('/:tenantId/work-permits', controller.createWorkPermit);
router.get('/:tenantId/work-permits', controller.getWorkPermits);
router.put('/:tenantId/work-permits/:id', controller.updateWorkPermit);
router.post('/:tenantId/work-permits/:id/renew', controller.renewWorkPermit);

// Stats
router.get('/:tenantId/stats', controller.getComplianceStats);

export default router;
