import mongoose, { Document, Schema } from 'mongoose';

export interface IPolicyAcknowledgement extends Document {
  tenantId: mongoose.Types.ObjectId;
  policyId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  acknowledgedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  signature?: string;
  comments?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const policyAcknowledgementSchema = new Schema<IPolicyAcknowledgement>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    policyId: { type: Schema.Types.ObjectId, required: true, ref: 'Policy' },
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    acknowledgedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    signature: String,
    comments: String,
    version: { type: String, required: true },
  },
  { timestamps: true }
);

policyAcknowledgementSchema.index({ tenantId: 1, policyId: 1, employeeId: 1 }, { unique: true });
policyAcknowledgementSchema.index({ tenantId: 1, employeeId: 1 });

export default mongoose.model<IPolicyAcknowledgement>('PolicyAcknowledgement', policyAcknowledgementSchema);
