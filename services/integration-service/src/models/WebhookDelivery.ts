import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookDelivery extends Document {
  tenantId: string;
  webhookId: mongoose.Types.ObjectId;
  event: string;
  payload: Record<string, any>;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  response?: { statusCode: number; body: string; headers: Record<string, string> };
  error?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookDeliverySchema = new Schema<IWebhookDelivery>({
  tenantId: { type: String, required: true, index: true },
  webhookId: { type: Schema.Types.ObjectId, ref: 'Webhook', required: true },
  event: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed', 'retrying'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  lastAttempt: Date,
  nextRetry: Date,
  response: { statusCode: Number, body: String, headers: { type: Map, of: String } },
  error: String,
  duration: Number
}, { timestamps: true });

WebhookDeliverySchema.index({ tenantId: 1, webhookId: 1, status: 1 });
WebhookDeliverySchema.index({ status: 1, nextRetry: 1 });

export default mongoose.model<IWebhookDelivery>('WebhookDelivery', WebhookDeliverySchema);
