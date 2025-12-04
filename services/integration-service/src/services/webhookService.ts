import axios from 'axios';
import crypto from 'crypto';
import Webhook from '../models/Webhook';
import WebhookDelivery from '../models/WebhookDelivery';
import mongoose from 'mongoose';

export const WEBHOOK_EVENTS = [
  'employee.created', 'employee.updated', 'employee.deleted', 'employee.onboarded', 'employee.offboarded',
  'attendance.checkin', 'attendance.checkout', 'attendance.updated',
  'leave.requested', 'leave.approved', 'leave.rejected', 'leave.cancelled',
  'payroll.processed', 'payroll.paid',
  'document.uploaded', 'document.signed', 'document.deleted',
  'user.created', 'user.updated', 'user.deleted', 'user.login', 'user.logout'
];

export async function triggerWebhook(tenantId: string, event: string, payload: Record<string, any>): Promise<void> {
  const webhooks = await Webhook.find({ tenantId, events: event, isActive: true });

  for (const webhook of webhooks) {
    const delivery = new WebhookDelivery({
      tenantId,
      webhookId: webhook._id,
      event,
      payload,
      status: 'pending'
    });
    await delivery.save();

    deliverWebhook(delivery._id.toString(), webhook, payload, event);
  }
}

async function deliverWebhook(deliveryId: string, webhook: any, payload: Record<string, any>, event: string): Promise<void> {
  const delivery = await WebhookDelivery.findById(deliveryId);
  if (!delivery) return;

  const timestamp = Date.now();
  const signature = generateSignature(webhook.secret, timestamp, JSON.stringify(payload));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': timestamp.toString(),
    'X-Webhook-Event': event,
    'X-Webhook-Delivery': deliveryId,
    ...(webhook.headers || {})
  };

  const startTime = Date.now();

  try {
    const response = await axios.post(webhook.url, { event, payload, timestamp }, {
      headers,
      timeout: 30000
    });

    delivery.status = 'success';
    delivery.attempts++;
    delivery.lastAttempt = new Date();
    delivery.duration = Date.now() - startTime;
    delivery.response = {
      statusCode: response.status,
      body: typeof response.data === 'string' ? response.data.substring(0, 1000) : JSON.stringify(response.data).substring(0, 1000),
      headers: response.headers as Record<string, string>
    };
    await delivery.save();

    await Webhook.updateOne({ _id: webhook._id }, { $inc: { successCount: 1 }, lastTriggered: new Date() });
  } catch (error: any) {
    delivery.attempts++;
    delivery.lastAttempt = new Date();
    delivery.duration = Date.now() - startTime;
    delivery.error = error.message;

    if (error.response) {
      delivery.response = {
        statusCode: error.response.status,
        body: typeof error.response.data === 'string' ? error.response.data.substring(0, 1000) : JSON.stringify(error.response.data).substring(0, 1000),
        headers: error.response.headers
      };
    }

    if (delivery.attempts < webhook.retryPolicy.maxRetries) {
      delivery.status = 'retrying';
      delivery.nextRetry = new Date(Date.now() + webhook.retryPolicy.retryDelay * Math.pow(webhook.retryPolicy.backoffMultiplier, delivery.attempts - 1));
    } else {
      delivery.status = 'failed';
      await Webhook.updateOne({ _id: webhook._id }, { $inc: { failureCount: 1 } });
    }

    await delivery.save();
  }
}

function generateSignature(secret: string, timestamp: number, payload: string): string {
  const data = `${timestamp}.${payload}`;
  return `sha256=${crypto.createHmac('sha256', secret).update(data).digest('hex')}`;
}

export function verifySignature(secret: string, signature: string, timestamp: string, body: string): boolean {
  const expectedSignature = generateSignature(secret, parseInt(timestamp), body);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export async function retryFailedDeliveries(): Promise<void> {
  const deliveries = await WebhookDelivery.find({
    status: 'retrying',
    nextRetry: { $lte: new Date() }
  }).populate('webhookId');

  for (const delivery of deliveries) {
    if (delivery.webhookId) {
      await deliverWebhook(delivery._id.toString(), delivery.webhookId, delivery.payload, delivery.event);
    }
  }
}
