import mongoose, { Document, Schema } from 'mongoose';

export interface IHeadcountPlan extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  fiscalYear: number;
  quarter?: number;
  departmentId?: mongoose.Types.ObjectId;
  status: 'draft' | 'submitted' | 'approved' | 'active' | 'closed';
  summary: {
    currentHeadcount: number;
    plannedHires: number;
    plannedAttrition: number;
    projectedHeadcount: number;
    budgetAmount: number;
    currency: string;
  };
  positions: {
    positionId: mongoose.Types.ObjectId;
    title: string;
    currentCount: number;
    plannedCount: number;
    change: number;
    justification?: string;
    timeline?: { month: number; count: number }[];
    cost?: number;
  }[];
  assumptions?: string;
  risks?: string;
  approvalWorkflow: {
    level: number;
    approverId: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    actionDate?: Date;
    comments?: string;
  }[];
  submittedBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const headcountPlanSchema = new Schema<IHeadcountPlan>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    fiscalYear: { type: Number, required: true },
    quarter: Number,
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'active', 'closed'],
      default: 'draft',
    },
    summary: {
      currentHeadcount: { type: Number, default: 0 },
      plannedHires: { type: Number, default: 0 },
      plannedAttrition: { type: Number, default: 0 },
      projectedHeadcount: { type: Number, default: 0 },
      budgetAmount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    positions: [{
      positionId: Schema.Types.ObjectId,
      title: String,
      currentCount: Number,
      plannedCount: Number,
      change: Number,
      justification: String,
      timeline: [{ month: Number, count: Number }],
      cost: Number,
    }],
    assumptions: String,
    risks: String,
    approvalWorkflow: [{
      level: Number,
      approverId: Schema.Types.ObjectId,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      actionDate: Date,
      comments: String,
    }],
    submittedBy: Schema.Types.ObjectId,
    submittedAt: Date,
    approvedBy: Schema.Types.ObjectId,
    approvedAt: Date,
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

headcountPlanSchema.index({ tenantId: 1, fiscalYear: 1 });
headcountPlanSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IHeadcountPlan>('HeadcountPlan', headcountPlanSchema);
