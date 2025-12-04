import Reimbursement, { IReimbursement, IReimbursementItem } from '../models/Reimbursement';
import { createAuditLog } from './auditService';

function generateClaimNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RMB-${timestamp}-${random}`;
}

export async function createReimbursement(
  tenantId: string,
  employeeId: string,
  data: {
    claimType: IReimbursement['claimType'];
    title: string;
    description?: string;
    items: IReimbursementItem[];
    claimPeriod: { startDate: Date; endDate: Date };
    currency?: string;
    createdBy: string;
  }
): Promise<IReimbursement> {
  const totalClaimedAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

  const reimbursement = new Reimbursement({
    tenantId,
    employeeId,
    claimNumber: generateClaimNumber(),
    ...data,
    totalClaimedAmount,
    status: 'draft'
  });

  await reimbursement.save();

  await createAuditLog({
    tenantId,
    entityType: 'reimbursement',
    entityId: reimbursement._id.toString(),
    action: 'create',
    performedBy: data.createdBy,
    newState: reimbursement.toObject(),
    metadata: {
      employeeId,
      amount: totalClaimedAmount
    }
  });

  return reimbursement;
}

export async function submitReimbursement(
  reimbursementId: string,
  submittedBy: string
): Promise<IReimbursement | null> {
  const reimbursement = await Reimbursement.findById(reimbursementId);
  if (!reimbursement) return null;

  const previousState = reimbursement.toObject();

  reimbursement.status = 'submitted';
  reimbursement.submittedAt = new Date();
  reimbursement.currentApprovalLevel = 1;

  await reimbursement.save();

  await createAuditLog({
    tenantId: reimbursement.tenantId,
    entityType: 'reimbursement',
    entityId: reimbursementId,
    action: 'submit',
    performedBy: submittedBy,
    previousState,
    newState: reimbursement.toObject(),
    metadata: {
      employeeId: reimbursement.employeeId,
      amount: reimbursement.totalClaimedAmount
    }
  });

  return reimbursement;
}

export async function approveReimbursement(
  reimbursementId: string,
  approverId: string,
  approval: {
    approved: boolean;
    comments?: string;
    itemApprovals?: Array<{ index: number; approved: boolean; approvedAmount: number; rejectionReason?: string }>;
  }
): Promise<IReimbursement | null> {
  const reimbursement = await Reimbursement.findById(reimbursementId);
  if (!reimbursement) return null;

  const previousState = reimbursement.toObject();

  // Update item approvals if provided
  if (approval.itemApprovals) {
    approval.itemApprovals.forEach(ia => {
      if (reimbursement.items[ia.index]) {
        reimbursement.items[ia.index].approved = ia.approved;
        reimbursement.items[ia.index].approvedAmount = ia.approvedAmount;
        if (!ia.approved && ia.rejectionReason) {
          reimbursement.items[ia.index].rejectionReason = ia.rejectionReason;
        }
      }
    });
  } else if (approval.approved) {
    // Auto-approve all items with full amounts
    reimbursement.items.forEach(item => {
      item.approved = true;
      item.approvedAmount = item.amount;
    });
  }

  // Calculate total approved amount
  reimbursement.totalApprovedAmount = reimbursement.items
    .filter(item => item.approved)
    .reduce((sum, item) => sum + item.approvedAmount, 0);

  // Update approval workflow
  const workflowEntry = reimbursement.approvalWorkflow.find(
    w => w.level === reimbursement.currentApprovalLevel && w.status === 'pending'
  );

  if (workflowEntry) {
    workflowEntry.status = approval.approved ? 'approved' : 'rejected';
    workflowEntry.approverId = approverId;
    workflowEntry.comments = approval.comments;
    workflowEntry.actionDate = new Date();
    workflowEntry.approvedAmount = reimbursement.totalApprovedAmount;
  }

  // Determine final status
  if (!approval.approved) {
    reimbursement.status = 'rejected';
  } else if (reimbursement.currentApprovalLevel >= reimbursement.maxApprovalLevel) {
    reimbursement.status = reimbursement.totalApprovedAmount < reimbursement.totalClaimedAmount
      ? 'partially_approved'
      : 'approved';
    reimbursement.finalApprovedAt = new Date();
    reimbursement.finalApprovedBy = approverId;
  } else {
    reimbursement.currentApprovalLevel += 1;
    reimbursement.status = 'pending_approval';
  }

  await reimbursement.save();

  await createAuditLog({
    tenantId: reimbursement.tenantId,
    entityType: 'reimbursement',
    entityId: reimbursementId,
    action: approval.approved ? 'approve' : 'reject',
    performedBy: approverId,
    previousState,
    newState: reimbursement.toObject(),
    metadata: {
      employeeId: reimbursement.employeeId,
      amount: reimbursement.totalApprovedAmount,
      comments: approval.comments
    }
  });

  return reimbursement;
}

export async function markReimbursementAsPaid(
  reimbursementId: string,
  paymentDetails: {
    payrollId?: string;
    paymentMode: IReimbursement['paymentMode'];
    paymentReference?: string;
  }
): Promise<IReimbursement | null> {
  const reimbursement = await Reimbursement.findById(reimbursementId);
  if (!reimbursement) return null;

  reimbursement.status = 'paid';
  reimbursement.paidAt = new Date();
  reimbursement.paidInPayrollId = paymentDetails.payrollId;
  reimbursement.paymentMode = paymentDetails.paymentMode;
  reimbursement.paymentReference = paymentDetails.paymentReference;

  await reimbursement.save();

  await createAuditLog({
    tenantId: reimbursement.tenantId,
    entityType: 'reimbursement',
    entityId: reimbursementId,
    action: 'pay',
    performedBy: 'system',
    newState: reimbursement.toObject(),
    metadata: {
      employeeId: reimbursement.employeeId,
      amount: reimbursement.totalApprovedAmount
    }
  });

  return reimbursement;
}

export async function getEmployeeReimbursements(
  tenantId: string,
  employeeId: string,
  filters?: {
    status?: IReimbursement['status'];
    claimType?: IReimbursement['claimType'];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<IReimbursement[]> {
  const query: any = { tenantId, employeeId };

  if (filters?.status) query.status = filters.status;
  if (filters?.claimType) query.claimType = filters.claimType;
  if (filters?.startDate || filters?.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  return Reimbursement.find(query).sort({ createdAt: -1 }).lean();
}

export async function getPendingApprovals(
  tenantId: string,
  approverRole?: string
): Promise<IReimbursement[]> {
  const query: any = {
    tenantId,
    status: { $in: ['submitted', 'pending_approval'] }
  };

  return Reimbursement.find(query).sort({ submittedAt: 1 }).lean();
}

export async function getApprovedReimbursementsForPayroll(
  tenantId: string,
  employeeId?: string
): Promise<IReimbursement[]> {
  const query: any = {
    tenantId,
    status: { $in: ['approved', 'partially_approved'] },
    paymentMode: 'salary',
    paidAt: null
  };

  if (employeeId) query.employeeId = employeeId;

  return Reimbursement.find(query).lean();
}

export async function cancelReimbursement(
  reimbursementId: string,
  cancelledBy: string,
  reason?: string
): Promise<IReimbursement | null> {
  const reimbursement = await Reimbursement.findById(reimbursementId);
  if (!reimbursement) return null;

  if (reimbursement.status === 'paid') {
    throw new Error('Cannot cancel a paid reimbursement');
  }

  const previousState = reimbursement.toObject();

  reimbursement.status = 'cancelled';
  await reimbursement.save();

  await createAuditLog({
    tenantId: reimbursement.tenantId,
    entityType: 'reimbursement',
    entityId: reimbursementId,
    action: 'cancel',
    performedBy: cancelledBy,
    previousState,
    newState: reimbursement.toObject(),
    metadata: {
      employeeId: reimbursement.employeeId,
      reason
    }
  });

  return reimbursement;
}

export async function getReimbursementSummary(
  tenantId: string,
  period?: { startDate: Date; endDate: Date }
): Promise<{
  totalClaims: number;
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  pendingApprovalCount: number;
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, { count: number; amount: number }>;
}> {
  const query: any = { tenantId };
  if (period) {
    query.createdAt = { $gte: period.startDate, $lte: period.endDate };
  }

  const reimbursements = await Reimbursement.find(query).lean();

  const statusBreakdown: Record<string, number> = {};
  const typeBreakdown: Record<string, { count: number; amount: number }> = {};

  let totalClaimedAmount = 0;
  let totalApprovedAmount = 0;
  let totalPaidAmount = 0;
  let pendingApprovalCount = 0;

  reimbursements.forEach(r => {
    statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;

    if (!typeBreakdown[r.claimType]) {
      typeBreakdown[r.claimType] = { count: 0, amount: 0 };
    }
    typeBreakdown[r.claimType].count += 1;
    typeBreakdown[r.claimType].amount += r.totalClaimedAmount;

    totalClaimedAmount += r.totalClaimedAmount;
    totalApprovedAmount += r.totalApprovedAmount;

    if (r.status === 'paid') {
      totalPaidAmount += r.totalApprovedAmount;
    }

    if (['submitted', 'pending_approval'].includes(r.status)) {
      pendingApprovalCount += 1;
    }
  });

  return {
    totalClaims: reimbursements.length,
    totalClaimedAmount,
    totalApprovedAmount,
    totalPaidAmount,
    pendingApprovalCount,
    statusBreakdown,
    typeBreakdown
  };
}

export async function updateReimbursement(
  reimbursementId: string,
  updates: Partial<IReimbursement>,
  updatedBy: string
): Promise<IReimbursement | null> {
  const reimbursement = await Reimbursement.findById(reimbursementId);
  if (!reimbursement) return null;

  if (!['draft', 'submitted'].includes(reimbursement.status)) {
    throw new Error('Can only update draft or submitted reimbursements');
  }

  const previousState = reimbursement.toObject();

  if (updates.items) {
    reimbursement.items = updates.items;
    reimbursement.totalClaimedAmount = updates.items.reduce((sum, item) => sum + item.amount, 0);
  }

  if (updates.title) reimbursement.title = updates.title;
  if (updates.description) reimbursement.description = updates.description;
  if (updates.claimPeriod) reimbursement.claimPeriod = updates.claimPeriod;

  await reimbursement.save();

  await createAuditLog({
    tenantId: reimbursement.tenantId,
    entityType: 'reimbursement',
    entityId: reimbursementId,
    action: 'update',
    performedBy: updatedBy,
    previousState,
    newState: reimbursement.toObject(),
    metadata: {
      employeeId: reimbursement.employeeId,
      amount: reimbursement.totalClaimedAmount
    }
  });

  return reimbursement;
}
