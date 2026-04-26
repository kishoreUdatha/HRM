import AuditorAssignment, { IAuditorAssignment } from '../models/AuditorAssignment';
import ComplianceVerification, { IComplianceVerification, IVerificationItem } from '../models/ComplianceVerification';
import TaxDeclaration from '../models/TaxDeclaration';
import { createAuditLog } from './auditService';

// ================= Auditor Assignment Management =================

/**
 * Assign an auditor/CA to a tenant
 */
export async function assignAuditor(
  tenantId: string,
  tenantName: string,
  auditorId: string,
  auditorEmail: string,
  auditorName: string,
  auditorRole: 'auditor' | 'ca',
  assignedBy: string,
  assignedByName: string,
  options: {
    accessScope?: IAuditorAssignment['accessScope'];
    financialYears?: string[];
    validFrom?: Date;
    validTo?: Date;
    engagementType?: 'internal' | 'external';
    firmName?: string;
    firmGSTIN?: string;
    firmAddress?: string;
    notes?: string;
  } = {}
): Promise<IAuditorAssignment> {
  // Check if assignment already exists
  const existing = await AuditorAssignment.findOne({ auditorId, tenantId });
  if (existing && existing.status === 'active') {
    throw new Error('Auditor is already assigned to this tenant');
  }

  // If exists but inactive/revoked, update it
  if (existing) {
    existing.status = 'active';
    existing.assignedBy = assignedBy;
    existing.assignedByName = assignedByName;
    existing.assignedAt = new Date();
    existing.validFrom = options.validFrom || new Date();
    existing.validTo = options.validTo;
    existing.revokedAt = undefined;
    existing.revokedBy = undefined;
    existing.revocationReason = undefined;
    if (options.accessScope) existing.accessScope = options.accessScope;
    if (options.financialYears) existing.financialYears = options.financialYears;
    if (options.engagementType) existing.engagementType = options.engagementType;
    if (options.firmName) existing.firmName = options.firmName;
    if (options.notes) existing.notes = options.notes;
    await existing.save();
    return existing;
  }

  const assignment = new AuditorAssignment({
    auditorId,
    auditorEmail,
    auditorName,
    auditorRole,
    tenantId,
    tenantName,
    assignedBy,
    assignedByName,
    assignedAt: new Date(),
    accessScope: options.accessScope || {
      taxDeclarations: true,
      advanceTax: true,
      pfCompliance: true,
      esiCompliance: true,
      form16: true,
      statutoryReports: true,
      employeeData: false
    },
    financialYears: options.financialYears || [getCurrentFinancialYear()],
    validFrom: options.validFrom || new Date(),
    validTo: options.validTo,
    engagementType: options.engagementType || 'external',
    firmName: options.firmName,
    firmGSTIN: options.firmGSTIN,
    firmAddress: options.firmAddress,
    notes: options.notes,
    status: 'active'
  });

  await assignment.save();
  return assignment;
}

/**
 * Get all tenants assigned to an auditor
 */
export async function getAuditorAssignments(
  auditorId: string,
  status?: 'active' | 'inactive' | 'expired' | 'revoked'
): Promise<IAuditorAssignment[]> {
  const query: any = { auditorId };
  if (status) {
    query.status = status;
  } else {
    query.status = 'active';
  }
  return AuditorAssignment.find(query).sort({ assignedAt: -1 });
}

/**
 * Get all auditors assigned to a tenant
 */
export async function getTenantAuditors(
  tenantId: string,
  status?: 'active' | 'inactive' | 'expired' | 'revoked'
): Promise<IAuditorAssignment[]> {
  const query: any = { tenantId };
  if (status) {
    query.status = status;
  } else {
    query.status = 'active';
  }
  return AuditorAssignment.find(query).sort({ assignedAt: -1 });
}

/**
 * Check if auditor has access to a tenant
 */
