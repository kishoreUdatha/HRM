import { Request, Response } from 'express';
import Subscription from '../models/Subscription';
import Invoice from '../models/Invoice';
import razorpayService from '../services/razorpayService';
import mongoose from 'mongoose';

// Razorpay webhook handler
export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      res.status(400).json({ success: false, message: 'Invalid signature' });
      return;
    }

    const event = req.body;
    const eventType = event.event;

    console.log(`Received webhook event: ${eventType}`);

    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case 'subscription.authenticated':
        await handleSubscriptionAuthenticated(event.payload.subscription.entity);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(event.payload.subscription.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity, event.payload.payment?.entity);
        break;

      case 'subscription.pending':
        await handleSubscriptionPending(event.payload.subscription.entity);
        break;

      case 'subscription.halted':
        await handleSubscriptionHalted(event.payload.subscription.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;

      case 'subscription.completed':
        await handleSubscriptionCompleted(event.payload.subscription.entity);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.payload.invoice.entity);
        break;

      case 'invoice.expired':
        await handleInvoiceExpired(event.payload.invoice.entity);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// Handle payment.captured event
async function handlePaymentCaptured(payment: any) {
  console.log('Payment captured:', payment.id);

  const tenantId = payment.notes?.tenantId;
  if (!tenantId) {
    console.log('No tenantId in payment notes, skipping');
    return;
  }

  // Update subscription if this is a subscription payment
  if (payment.notes?.plan) {
    const subscription = await Subscription.findOne({ tenantId });
    if (subscription) {
      subscription.status = 'active';
      const now = new Date();
      subscription.currentPeriodStart = now;

      const periodEnd = new Date();
      if (subscription.billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      subscription.currentPeriodEnd = periodEnd;

      await subscription.save();
      console.log(`Subscription ${subscription._id} activated`);
    }
  }
}

// Handle payment.failed event
async function handlePaymentFailed(payment: any) {
  console.log('Payment failed:', payment.id);

  const tenantId = payment.notes?.tenantId;
  if (!tenantId) return;

  // You could notify the tenant about the failed payment here
  // Or update their subscription status
}

// Handle subscription.authenticated event
async function handleSubscriptionAuthenticated(subscription: any) {
  console.log('Subscription authenticated:', subscription.id);

  const tenantId = subscription.notes?.tenantId;
  if (!tenantId) return;

  await Subscription.findOneAndUpdate(
    { tenantId },
    {
      razorpaySubscriptionId: subscription.id,
      status: 'authenticated',
    }
  );
}

// Handle subscription.activated event
async function handleSubscriptionActivated(subscription: any) {
  console.log('Subscription activated:', subscription.id);

  const tenantId = subscription.notes?.tenantId;
  if (!tenantId) return;

  const now = new Date();
  const periodEnd = new Date(subscription.current_end * 1000);

  await Subscription.findOneAndUpdate(
    { tenantId },
    {
      razorpaySubscriptionId: subscription.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    }
  );
}

// Handle subscription.charged event
async function handleSubscriptionCharged(subscription: any, payment: any) {
  console.log('Subscription charged:', subscription.id);

  const tenantId = subscription.notes?.tenantId;
  if (!tenantId) return;

  // Update subscription period
  const sub = await Subscription.findOne({ tenantId });
  if (sub) {
    sub.currentPeriodStart = new Date(subscription.current_start * 1000);
    sub.currentPeriodEnd = new Date(subscription.current_end * 1000);
    sub.status = 'active';
    await sub.save();

    // Create invoice record
    if (payment) {
      await Invoice.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        subscriptionId: sub._id,
        razorpayPaymentId: payment.id,
        invoiceNumber: `INV-${Date.now()}`,
        amount: payment.amount / 100,
        amountPaid: payment.amount / 100,
        amountDue: 0,
        currency: payment.currency,
        status: 'paid',
        billingPeriodStart: sub.currentPeriodStart,
        billingPeriodEnd: sub.currentPeriodEnd,
        dueDate: new Date(),
        paidAt: new Date(),
        lineItems: [
          {
            description: `${sub.plan} Plan - ${sub.billingCycle}`,
            quantity: 1,
            unitAmount: payment.amount / 100,
            amount: payment.amount / 100,
          },
        ],
      });
    }
  }
}

// Handle subscription.pending event
async function handleSubscriptionPending(subscription: any) {
  console.log('Subscription pending:', subscription.id);

  const tenantId = subscription.notes?.tenantId;
  if (!tenantId) return;

  await Subscription.findOneAndUpdate(
    { tenantId },
    { status: 'pending' }
  );
}

// Handle subscription.halted event
async function handleSubscriptionHalted(subscription: any) {
  console.log('Subscription halted:', subscription.id);

  const tenantId = subscription.notes?.tenantId;
  if (!tenantId) return;

  await Subscription.findOneAndUpdate(
    { tenantId },
    { status: 'halted' }
  );

  // You might want to limit tenant access here
}

// Handle subscription.cancelled event
async function handleSubscriptionCancelled(subscription: any) {
  console.log('Subscription cancelled:', subscription.id);

  const tenantId = subscription.notes?.tenantId;
  if (!tenantId) return;

  await Subscription.findOneAndUpdate(
    { tenantId },
    {
      status: 'cancelled',
      cancelledAt: new Date(),
    }
  );
}

// Handle subscription.completed event
async function handleSubscriptionCompleted(subscription: any) {
  console.log('Subscription completed:', subscription.id);

  const tenantId = subscription.notes?.tenantId;
  if (!tenantId) return;

  await Subscription.findOneAndUpdate(
    { tenantId },
    { status: 'completed' }
  );
}

// Handle invoice.paid event
async function handleInvoicePaid(invoice: any) {
  console.log('Invoice paid:', invoice.id);

  // Update invoice in our database if it exists
  await Invoice.findOneAndUpdate(
    { razorpayInvoiceId: invoice.id },
    {
      status: 'paid',
      amountPaid: invoice.amount_paid / 100,
      amountDue: invoice.amount_due / 100,
      paidAt: new Date(),
    }
  );
}

// Handle invoice.expired event
async function handleInvoiceExpired(invoice: any) {
  console.log('Invoice expired:', invoice.id);

  await Invoice.findOneAndUpdate(
    { razorpayInvoiceId: invoice.id },
    { status: 'expired' }
  );
}
