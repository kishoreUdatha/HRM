import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PayoutConfig from '../models/PayoutConfig';
import PayoutAuditLog from '../models/PayoutAuditLog';
import razorpayPayoutService from '../services/razorpayPayoutService';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * Get payout configuration for tenant
 */
export const getConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    console.log('[getConfig] tenantId:', tenantId);
    console.log('[getConfig] mongoose connection state:', mongoose.connection.readyState);

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    console.log('[getConfig] About to call PayoutConfig.findOne');
    const config = await PayoutConfig.findOne({ tenantId });
    console.log('[getConfig] Query completed, result:', config ? 'found' : 'null');

    if (!config) {
      res.json({
        success: true,
        data: null,
        message: 'Payout configuration not found. Please configure payouts.',
      });
      return;
    }

    // Don't expose encrypted credentials
    const safeConfig = {
      _id: config._id,
      tenantId: config.tenantId,
      razorpayAccountId: config.razorpayAccountId,
      hasCredentials: !!config.razorpayKeyId && !!config.razorpayKeySecret,
      payoutMode: config.payoutMode,
      scheduledDay: config.scheduledDay,
      scheduledTime: config.scheduledTime,
      defaultPayoutMethod: config.defaultPayoutMethod,
      impsThreshold: config.impsThreshold,
      rtgsThreshold: config.rtgsThreshold,
      requireApproval: config.requireApproval,
      approverRoles: config.approverRoles,
      minApprovers: config.minApprovers,
      notifyEmployeeOnPayout: config.notifyEmployeeOnPayout,
      notifyHROnFailure: config.notifyHROnFailure,
      notifyOnBatchComplete: config.notifyOnBatchComplete,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    res.json({ success: true, data: safeConfig });
  } catch (error: any) {
    console.error('Error fetching config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create or update payout configuration
 */
export const upsertConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const {
      razorpayAccountId,
      razorpayKeyId,
      razorpayKeySecret,
      webhookSecret,
      payoutMode,
      scheduledDay,
      scheduledTime,
      defaultPayoutMethod,
      impsThreshold,
      rtgsThreshold,
      requireApproval,
      approverRoles,
      minApprovers,
      notifyEmployeeOnPayout,
      notifyHROnFailure,
      notifyOnBatchComplete,
    } = req.body;

    let config = await PayoutConfig.findOne({ tenantId });
    const isNew = !config;

    if (!config) {
      config = new PayoutConfig({ tenantId });
    }

    // Update fields
    if (razorpayAccountId !== undefined) config.razorpayAccountId = razorpayAccountId;
    if (razorpayKeyId !== undefined) config.razorpayKeyId = encrypt(razorpayKeyId);
    if (razorpayKeySecret !== undefined) config.razorpayKeySecret = encrypt(razorpayKeySecret);
    if (webhookSecret !== undefined) config.webhookSecret = encrypt(webhookSecret);
    if (payoutMode !== undefined) config.payoutMode = payoutMode;
    if (scheduledDay !== undefined) config.scheduledDay = scheduledDay;
    if (scheduledTime !== undefined) config.scheduledTime = scheduledTime;
    if (defaultPayoutMethod !== undefined) config.defaultPayoutMethod = defaultPayoutMethod;
    if (impsThreshold !== undefined) config.impsThreshold = impsThreshold;
    if (rtgsThreshold !== undefined) config.rtgsThreshold = rtgsThreshold;
    if (requireApproval !== undefined) config.requireApproval = requireApproval;
    if (approverRoles !== undefined) config.approverRoles = approverRoles;
    if (minApprovers !== undefined) config.minApprovers = minApprovers;
    if (notifyEmployeeOnPayout !== undefined) config.notifyEmployeeOnPayout = notifyEmployeeOnPayout;
    if (notifyHROnFailure !== undefined) config.notifyHROnFailure = notifyHROnFailure;
    if (notifyOnBatchComplete !== undefined) config.notifyOnBatchComplete = notifyOnBatchComplete;

    await config.save();

    // Clear cached Razorpay client
    razorpayPayoutService.clearTenantCache(tenantId);

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      action: isNew ? 'config_created' : 'config_updated',
      performedBy: new mongoose.Types.ObjectId(userId),
      details: {
        payoutMode: config.payoutMode,
        requireApproval: config.requireApproval,
      },
    });

    res.json({
      success: true,
      message: isNew ? 'Payout configuration created' : 'Payout configuration updated',
      data: {
        _id: config._id,
        payoutMode: config.payoutMode,
        hasCredentials: !!config.razorpayKeyId,
      },
    });
  } catch (error: any) {
    console.error('Error upserting config:', error.message);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Razorpay credentials only
 */
export const updateCredentials = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { razorpayAccountId, razorpayKeyId, razorpayKeySecret, webhookSecret } = req.body;

    if (!razorpayAccountId || !razorpayKeyId || !razorpayKeySecret) {
      res.status(400).json({
        success: false,
        message: 'Account ID, Key ID, and Key Secret are required',
      });
      return;
    }

    let config = await PayoutConfig.findOne({ tenantId });

    if (!config) {
      config = new PayoutConfig({ tenantId });
    }

    config.razorpayAccountId = razorpayAccountId;
    config.razorpayKeyId = encrypt(razorpayKeyId);
    config.razorpayKeySecret = encrypt(razorpayKeySecret);
    if (webhookSecret) {
      config.webhookSecret = encrypt(webhookSecret);
    }

    await config.save();

    // Clear cached Razorpay client
    razorpayPayoutService.clearTenantCache(tenantId);

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      action: 'config_updated',
      performedBy: new mongoose.Types.ObjectId(userId),
      details: { credentialsUpdated: true },
    });

    res.json({
      success: true,
      message: 'Razorpay credentials updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating credentials:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Test Razorpay connection
 */
export const testConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    // Try to get account balance as a connection test
    const balance = await razorpayPayoutService.getAccountBalance(tenantId);

    res.json({
      success: true,
      message: 'Connection successful',
      data: {
        balance: balance.balance / 100, // Convert paise to INR
        currency: balance.currency,
      },
    });
  } catch (error: any) {
    console.error('Connection test failed:', error);
    res.status(400).json({
      success: false,
      message: 'Connection failed: ' + (error.message || 'Invalid credentials'),
    });
  }
};

