import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegration extends Document {
  tenantId: string;
  type: 'slack' | 'teams' | 'google_calendar' | 'outlook' | 'quickbooks' | 'xero' | 'custom';
  name: string;
  description?: string;
  isEnabled: boolean;
  config: {
    webhookUrl?: string;
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    baseUrl?: string;
    scopes?: string[];
    expiresAt?: Date;
  };
  syncSettings?: {
    enabled: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    lastSync?: Date;
    entities: string[];
  };
  mapping?: { sourceField: string; targetField: string; transform?: string }[];
  lastError?: string;
  errorCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>({
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['slack', 'teams', 'google_calendar', 'outlook', 'quickbooks', 'xero', 'custom'], required: true },
  name: { type: String, required: true },
  description: String,
  isEnabled: { type: Boolean, default: false },
  config: {
    webhookUrl: String,
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    clientId: String,
    clientSecret: { type: String, select: false },
    apiKey: { type: String, select: false },
    baseUrl: String,
    scopes: [String],
    expiresAt: Date
  },
  syncSettings: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['realtime', 'hourly', 'daily', 'weekly'], default: 'daily' },
    lastSync: Date,
    entities: [String]
  },
  mapping: [{ sourceField: String, targetField: String, transform: String }],
  lastError: String,
  errorCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, required: true }
}, { timestamps: true });

IntegrationSchema.index({ tenantId: 1, type: 1 });

export default mongoose.model<IIntegration>('Integration', IntegrationSchema);
