import mongoose, { Document, Schema } from 'mongoose';

export interface IAPIKey extends Document {
  tenantId: string;
  name: string;
  description?: string;
  key: string;
  keyHash: string;
  prefix: string;
  permissions: string[];
  rateLimit: { requests: number; window: number };
  ipWhitelist?: string[];
  expiresAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const APIKeySchema = new Schema<IAPIKey>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  key: { type: String, select: false },
  keyHash: { type: String, required: true },
  prefix: { type: String, required: true },
  permissions: [String],
  rateLimit: { requests: { type: Number, default: 1000 }, window: { type: Number, default: 3600 } },
  ipWhitelist: [String],
  expiresAt: Date,
  lastUsed: Date,
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, required: true }
}, { timestamps: true });

APIKeySchema.index({ keyHash: 1 });
APIKeySchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IAPIKey>('APIKey', APIKeySchema);
