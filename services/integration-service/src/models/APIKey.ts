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
  environment: 'production' | 'staging' | 'development';
  lastUsed?: Date;
  usageCount: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: 'super_admin' | 'tenant_admin';
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Available permission scopes
export const API_KEY_SCOPES = [
  'employees:read',
  'employees:write',
  'attendance:read',
  'attendance:write',
  'leaves:read',
  'leaves:write',
  'payroll:read',
  'timesheets:read',
  'timesheets:write',
  'reports:read',
  '*' // Full access
] as const;

export type APIKeyScope = typeof API_KEY_SCOPES[number];

const APIKeySchema = new Schema<IAPIKey>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  key: { type: String, select: false },
  keyHash: { type: String, required: true },
  prefix: { type: String, required: true },
  permissions: [{ type: String, enum: API_KEY_SCOPES }],
  rateLimit: {
    requests: { type: Number, default: 1000 },
    window: { type: Number, default: 3600 }
  },
  ipWhitelist: [String],
  expiresAt: Date,
  environment: {
    type: String,
    enum: ['production', 'staging', 'development'],
    default: 'production'
  },
  lastUsed: Date,
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  createdByRole: {
    type: String,
    enum: ['super_admin', 'tenant_admin'],
    default: 'tenant_admin'
  },
  revokedAt: Date,
  revokedBy: Schema.Types.ObjectId,
  revokedReason: String
}, { timestamps: true });

APIKeySchema.index({ keyHash: 1 }, { unique: true });
APIKeySchema.index({ tenantId: 1, isActive: 1 });
APIKeySchema.index({ prefix: 1 });
APIKeySchema.index({ createdByRole: 1, isActive: 1 });

export default mongoose.model<IAPIKey>('APIKey', APIKeySchema);
