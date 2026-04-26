import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EmployeeFundAccount from '../models/EmployeeFundAccount';
import PayoutAuditLog from '../models/PayoutAuditLog';
import razorpayPayoutService from '../services/razorpayPayoutService';
import { handlePayoutStatusUpdate } from '../services/payoutProcessingService';

interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payout?: {
      entity: {
        id: string;
        entity: string;
        fund_account_id: string;
        amount: number;
        currency: string;
        fees: number;
        tax: number;
        status: string;
        purpose: string;
        utr: string | null;
        mode: string;
        reference_id: string;
        narration: string;
        failure_reason: string | null;
        notes: Record<string, string>;
        created_at: number;
      };
    };
    fund_account?: {
      entity: {
        id: string;
        entity: string;
        contact_id: string;
        account_type: string;
        active: boolean;
      };
    };
    validation?: {
      entity: {
        id: string;
        fund_account_id: string;
        status: string;
        results: {
          account_status: string;
          registered_name: string;
        };
      };
    };
  };
  created_at: number;
}

/**
 * Handle Razorpay webhook events
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const body = req.body.toString();

    // Parse payload to get account_id for tenant lookup
    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      res.status(400).json({ success: false, message: 'Invalid JSON payload' });
      return;
    }

    // Get tenant ID from notes or lookup by account_id
    // For now, we'll try to find the tenant from the payout notes
    const tenantId = await findTenantFromPayload(payload);

    if (!tenantId) {
      console.warn('Could not determine tenant for webhook:', payload.event);
      // Still acknowledge the webhook to prevent retries
      res.status(200).json({ success: true, message: 'Webhook received' });
      return;
    }

    // Verify signature
    const isValid = await razorpayPayoutService.verifyWebhookSignature(tenantId, body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature for tenant:', tenantId);
      res.status(400).json({ success: false, message: 'Invalid signature' });
      return;
    }

    console.log(`Received webhook: ${payload.event} for tenant: ${tenantId}`);

    // Handle different event types
    switch (payload.event) {
      case 'payout.processed':
        await handlePayoutProcessed(tenantId, payload);
        break;

      case 'payout.reversed':
        await handlePayoutReversed(tenantId, payload);
        break;

      case 'payout.rejected':
      case 'payout.cancelled':
        await handlePayoutFailed(tenantId, payload);
        break;

      case 'payout.pending':
      case 'payout.processing':
      case 'payout.queued':
        await handlePayoutStatusChange(tenantId, payload);
        break;

      case 'fund_account.validation.completed':
        await handleFundAccountValidated(tenantId, payload);
        break;

      case 'fund_account.validation.failed':
        await handleFundAccountValidationFailed(tenantId, payload);
        break;

      default:
        console.log(`Unhandled webhook event: ${payload.event}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // Still return 200 to acknowledge receipt and prevent retries
    res.status(200).json({ success: true, message: 'Webhook received with errors' });
  }
};

/**
 * Find tenant ID from webhook payload
 */
const findTenantFromPayload = async (payload: RazorpayWebhookPayload): Promise<string | null> => {
  // Try to get from payout notes
  if (payload.payload.payout?.entity.notes?.tenantId) {
    return payload.payload.payout.entity.notes.tenantId;
  }

  // Try to find from fund account
  if (payload.payload.fund_account?.entity.id) {
    const fundAccount = await EmployeeFundAccount.findOne({
      razorpayFundAccountId: payload.payload.fund_account.entity.id,
    });
    if (fundAccount) {
      return fundAccount.tenantId.toString();
    }
  }

  // Try from validation fund account ID
  if (payload.payload.validation?.entity.fund_account_id) {
    const fundAccount = await EmployeeFundAccount.findOne({
      razorpayFundAccountId: payload.payload.validation.entity.fund_account_id,
    });
    if (fundAccount) {
      return fundAccount.tenantId.toString();
    }
  }

  return null;
};

/**
 * Handle payout.processed event
 */
