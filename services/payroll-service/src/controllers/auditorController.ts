import { Request, Response } from 'express';
import {
  assignAuditor,
  getAuditorAssignments,
  getTenantAuditors,
  checkAuditorAccess,
  revokeAuditorAssignment,
  updateAuditorScope,
  createComplianceVerification,
  getAuditorVerifications,
  getTenantVerifications,
  startVerificationReview,
  updateVerificationItem,
  completeVerification,
  requestCorrections,
  createTaxDeclarationVerification,
  getAuditorDashboardStats
} from '../services/auditorService';
import AuditorAssignment from '../models/AuditorAssignment';
import ComplianceVerification from '../models/ComplianceVerification';

// ================= Auditor Assignment Endpoints =================

/**
 * Assign an auditor/CA to a tenant
 * POST /:tenantId/auditors/assign
 */
export const assignAuditorToTenant = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const {
      auditorId,
      auditorEmail,
      auditorName,
      auditorRole,
      accessScope,
      financialYears,
      validFrom,
      validTo,
      engagementType,
      firmName,
      firmGSTIN,
      firmAddress,
      notes
    } = req.body;

    const assignedBy = req.headers['x-user-id'] as string;
    const assignedByName = req.headers['x-user-name'] as string || 'System';
    const tenantName = (req as any).tenant?.name || 'Unknown';

    const assignment = await assignAuditor(
      tenantId,
      tenantName,
      auditorId,
      auditorEmail,
      auditorName,
      auditorRole,
      assignedBy,
      assignedByName,
      {
        accessScope,
        financialYears,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validTo: validTo ? new Date(validTo) : undefined,
        engagementType,
        firmName,
        firmGSTIN,
        firmAddress,
        notes
      }
    );

    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all auditors assigned to a tenant
 * GET /:tenantId/auditors
 */
export const getTenantAuditorsEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.query;

    const auditors = await getTenantAuditors(tenantId, status as any);
    res.json({ success: true, data: auditors });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all tenants assigned to an auditor
 * GET /auditor/:auditorId/tenants
 */
