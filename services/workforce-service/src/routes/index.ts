import { Router } from 'express';
import * as controller from '../controllers/workforceController';

const router = Router();

// Positions
router.post('/:tenantId/positions', controller.createPosition);
router.get('/:tenantId/positions', controller.getPositions);
router.get('/:tenantId/positions/:id', controller.getPositionById);
router.put('/:tenantId/positions/:id', controller.updatePosition);
router.patch('/:tenantId/positions/:id/headcount', controller.updateHeadcount);

// Headcount Plans
router.post('/:tenantId/headcount-plans', controller.createHeadcountPlan);
router.get('/:tenantId/headcount-plans', controller.getHeadcountPlans);
router.get('/:tenantId/headcount-plans/:id', controller.getHeadcountPlanById);
router.put('/:tenantId/headcount-plans/:id', controller.updateHeadcountPlan);
router.post('/:tenantId/headcount-plans/:id/submit', controller.submitHeadcountPlan);
router.post('/:tenantId/headcount-plans/:id/approve', controller.approveHeadcountPlan);

// Succession Plans
router.post('/:tenantId/succession-plans', controller.createSuccessionPlan);
router.get('/:tenantId/succession-plans', controller.getSuccessionPlans);
router.get('/:tenantId/succession-plans/:id', controller.getSuccessionPlanById);
router.put('/:tenantId/succession-plans/:id', controller.updateSuccessionPlan);
router.post('/:tenantId/succession-plans/:id/successors', controller.addSuccessor);
router.put('/:tenantId/succession-plans/:id/successors/:employeeId', controller.updateSuccessor);
router.delete('/:tenantId/succession-plans/:id/successors/:employeeId', controller.removeSuccessor);

// Analytics
router.get('/:tenantId/analytics', controller.getWorkforceAnalytics);
router.get('/:tenantId/org-chart', controller.getOrgChart);

export default router;