const handlePayoutProcessed = async (tenantId: string, payload: RazorpayWebhookPayload): Promise<void> => {
  const payoutEntity = payload.payload.payout?.entity;
  if (!payoutEntity) return;

  await handlePayoutStatusUpdate(
    tenantId,
    payoutEntity.id,
    'processed',
    payoutEntity.utr || undefined
  );

  console.log(`Payout processed: ${payoutEntity.id}, UTR: ${payoutEntity.utr}`);
};

/**
 * Handle payout.reversed event
 */
const handlePayoutReversed = async (tenantId: string, payload: RazorpayWebhookPayload): Promise<void> => {
  const payoutEntity = payload.payload.payout?.entity;
  if (!payoutEntity) return;

  await handlePayoutStatusUpdate(
    tenantId,
    payoutEntity.id,
    'reversed',
    payoutEntity.utr || undefined,
    payoutEntity.failure_reason || 'Payout reversed'
  );

  console.log(`Payout reversed: ${payoutEntity.id}`);
};

/**
 * Handle payout.rejected or payout.cancelled event
 */
const handlePayoutFailed = async (tenantId: string, payload: RazorpayWebhookPayload): Promise<void> => {
  const payoutEntity = payload.payload.payout?.entity;
  if (!payoutEntity) return;

  await handlePayoutStatusUpdate(
    tenantId,
    payoutEntity.id,
    payoutEntity.status,
    undefined,
    payoutEntity.failure_reason || `Payout ${payoutEntity.status}`
  );

  console.log(`Payout failed: ${payoutEntity.id}, reason: ${payoutEntity.failure_reason}`);
};

/**
 * Handle payout status change (pending, processing, queued)
 */
const handlePayoutStatusChange = async (tenantId: string, payload: RazorpayWebhookPayload): Promise<void> => {
  const payoutEntity = payload.payload.payout?.entity;
  if (!payoutEntity) return;

  await handlePayoutStatusUpdate(
    tenantId,
    payoutEntity.id,
    payoutEntity.status
  );

  console.log(`Payout status changed: ${payoutEntity.id} -> ${payoutEntity.status}`);
};

/**
 * Handle fund_account.validation.completed event
 */
const handleFundAccountValidated = async (tenantId: string, payload: RazorpayWebhookPayload): Promise<void> => {
  const validation = payload.payload.validation?.entity;
  if (!validation) return;

  const fundAccount = await EmployeeFundAccount.findOne({
    razorpayFundAccountId: validation.fund_account_id,
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!fundAccount) {
    console.warn(`Fund account not found: ${validation.fund_account_id}`);
    return;
  }

  fundAccount.verificationStatus = 'verified';
  fundAccount.verifiedAt = new Date();
  fundAccount.verificationDetails = {
    method: 'penny_drop',
    transactionId: validation.id,
  };

  await fundAccount.save();

  // Create audit log
  await PayoutAuditLog.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    fundAccountId: fundAccount._id,
    action: 'fund_account_verified',
    performedBy: new mongoose.Types.ObjectId(), // System
    newStatus: 'verified',
    details: {
      registeredName: validation.results?.registered_name,
      accountStatus: validation.results?.account_status,
    },
  });

  console.log(`Fund account verified: ${fundAccount._id}`);
};

/**
 * Handle fund_account.validation.failed event
 */
const handleFundAccountValidationFailed = async (tenantId: string, payload: RazorpayWebhookPayload): Promise<void> => {
  const validation = payload.payload.validation?.entity;
  if (!validation) return;

  const fundAccount = await EmployeeFundAccount.findOne({
    razorpayFundAccountId: validation.fund_account_id,
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!fundAccount) {
    console.warn(`Fund account not found: ${validation.fund_account_id}`);
    return;
  }

  fundAccount.verificationStatus = 'failed';
  fundAccount.verificationDetails = {
    method: 'penny_drop',
    transactionId: validation.id,
    failureReason: 'Validation failed',
  };

  await fundAccount.save();

  // Create audit log
  await PayoutAuditLog.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    fundAccountId: fundAccount._id,
    action: 'fund_account_failed',
    performedBy: new mongoose.Types.ObjectId(), // System
    newStatus: 'failed',
    details: {
      reason: 'Validation failed',
    },
  });

  console.log(`Fund account validation failed: ${fundAccount._id}`);
};