export async function checkAuditorAccess(
  auditorId: string,
  tenantId: string,
  requiredScope?: keyof IAuditorAssignment['accessScope']
): Promise<{ hasAccess: boolean; assignment?: IAuditorAssignment; reason?: string }> {
  const assignment = await AuditorAssignment.findOne({
    auditorId,
    tenantId,
    status: 'active'
  });

  if (!assignment) {
    return { hasAccess: false, reason: 'No active assignment found' };
  }

  // Check validity dates
  const now = new Date();
  if (assignment.validFrom > now) {
    return { hasAccess: false, reason: 'Assignment not yet active' };
  }
  if (assignment.validTo && assignment.validTo < now) {
    assignment.status = 'expired';
    await assignment.save();
    return { hasAccess: false, reason: 'Assignment has expired' };
  }

  // Check specific scope
  if (requiredScope && !assignment.accessScope[requiredScope]) {
    return { hasAccess: false, reason: `No access to ${requiredScope}` };
  }

  return { hasAccess: true, assignment };
}

/**
 * Revoke an auditor assignment
 */
export async function revokeAuditorAssignment(
  assignmentId: string,
  revokedBy: string,
  reason: string
): Promise<IAuditorAssignment | null> {
  const assignment = await AuditorAssignment.findById(assignmentId);
  if (!assignment) return null;

  assignment.status = 'revoked';
  assignment.revokedAt = new Date();
  assignment.revokedBy = revokedBy;
  assignment.revocationReason = reason;
  await assignment.save();

  return assignment;
}

/**
 * Update auditor access scope
 */
export async function updateAuditorScope(
  assignmentId: string,
  accessScope: Partial<IAuditorAssignment['accessScope']>,
  updatedBy: string
): Promise<IAuditorAssignment | null> {
  const assignment = await AuditorAssignment.findById(assignmentId);
  if (!assignment) return null;

  Object.assign(assignment.accessScope, accessScope);
  await assignment.save();

  return assignment;
}

// ================= Compliance Verification Management =================

/**
 * Create a compliance verification request
 */
export async function createComplianceVerification(
  tenantId: string,
  verificationType: IComplianceVerification['verificationType'],
  sourceDocumentId: string,
  sourceDocumentType: string,
  financialYear: string,
  verificationItems: IVerificationItem[],
  options: {
    employeeId?: string;
    employeeName?: string;
    month?: number;
    quarter?: number;
    assignedTo?: string;
    assignedToName?: string;
    priority?: IComplianceVerification['priority'];
    dueDate?: Date;
    submittedBy?: string;
  } = {}
): Promise<IComplianceVerification> {
  const verification = new ComplianceVerification({
    tenantId,
    employeeId: options.employeeId,
    employeeName: options.employeeName,
    verificationType,
    sourceDocumentId,
    sourceDocumentType,
    financialYear,
    month: options.month,
    quarter: options.quarter,
    verificationItems,
    status: options.assignedTo ? 'pending' : 'pending',
    assignedTo: options.assignedTo,
    assignedToName: options.assignedToName,
    assignedAt: options.assignedTo ? new Date() : undefined,
    priority: options.priority || 'medium',
    dueDate: options.dueDate,
    submittedAt: new Date(),
    submittedBy: options.submittedBy
  });

  await verification.save();
  return verification;
}

/**
 * Get verifications assigned to an auditor
 */
export async function getAuditorVerifications(
  auditorId: string,
  filters: {
    status?: IComplianceVerification['status'];
    verificationType?: IComplianceVerification['verificationType'];
    priority?: IComplianceVerification['priority'];
    tenantId?: string;
    financialYear?: string;
  } = {}
): Promise<IComplianceVerification[]> {
  const query: any = { assignedTo: auditorId };
  if (filters.status) query.status = filters.status;
  if (filters.verificationType) query.verificationType = filters.verificationType;
  if (filters.priority) query.priority = filters.priority;
  if (filters.tenantId) query.tenantId = filters.tenantId;
  if (filters.financialYear) query.financialYear = filters.financialYear;

  return ComplianceVerification.find(query).sort({ dueDate: 1, priority: -1 });
}

/**
 * Get verifications for a tenant
 */
export async function getTenantVerifications(
  tenantId: string,
  filters: {
    status?: IComplianceVerification['status'];
    verificationType?: IComplianceVerification['verificationType'];
    employeeId?: string;
    financialYear?: string;
  } = {}
): Promise<IComplianceVerification[]> {
  const query: any = { tenantId };
  if (filters.status) query.status = filters.status;
  if (filters.verificationType) query.verificationType = filters.verificationType;
  if (filters.employeeId) query.employeeId = filters.employeeId;
  if (filters.financialYear) query.financialYear = filters.financialYear;

  return ComplianceVerification.find(query).sort({ createdAt: -1 });
}