export const getAuditorTenantsEndpoint = async (req: Request, res: Response) => {
  try {
    const { auditorId } = req.params;
    const { status } = req.query;

    const assignments = await getAuditorAssignments(auditorId, status as any);
    res.json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Revoke auditor assignment
 * DELETE /assignments/:assignmentId
 */
export const revokeAssignment = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { reason } = req.body;
    const revokedBy = req.headers['x-user-id'] as string;

    const assignment = await revokeAuditorAssignment(assignmentId, revokedBy, reason);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update auditor access scope
 * PATCH /assignments/:assignmentId/scope
 */
export const updateScope = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { accessScope } = req.body;
    const updatedBy = req.headers['x-user-id'] as string;

    const assignment = await updateAuditorScope(assignmentId, accessScope, updatedBy);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check auditor access to a tenant
 * GET /auditor/:auditorId/access/:tenantId
 */
export const checkAccess = async (req: Request, res: Response) => {
  try {
    const { auditorId, tenantId } = req.params;
    const { scope } = req.query;

    const result = await checkAuditorAccess(auditorId, tenantId, scope as any);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= Compliance Verification Endpoints =================

/**
 * Get verifications for an auditor
 * GET /auditor/:auditorId/verifications
 */
export const getAuditorVerificationsEndpoint = async (req: Request, res: Response) => {
  try {
    const { auditorId } = req.params;
    const { status, verificationType, priority, tenantId, financialYear } = req.query;

    const verifications = await getAuditorVerifications(auditorId, {
      status: status as any,
      verificationType: verificationType as any,
      priority: priority as any,
      tenantId: tenantId as string,
      financialYear: financialYear as string
    });

    res.json({ success: true, data: verifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get verifications for a tenant
 * GET /:tenantId/verifications
 */
export const getTenantVerificationsEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, verificationType, employeeId, financialYear } = req.query;

    const verifications = await getTenantVerifications(tenantId, {
      status: status as any,
      verificationType: verificationType as any,
      employeeId: employeeId as string,
      financialYear: financialYear as string
    });

    res.json({ success: true, data: verifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single verification
 * GET /verifications/:verificationId
 */
export const getVerification = async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;

    const verification = await ComplianceVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    res.json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Start reviewing a verification
 * POST /verifications/:verificationId/start-review
 */
export const startReview = async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;
    const auditorId = req.headers['x-user-id'] as string;
    const auditorName = req.headers['x-user-name'] as string || 'Auditor';

    const verification = await startVerificationReview(verificationId, auditorId, auditorName);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    res.json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a verification item
 * PATCH /verifications/:verificationId/items/:itemIndex
 */
export const updateItem = async (req: Request, res: Response) => {
  try {
    const { verificationId, itemIndex } = req.params;
    const { status, verifiedValue, remarks } = req.body;
    const auditorId = req.headers['x-user-id'] as string;

    const verification = await updateVerificationItem(
      verificationId,
      parseInt(itemIndex),
      { status, verifiedValue, remarks },
      auditorId
    );

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    res.json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Complete verification
 * POST /verifications/:verificationId/complete
 */
export const complete = async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;
    const { overallRemarks } = req.body;
    const auditorId = req.headers['x-user-id'] as string;

    const verification = await completeVerification(verificationId, auditorId, overallRemarks);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    res.json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Request corrections
 * POST /verifications/:verificationId/request-corrections
 */
export const requestCorrectionsEndpoint = async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;
    const { items, correctionDeadline } = req.body;
    const auditorId = req.headers['x-user-id'] as string;

    const verification = await requestCorrections(
      verificationId,
      auditorId,
      items,
      correctionDeadline ? new Date(correctionDeadline) : undefined
    );

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    res.json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= Tax Declaration Verification =================

/**
 * Create verification request for tax declaration
 * POST /:tenantId/tax-declarations/:declarationId/verify
 */
export const createTaxDeclarationVerificationEndpoint = async (req: Request, res: Response) => {
  try {
    const { tenantId, declarationId } = req.params;
    const { auditorId, auditorName } = req.body;

    const verification = await createTaxDeclarationVerification(
      tenantId,
      declarationId,
      auditorId,
      auditorName
    );

    res.status(201).json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit tax declaration for verification
 * POST /:tenantId/employees/:employeeId/tax-declaration/:financialYear/submit-for-verification
 */
export const submitForVerification = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId, financialYear } = req.params;
    const { priority, dueDate } = req.body;

    // Find the declaration
    const TaxDeclaration = require('../models/TaxDeclaration').default;
    const declaration = await TaxDeclaration.findOne({
      tenantId,
      employeeId,
      financialYear
    });

    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Tax declaration not found' });
    }

    if (declaration.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Declaration must be submitted before requesting verification'
      });
    }

    // Find an active auditor for the tenant
    const activeAuditor = await AuditorAssignment.findOne({
      tenantId,
      status: 'active',
      'accessScope.taxDeclarations': true
    });

    const verification = await createTaxDeclarationVerification(
      tenantId,
      declaration._id.toString(),
      activeAuditor?.auditorId,
      activeAuditor?.auditorName
    );

    // Update declaration status
    declaration.status = 'under_review';
    await declaration.save();

    res.status(201).json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= Dashboard =================

/**
 * Get auditor dashboard stats
 * GET /auditor/:auditorId/dashboard
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { auditorId } = req.params;

    const stats = await getAuditorDashboardStats(auditorId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get tenant compliance dashboard
 * GET /:tenantId/compliance/dashboard
 */
export const getTenantComplianceDashboard = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { financialYear } = req.query;

    const fy = financialYear as string || getCurrentFinancialYear();

    const [
      pendingVerifications,
      inReviewVerifications,
      completedVerifications,
      rejectedVerifications,
      auditors
    ] = await Promise.all([
      ComplianceVerification.countDocuments({ tenantId, financialYear: fy, status: 'pending' }),
      ComplianceVerification.countDocuments({ tenantId, financialYear: fy, status: 'in_review' }),
      ComplianceVerification.countDocuments({ tenantId, financialYear: fy, status: 'verified' }),
      ComplianceVerification.countDocuments({ tenantId, financialYear: fy, status: 'rejected' }),
      AuditorAssignment.find({ tenantId, status: 'active' }).select('auditorName auditorRole auditorEmail')
    ]);

    res.json({
      success: true,
      data: {
        financialYear: fy,
        verifications: {
          pending: pendingVerifications,
          inReview: inReviewVerifications,
          completed: completedVerifications,
          rejected: rejectedVerifications,
          total: pendingVerifications + inReviewVerifications + completedVerifications + rejectedVerifications
        },
        assignedAuditors: auditors
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export default {
  // Assignment management
  assignAuditorToTenant,
  getTenantAuditorsEndpoint,
  getAuditorTenantsEndpoint,
  revokeAssignment,
  updateScope,
  checkAccess,
  // Verification management
  getAuditorVerificationsEndpoint,
  getTenantVerificationsEndpoint,
  getVerification,
  startReview,
  updateItem,
  complete,
  requestCorrectionsEndpoint,
  // Tax declaration
  createTaxDeclarationVerificationEndpoint,
  submitForVerification,
  // Dashboard
  getDashboard,
  getTenantComplianceDashboard
};
