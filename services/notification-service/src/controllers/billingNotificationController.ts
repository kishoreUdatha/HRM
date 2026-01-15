import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import billingNotificationService from '../services/billingNotificationService';

// Send payment success email
export const sendPaymentSuccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { email, tenantName, planName, amount, currency, billingCycle, invoiceNumber, invoiceUrl, paymentDate, billingPeriodStart, billingPeriodEnd, lineItems, expiryDate } = req.body;

    const result = await billingNotificationService.sendPaymentSuccess(tenantId, email, {
      tenantName,
      tenantEmail: email,
      planName,
      amount,
      currency,
      billingCycle,
      invoiceNumber,
      invoiceUrl,
      paymentDate,
      billingPeriodStart,
      billingPeriodEnd,
      lineItems,
      expiryDate,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Error sending payment success email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// Send payment failed email
export const sendPaymentFailed = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { email, tenantName, planName, amount, currency, billingCycle } = req.body;

    const result = await billingNotificationService.sendPaymentFailed(tenantId, email, {
      tenantName,
      tenantEmail: email,
      planName,
      amount,
      currency,
      billingCycle,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Error sending payment failed email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// Send invoice generated email
export const sendInvoiceGenerated = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { email, tenantName, planName, amount, currency, billingCycle, invoiceNumber, invoiceUrl, paymentDate } = req.body;

    const result = await billingNotificationService.sendInvoiceGenerated(tenantId, email, {
      tenantName,
      tenantEmail: email,
      planName,
      amount,
      currency,
      billingCycle,
      invoiceNumber,
      invoiceUrl,
      paymentDate,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Error sending invoice generated email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// Send subscription activated email
export const sendSubscriptionActivated = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { email, tenantName, planName, amount, currency, billingCycle, expiryDate } = req.body;

    const result = await billingNotificationService.sendSubscriptionActivated(tenantId, email, {
      tenantName,
      tenantEmail: email,
      planName,
      amount,
      currency,
      billingCycle,
      expiryDate,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Error sending subscription activated email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// Send plan expiring email
export const sendPlanExpiring = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { email, tenantName, planName, amount, currency, billingCycle, expiryDate, daysUntilExpiry } = req.body;

    const result = await billingNotificationService.sendPlanExpiring(tenantId, email, {
      tenantName,
      tenantEmail: email,
      planName,
      amount,
      currency,
      billingCycle,
      expiryDate,
      daysUntilExpiry,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Error sending plan expiring email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// Send plan expired email
export const sendPlanExpired = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { email, tenantName, planName, expiryDate } = req.body;

    const result = await billingNotificationService.sendPlanExpired(tenantId, email, {
      tenantName,
      tenantEmail: email,
      planName,
      expiryDate,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Error sending plan expired email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// Send subscription cancelled email
export const sendSubscriptionCancelled = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { email, tenantName, planName, expiryDate } = req.body;

    const result = await billingNotificationService.sendSubscriptionCancelled(tenantId, email, {
      tenantName,
      tenantEmail: email,
      planName,
      expiryDate,
    });

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Error sending subscription cancelled email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};
