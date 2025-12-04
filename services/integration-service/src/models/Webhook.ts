import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhook extends Document {
  tenantId: string;
  name: string;
  description?: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  headers?: Record<string, string>;
  retryPolicy: { maxRetries: number; retryDelay: number; backoffMultiplier: number };
  filters?: { field: string; operator: string; value: any }[];
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  url: { type: String, required: true },
  secret: { type: String, required: true },
  events: [{ type: String, required: true }],
  isActive: { type: Boolean, default: true },
  headers: { type: Map, of: String },
  retryPolicy: {
    maxRetries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 5000 },
    backoffMultiplier: { type: Number, default: 2 }
  },
  filters: [{ field: String, operator: String, value: Schema.Types.Mixed }],
  lastTriggered: Date,
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, required: true }
}, { timestamps: true });

WebhookSchema.index({ tenantId: 1, events: 1, isActive: 1 });

export default mongoose.model<IWebhook>('Webhook', WebhookSchema);
