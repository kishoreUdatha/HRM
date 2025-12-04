import { Router } from 'express';
import * as benefitsController from '../controllers/benefitsController';

const router = Router();

// Benefit Plans
router.post('/:tenantId/benefit-plans', benefitsController.createBenefitPlan);
router.get('/:tenantId/benefit-plans', benefitsController.getBenefitPlans);
router.get('/:tenantId/benefit-plans/:id', benefitsController.getBenefitPlanById);
router.put('/:tenantId/benefit-plans/:id', benefitsController.updateBenefitPlan);
router.delete('/:tenantId/benefit-plans/:id', benefitsController.deleteBenefitPlan);

// Benefit Enrollments
router.post('/:tenantId/enrollments', benefitsController.enrollInBenefit);
router.get('/:tenantId/enrollments', benefitsController.getEnrollments);
router.get('/:tenantId/enrollments/employee/:employeeId', benefitsController.getEmployeeEnrollments);
router.post('/:tenantId/enrollments/:id/approve', benefitsController.approveEnrollment);
router.post('/:tenantId/enrollments/:id/terminate', benefitsController.terminateEnrollment);
router.put('/:tenantId/enrollments/:id/dependents', benefitsController.updateEnrollmentDependents);

// Compensation Plans
router.post('/:tenantId/compensation-plans', benefitsController.createCompensationPlan);
router.get('/:tenantId/compensation-plans', benefitsController.getCompensationPlans);
router.get('/:tenantId/compensation-plans/employee/:employeeId/active', benefitsController.getActiveCompensationPlan);
router.post('/:tenantId/compensation-plans/:id/approve', benefitsController.approveCompensationPlan);

// Wellness Programs
router.post('/:tenantId/wellness-programs', benefitsController.createWellnessProgram);
router.get('/:tenantId/wellness-programs', benefitsController.getWellnessPrograms);
router.put('/:tenantId/wellness-programs/:id', benefitsController.updateWellnessProgram);

// Summary & Stats
router.get('/:tenantId/summary/:employeeId', benefitsController.getBenefitsSummary);
router.get('/:tenantId/stats', benefitsController.getBenefitsStats);

export default router;