/**
 * Update workflow settings
 */
export const updateWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { payoutMode, scheduledDay, scheduledTime, requireApproval, approverRoles, minApprovers } = req.body;

    const config = await PayoutConfig.findOne({ tenantId });

    if (!config) {
      res.status(404).json({ success: false, message: 'Payout configuration not found' });
      return;
    }

    // Validate scheduled mode requirements
    if (payoutMode === 'scheduled' && (!scheduledDay || !scheduledTime)) {
      res.status(400).json({
        success: false,
        message: 'Scheduled day and time are required for scheduled mode',
      });
      return;
    }

    if (payoutMode !== undefined) config.payoutMode = payoutMode;
    if (scheduledDay !== undefined) config.scheduledDay = scheduledDay;
    if (scheduledTime !== undefined) config.scheduledTime = scheduledTime;
    if (requireApproval !== undefined) config.requireApproval = requireApproval;
    if (approverRoles !== undefined) config.approverRoles = approverRoles;
    if (minApprovers !== undefined) config.minApprovers = minApprovers;

    await config.save();

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      action: 'config_updated',
      performedBy: new mongoose.Types.ObjectId(userId),
      details: {
        payoutMode: config.payoutMode,
        scheduledDay: config.scheduledDay,
        scheduledTime: config.scheduledTime,
        requireApproval: config.requireApproval,
      },
    });

    res.json({
      success: true,
      message: 'Workflow settings updated',
      data: {
        payoutMode: config.payoutMode,
        scheduledDay: config.scheduledDay,
        scheduledTime: config.scheduledTime,
        requireApproval: config.requireApproval,
      },
    });
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
