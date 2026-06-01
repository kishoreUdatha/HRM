import mongoose, { Document, Schema } from 'mongoose';
import { API_KEY_SCOPES, APIKeyScope } from './APIKey';

export interface ITenantAPIConfig extends Document {
  tenantId: string;
  tenantName: string;
  allowedScopes: APIKeyScope[];
  maxKeys: number;
  maxRequestsPerDay: number;
  isAPIAccessEnabled: boolean;
  enabledEnvironments: ('production' | 'staging' | 'development')[];
  notes?: string;
  configuredBy: mongoose.Types.ObjectId;
  configuredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TenantAPIConfigSchema = new Schema<ITenantAPIConfig>({
  tenantId: { type: String, required: true, unique: true, index: true },
  tenantName: { type: String, required: true },
  allowedScopes: [{
    type: String,
    enum: API_KEY_SCOPES
  }],
  maxKeys: { type: Number, default: 5 },
  maxRequestsPerDay: { type: Number, default: 10000 },
  isAPIAccessEnabled: { type: Boolean, default: false },
  enabledEnvironments: [{
    type: String,
    enum: ['production', 'staging', 'development'],
    default: ['production']
  }],
  notes: String,
  configuredBy: { type: Schema.Types.ObjectId, required: true },
  configuredAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<ITenantAPIConfig>('TenantAPIConfig', TenantAPIConfigSchema);