/**
 * Start review of a verification
 */
export async function startVerificationReview(
  verificationId: string,
  auditorId: string,
  auditorName: string
): Promise<IComplianceVerification | null> {
  const verification = await ComplianceVerification.findById(verificationId);
  if (!verification) return null;

  verification.status = 'in_review';
  verification.reviewStartedAt = new Date();
  verification.assignedTo = auditorId;
  verification.assignedToName = auditorName;
  verification.assignedAt = new Date();

  verification.revisionHistory.push({
    revisedAt: new Date(),
    revisedBy: auditorId,
    action: 'review_started',
    previousStatus: 'pending',
    newStatus: 'in_review'
  });

  await verification.save();
  return verification;
}

/**
 * Update verification item status
 */
export async function updateVerificationItem(
  verificationId: string,
  itemIndex: number,
  updates: {
    status: 'verified' | 'discrepancy' | 'rejected';
    verifiedValue?: any;
    remarks?: string;
  },
  auditorId: string
): Promise<IComplianceVerification | null> {
  const verification = await ComplianceVerification.findById(verificationId);
  if (!verification) return null;

  if (itemIndex < 0 || itemIndex >= verification.verificationItems.length) {
    throw new Error('Invalid item index');
  }

  const item = verification.verificationItems[itemIndex];
  item.status = updates.status;
  item.verifiedValue = updates.verifiedValue;
  item.remarks = updates.remarks;
  item.verifiedAt = new Date();

  await verification.save();
  return verification;
}

/**
 * Complete verification
 */
export async function completeVerification(
  verificationId: string,
  auditorId: string,
  overallRemarks?: string
): Promise<IComplianceVerification | null> {
  const verification = await ComplianceVerification.findById(verificationId);
  if (!verification) return null;

  const summary = verification.summary;
  const previousStatus = verification.status;

  // Determine final status based on items
  if (summary.rejectedItems > 0) {
    verification.status = 'rejected';
  } else if (summary.discrepancyItems > 0) {
    verification.status = 'needs_correction';
  } else if (summary.pendingItems > 0) {
    verification.status = 'partially_verified';
  } else {
    verification.status = 'verified';
  }

  verification.completedAt = new Date();
  verification.completedBy = auditorId;
  verification.overallRemarks = overallRemarks;

  verification.revisionHistory.push({
    revisedAt: new Date(),
    revisedBy: auditorId,
    action: 'verification_completed',
    previousStatus,
    newStatus: verification.status,
    remarks: overallRemarks
  });

  await verification.save();

  // Update the source document status if needed
  await updateSourceDocumentStatus(verification);

  return verification;
}

/**
 * Request corrections
 */
export async function requestCorrections(
  verificationId: string,
  auditorId: string,
  items: { field: string; currentValue: any; expectedValue?: any; reason: string }[],
  correctionDeadline?: Date
): Promise<IComplianceVerification | null> {
  const verification = await ComplianceVerification.findById(verificationId);
  if (!verification) return null;

  verification.status = 'needs_correction';
  verification.correctionsRequested = {
    requestedAt: new Date(),
    requestedBy: auditorId,
    items,
    correctionDeadline,
    correctionStatus: 'pending'
  };

  verification.revisionHistory.push({
    revisedAt: new Date(),
    revisedBy: auditorId,
    action: 'corrections_requested',
    previousStatus: verification.status,
    newStatus: 'needs_correction',
    remarks: `${items.length} correction(s) requested`
  });

  await verification.save();
  return verification;
}

// ================= Tax Declaration Verification =================

/**
 * Create verification request for tax declaration
 */
