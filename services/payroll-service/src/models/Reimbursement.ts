import mongoose, { Schema, Document } from 'mongoose';

export interface IReimbursementItem {
  description: string;
  category: string;
  amount: number;
  receiptNumber?: string;
  receiptDate: Date;
  receiptUrl?: string;
  approved: boolean;
  approvedAmount: number;
  rejectionReason?: string;
}

export interface IReimbursement extends Document {
  tenantId: string;
  employeeId: string;
  claimNumber: string;
  claimType: 'travel' | 'medical' | 'food' | 'accommodation' | 'telephone' | 'internet' | 'fuel' | 'books' | 'training' | 'relocation' | 'other';
  title: string;
  description?: string;
  items: IReimbursementItem[];
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  currency: string;
  claimPeriod: {
    startDate: Date;
    endDate: Date;
  };
  status: 'draft' | 'submitted' | 'pending_approval' | 'partially_approved' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  approvalWorkflow: Array<{
    level: number;
    approverRole: string;
    approverId?: string;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    comments?: string;
    actionDate?: Date;
    approvedAmount?: number;
  }>;
  currentApprovalLevel: number;
  maxApprovalLevel: number;
  submittedAt?: Date;
  finalApprovedAt?: Date;
  finalApprovedBy?: string;
  paidAt?: Date;
  paidInPayrollId?: string;
  paymentMode?: 'salary' | 'direct_transfer' | 'cash' | 'cheque';
  paymentReference?: string;
  taxable: boolean;
  policyId?: string;
  policyLimits?: {
    maxPerClaim: number;
    maxPerMonth: number;
    maxPerYear: number;
    usedThisMonth: number;
    usedThisYear: number;
    remainingThisMonth: number;
    remainingThisYear: number;
  };
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReimbursementItemSchema = new Schema({
  description: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  receiptNumber: String,
  receiptDate: { type: Date, required: true },
  receiptUrl: String,
  approved: { type: Boolean, default: false },
  approvedAmount: { type: Number, default: 0 },
  rejectionReason: String
}, { _id: false });

const ReimbursementSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  claimNumber: { type: String, required: true, unique: true },
  claimType: {
    type: String,
    enum: ['travel', 'medical', 'food', 'accommodation', 'telephone', 'internet', 'fuel', 'books', 'training', 'relocation', 'other'],
    required: true
  },
  title: { type: String, required: true },
  description: String,
  items: [ReimbursementItemSchema],
  totalClaimedAmount: { type: Number, required: true },
  totalApprovedAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  claimPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'pending_approval', 'partially_approved', 'approved', 'rejected', 'paid', 'cancelled'],
    default: 'draft'
  },
  approvalWorkflow: [{
    level: Number,
    approverRole: String,
    approverId: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date,
    approvedAmount: Number
  }],
  currentApprovalLevel: { type: Number, default: 0 },
  maxApprovalLevel: { type: Number, default: 1 },
  submittedAt: Date,
  finalApprovedAt: Date,
  finalApprovedBy: String,
  paidAt: Date,
  paidInPayrollId: String,
  paymentMode: {
    type: String,
    enum: ['salary', 'direct_transfer', 'cash', 'cheque']
  },
  paymentReference: String,
  taxable: { type: Boolean, default: false },
  policyId: String,
  policyLimits: {
    maxPerClaim: Number,
    maxPerMonth: Number,
    maxPerYear: Number,
    usedThisMonth: Number,
    usedThisYear: Number,
    remainingThisMonth: Number,
    remainingThisYear: Number
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: Date
  }],
  createdBy: { type: String, required: true }
}, { timestamps: true });

ReimbursementSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
ReimbursementSchema.index({ tenantId: 1, claimNumber: 1 });
ReimbursementSchema.index({ tenantId: 1, status: 1, currentApprovalLevel: 1 });

export default mongoose.model<IReimbursement>('Reimbursement', ReimbursementSchema);
