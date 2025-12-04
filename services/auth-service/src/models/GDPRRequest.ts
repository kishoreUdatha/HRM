import mongoose, { Document, Schema } from 'mongoose';

export interface IGDPRRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  type: 'data_export' | 'data_deletion' | 'data_rectification' | 'consent_withdrawal' | 'access_request';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  reason?: string;
  requestedData?: string[];
  exportUrl?: string;
  exportExpiresAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  completedAt?: Date;
  notes?: string;
  verificationToken?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GDPRRequestSchema = new Schema<IGDPRRequest>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  employeeId: { type: Schema.Types.ObjectId },
  type: { type: String, enum: ['data_export', 'data_deletion', 'data_rectification', 'consent_withdrawal', 'access_request'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' },
  reason: String,
  requestedData: [String],
  exportUrl: String,
  exportExpiresAt: Date,
  processedBy: Schema.Types.ObjectId,
  processedAt: Date,
  completedAt: Date,
  notes: String,
  verificationToken: String,
  verifiedAt: Date
}, { timestamps: true });

GDPRRequestSchema.index({ tenantId: 1, status: 1 });
GDPRRequestSchema.index({ tenantId: 1, userId: 1, type: 1 });

export default mongoose.model<IGDPRRequest>('GDPRRequest', GDPRRequestSchema);