export async function createTaxDeclarationVerification(
  tenantId: string,
  declarationId: string,
  auditorId?: string,
  auditorName?: string
): Promise<IComplianceVerification> {
  const declaration = await TaxDeclaration.findById(declarationId);
  if (!declaration) {
    throw new Error('Tax declaration not found');
  }

  // Build verification items from declaration
  const verificationItems: IVerificationItem[] = [];

  // Section 80C deductions
  declaration.section80C.deductions.forEach((d, i) => {
    verificationItems.push({
      field: `section80C.deductions[${i}] - ${d.type}`,
      declaredValue: d.declaredAmount,
      status: 'pending'
    });
  });

  // Section 80D
  declaration.section80D.deductions.forEach((d, i) => {
    verificationItems.push({
      field: `section80D.deductions[${i}] - ${d.type}`,
      declaredValue: d.declaredAmount,
      status: 'pending'
    });
  });

  // HRA
  if (declaration.hraExemption?.rentPaidMonthly) {
    verificationItems.push({
      field: 'hraExemption.rentPaidMonthly',
      declaredValue: declaration.hraExemption.rentPaidMonthly,
      status: 'pending'
    });
  }

  // Home loan
  if (declaration.homeLoanInterest?.interestPaidAnnual) {
    verificationItems.push({
      field: 'homeLoanInterest.interestPaidAnnual',
      declaredValue: declaration.homeLoanInterest.interestPaidAnnual,
      status: 'pending'
    });
  }

  // Previous employment
  declaration.previousEmployment?.forEach((pe, i) => {
    verificationItems.push({
      field: `previousEmployment[${i}] - ${pe.employerName}`,
      declaredValue: { grossSalary: pe.grossSalary, taxDeducted: pe.taxDeducted },
      status: 'pending'
    });
  });

  return createComplianceVerification(
    tenantId,
    'tax_declaration',
    declarationId,
    'TaxDeclaration',
    declaration.financialYear,
    verificationItems,
    {
      employeeId: declaration.employeeId,
      assignedTo: auditorId,
      assignedToName: auditorName,
      submittedBy: declaration.employeeId
    }
  );
}

/**
 * Update source document status after verification
 */
async function updateSourceDocumentStatus(verification: IComplianceVerification): Promise<void> {
  if (verification.sourceDocumentType === 'TaxDeclaration') {
    const declaration = await TaxDeclaration.findById(verification.sourceDocumentId);
    if (declaration) {
      if (verification.status === 'verified') {
        declaration.status = 'approved';
        declaration.approvedAt = new Date();
        declaration.approvedBy = verification.completedBy;
      } else if (verification.status === 'rejected') {
        declaration.status = 'rejected';
      } else if (verification.status === 'needs_correction') {
        declaration.status = 'under_review';
      }
      declaration.comments = verification.overallRemarks;
      await declaration.save();
    }
  }
}

// ================= Utilities =================

function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Financial year starts in April
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Get auditor dashboard stats
 */
export async function getAuditorDashboardStats(auditorId: string): Promise<{
  assignedTenants: number;
  pendingVerifications: number;
  inReviewVerifications: number;
  completedThisMonth: number;
  overdueVerifications: number;
}> {
  const assignments = await AuditorAssignment.countDocuments({
    auditorId,
    status: 'active'
  });

  const pending = await ComplianceVerification.countDocuments({
    assignedTo: auditorId,
    status: 'pending'
  });

  const inReview = await ComplianceVerification.countDocuments({
    assignedTo: auditorId,
    status: 'in_review'
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const completedThisMonth = await ComplianceVerification.countDocuments({
    assignedTo: auditorId,
    status: 'verified',
    completedAt: { $gte: startOfMonth }
  });

  const overdue = await ComplianceVerification.countDocuments({
    assignedTo: auditorId,
    status: { $in: ['pending', 'in_review'] },
    dueDate: { $lt: new Date() }
  });

  return {
    assignedTenants: assignments,
    pendingVerifications: pending,
    inReviewVerifications: inReview,
    completedThisMonth,
    overdueVerifications: overdue
  };
}

export default {
  // Assignment management
  assignAuditor,
  getAuditorAssignments,
  getTenantAuditors,
  checkAuditorAccess,
  revokeAuditorAssignment,
  updateAuditorScope,
  // Verification management
  createComplianceVerification,
  getAuditorVerifications,
  getTenantVerifications,
  startVerificationReview,
  updateVerificationItem,
  completeVerification,
  requestCorrections,
  createTaxDeclarationVerification,
  // Dashboard
  getAuditorDashboardStats
};
