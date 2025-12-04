import { Router } from 'express';
import * as onboardingController from '../controllers/onboardingController';
import * as offboardingController from '../controllers/offboardingController';

const router = Router();

// Onboarding Template Routes
router.post('/:tenantId/onboarding/templates', onboardingController.createTemplate);
router.get('/:tenantId/onboarding/templates', onboardingController.getTemplates);
router.get('/:tenantId/onboarding/templates/:id', onboardingController.getTemplateById);
router.put('/:tenantId/onboarding/templates/:id', onboardingController.updateTemplate);
router.delete('/:tenantId/onboarding/templates/:id', onboardingController.deleteTemplate);

// Onboarding Routes
router.post('/:tenantId/onboarding', onboardingController.initiateOnboarding);
router.get('/:tenantId/onboarding', onboardingController.getOnboardings);
router.get('/:tenantId/onboarding/stats', onboardingController.getOnboardingStats);
router.get('/:tenantId/onboarding/:id', onboardingController.getOnboardingById);
router.get('/:tenantId/onboarding/employee/:employeeId', onboardingController.getOnboardingByEmployee);
router.put('/:tenantId/onboarding/:id', onboardingController.updateOnboarding);
router.put('/:tenantId/onboarding/:id/tasks/:taskId', onboardingController.updateTaskStatus);
router.post('/:tenantId/onboarding/:id/checkpoint', onboardingController.addCheckpointFeedback);
router.put('/:tenantId/onboarding/:id/documents/:documentIndex', onboardingController.updateDocumentStatus);
router.post('/:tenantId/onboarding/:id/complete', onboardingController.completeOnboarding);

// Offboarding Template Routes
router.post('/:tenantId/offboarding/templates', offboardingController.createOffboardingTemplate);
router.get('/:tenantId/offboarding/templates', offboardingController.getOffboardingTemplates);
router.put('/:tenantId/offboarding/templates/:id', offboardingController.updateOffboardingTemplate);

// Offboarding Routes
router.post('/:tenantId/offboarding', offboardingController.initiateOffboarding);
router.get('/:tenantId/offboarding', offboardingController.getOffboardings);
router.get('/:tenantId/offboarding/stats', offboardingController.getOffboardingStats);
router.get('/:tenantId/offboarding/:id', offboardingController.getOffboardingById);
router.get('/:tenantId/offboarding/employee/:employeeId', offboardingController.getOffboardingByEmployee);
router.put('/:tenantId/offboarding/:id', offboardingController.updateOffboarding);
router.put('/:tenantId/offboarding/:id/tasks/:taskId', offboardingController.updateTaskStatus);
router.post('/:tenantId/offboarding/:id/exit-interview', offboardingController.conductExitInterview);
router.put('/:tenantId/offboarding/:id/assets/:assetIndex', offboardingController.updateAssetReturn);
router.put('/:tenantId/offboarding/:id/clearance/:department', offboardingController.updateClearance);
router.put('/:tenantId/offboarding/:id/access/:accessIndex/revoke', offboardingController.revokeAccess);
router.post('/:tenantId/offboarding/:id/settlement/calculate', offboardingController.calculateFinalSettlement);
router.post('/:tenantId/offboarding/:id/settlement/process', offboardingController.processSettlement);
router.post('/:tenantId/offboarding/:id/documents/:documentType/generate', offboardingController.generateDocument);
router.post('/:tenantId/offboarding/:id/complete', offboardingController.completeOffboarding);

export default router;
