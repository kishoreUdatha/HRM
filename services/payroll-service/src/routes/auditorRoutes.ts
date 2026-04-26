import { Router } from 'express';
import * as auditorController from '../controllers/auditorController';
import { requireEnterprisePlan, requireFeature } from '../middleware/planGuard';
import { requireAuditorRole, requireCARole, requireAuditorOrCA } from '../middleware/auditorGuard';

const router = Router();

// ==================== TENANT AUDITOR MANAGEMENT ====================
// These routes are for tenant admins to manage their auditors

// Get all auditors assigned to the tenant (Enterprise only)
router.get(
  '/:tenantId/auditors',
  requireEnterprisePlan(),
  auditorController.getTenantAuditorsEndpoint
);

// Assign an auditor/CA to the tenant (Enterprise only)
router.post(
  '/:tenantId/auditors/assign',
  requireEnterprisePlan(),
  auditorController.assignAuditorToTenant
);

// Revoke an auditor assignment
router.delete(
  '/assignments/:assignmentId',
  requireEnterprisePlan(),
  auditorController.revokeAssignment
);

// Update auditor access scope
router.patch(
  '/assignments/:assignmentId/scope',
  requireEnterprisePlan(),
  auditorController.updateScope
);

// ==================== AUDITOR VIEW ROUTES ====================
// These routes are for auditors/CAs to view their assignments

// Get all tenants assigned to an auditor
router.get(
  '/auditor/:auditorId/tenants',
  auditorController.getAuditorTenantsEndpoint
);

// Check auditor access to a tenant
router.get(
  '/auditor/:auditorId/access/:tenantId',
  auditorController.checkAccess
);

// Get auditor dashboard
router.get(
  '/auditor/:auditorId/dashboard',
  auditorController.getDashboard
);

// ==================== COMPLIANCE VERIFICATION ROUTES ====================

// Get verifications assigned to an auditor
router.get(
  '/auditor/:auditorId/verifications',
  auditorController.getAuditorVerificationsEndpoint
);

// Get verifications for a tenant (Enterprise only)
router.get(
  '/:tenantId/verifications',
  requireEnterprisePlan(),
  auditorController.getTenantVerificationsEndpoint
);

// Get single verification
router.get(
  '/verifications/:verificationId',
  auditorController.getVerification
);

// Start reviewing a verification (Auditor/CA only)
router.post(
  '/verifications/:verificationId/start-review',
  requireAuditorOrCA(),
  auditorController.startReview
);

// Update a verification item (Auditor/CA only)
router.patch(
  '/verifications/:verificationId/items/:itemIndex',
  requireAuditorOrCA(),
  auditorController.updateItem
);

// Complete verification (Auditor/CA only)
router.post(
  '/verifications/:verificationId/complete',
  requireAuditorOrCA(),
  auditorController.complete
);

// Request corrections (Auditor/CA only)
router.post(
  '/verifications/:verificationId/request-corrections',
  requireAuditorOrCA(),
  auditorController.requestCorrectionsEndpoint
);

// ==================== TAX DECLARATION VERIFICATION ====================

// Create verification for tax declaration (Enterprise only)
router.post(
  '/:tenantId/tax-declarations/:declarationId/verify',
  requireEnterprisePlan(),
  auditorController.createTaxDeclarationVerificationEndpoint
);

// Submit tax declaration for verification (Enterprise only)
router.post(
  '/:tenantId/employees/:employeeId/tax-declaration/:financialYear/submit-for-verification',
  requireEnterprisePlan(),
  auditorController.submitForVerification
);

// ==================== COMPLIANCE DASHBOARD ====================

// Get tenant compliance dashboard (Enterprise only)
router.get(
  '/:tenantId/compliance/dashboard',
  requireEnterprisePlan(),
  auditorController.getTenantComplianceDashboard
);

export default router;
