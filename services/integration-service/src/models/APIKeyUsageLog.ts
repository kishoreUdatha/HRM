import mongoose, { Document, Schema } from 'mongoose';

export interface IAPIKeyUsageLog extends Document {
  tenantId: string;
  apiKeyId: mongoose.Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  requestBody?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
}

const APIKeyUsageLogSchema = new Schema<IAPIKeyUsageLog>({
  tenantId: { type: String, required: true, index: true },
  apiKeyId: { type: Schema.Types.ObjectId, required: true, ref: 'APIKey', index: true },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true },
  ipAddress: { type: String, required: true },
  userAgent: String,
  requestBody: Schema.Types.Mixed,
  errorMessage: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// TTL index - auto-delete logs after 90 days
APIKeyUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound index for analytics queries
APIKeyUsageLogSchema.index({ apiKeyId: 1, createdAt: -1 });
APIKeyUsageLogSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IAPIKeyUsageLog>('APIKeyUsageLog', APIKeyUsageLogSchema);
