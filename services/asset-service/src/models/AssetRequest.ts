import mongoose, { Document, Schema } from 'mongoose';

export interface IAssetRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  requestNumber: string;
  employeeId: mongoose.Types.ObjectId;
  requestType: 'new' | 'replacement' | 'repair' | 'return' | 'upgrade';
  category: string;
  assetId?: mongoose.Types.ObjectId;
  justification: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  specifications?: Record<string, string>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  approvalWorkflow: {
    level: number;
    approverId: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    actionDate?: Date;
    comments?: string;
  }[];
  fulfilledAssetId?: mongoose.Types.ObjectId;
  fulfilledAt?: Date;
  fulfilledBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assetRequestSchema = new Schema<IAssetRequest>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    requestNumber: { type: String, required: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    requestType: {
      type: String,
      enum: ['new', 'replacement', 'repair', 'return', 'upgrade'],
      required: true,
    },
    category: { type: String, required: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    justification: { type: String, required: true },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    specifications: Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'fulfilled', 'cancelled'],
      default: 'draft',
    },
    approvalWorkflow: [{
      level: Number,
      approverId: Schema.Types.ObjectId,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      actionDate: Date,
      comments: String,
    }],
    fulfilledAssetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    fulfilledAt: Date,
    fulfilledBy: Schema.Types.ObjectId,
    submittedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

assetRequestSchema.index({ tenantId: 1, requestNumber: 1 }, { unique: true });
assetRequestSchema.index({ tenantId: 1, employeeId: 1 });
assetRequestSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IAssetRequest>('AssetRequest', assetRequestSchema);
