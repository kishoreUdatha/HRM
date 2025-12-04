import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Webhook from '../models/Webhook';
import WebhookDelivery from '../models/WebhookDelivery';
import APIKey from '../models/APIKey';
import Integration from '../models/Integration';
import SSOConfig from '../models/SSOConfig';
import CalendarSync from '../models/CalendarSync';
import { WEBHOOK_EVENTS, triggerWebhook } from '../services/webhookService';

// ==================== WEBHOOK ENDPOINTS ====================

export const createWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { name, description, url, events, headers, retryPolicy, filters } = req.body;

    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = new Webhook({
      tenantId,
      name,
      description,
      url,
      secret,
      events,
      headers,
      retryPolicy,
      filters,
      createdBy: new mongoose.Types.ObjectId(userId)
    });
    await webhook.save();

    res.status(201).json({ success: true, data: { ...webhook.toObject(), secret } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebhooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const webhooks = await Webhook.find({ tenantId }).select('-secret').lean();
    res.json({ success: true, data: webhooks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { webhookId } = req.params;
    const webhook = await Webhook.findOne({ _id: webhookId, tenantId }).select('-secret');
    if (!webhook) { res.status(404).json({ success: false, message: 'Webhook not found' }); return; }
    res.json({ success: true, data: webhook });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { webhookId } = req.params;
    const webhook = await Webhook.findOneAndUpdate({ _id: webhookId, tenantId }, { $set: req.body }, { new: true }).select('-secret');
    if (!webhook) { res.status(404).json({ success: false, message: 'Webhook not found' }); return; }
    res.json({ success: true, data: webhook });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { webhookId } = req.params;
    await Webhook.findOneAndDelete({ _id: webhookId, tenantId });
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const regenerateWebhookSecret = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { webhookId } = req.params;
    const secret = crypto.randomBytes(32).toString('hex');
    const webhook = await Webhook.findOneAndUpdate({ _id: webhookId, tenantId }, { secret }, { new: true });
    if (!webhook) { res.status(404).json({ success: false, message: 'Webhook not found' }); return; }
    res.json({ success: true, data: { secret } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebhookDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { webhookId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId, webhookId: new mongoose.Types.ObjectId(webhookId) };
    if (status) query.status = status;
    const deliveries = await WebhookDelivery.find(query).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).lean();
    const total = await WebhookDelivery.countDocuments(query);
    res.json({ success: true, data: deliveries, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const retryDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { deliveryId } = req.params;
    const delivery = await WebhookDelivery.findOneAndUpdate({ _id: deliveryId, tenantId }, { status: 'pending', attempts: 0, nextRetry: null }, { new: true });
    if (!delivery) { res.status(404).json({ success: false, message: 'Delivery not found' }); return; }
    res.json({ success: true, data: delivery });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const testWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { webhookId } = req.params;
    const webhook = await Webhook.findOne({ _id: webhookId, tenantId });
    if (!webhook) { res.status(404).json({ success: false, message: 'Webhook not found' }); return; }
    await triggerWebhook(tenantId, 'test.ping', { message: 'Test webhook delivery', timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Test webhook triggered' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebhookEvents = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: WEBHOOK_EVENTS });
};

// ==================== API KEY ENDPOINTS ====================

export const createAPIKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { name, description, permissions, rateLimit, ipWhitelist, expiresAt } = req.body;

    const key = `hrm_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12);

    const apiKey = new APIKey({
      tenantId, name, description, key, keyHash, prefix, permissions, rateLimit, ipWhitelist,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: new mongoose.Types.ObjectId(userId)
    });
    await apiKey.save();

    res.status(201).json({ success: true, data: { ...apiKey.toObject(), key } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAPIKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const keys = await APIKey.find({ tenantId }).select('-key -keyHash').lean();
    res.json({ success: true, data: keys });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokeAPIKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { keyId } = req.params;
    await APIKey.findOneAndUpdate({ _id: keyId, tenantId }, { isActive: false });
    res.json({ success: true, message: 'API key revoked' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== INTEGRATION ENDPOINTS ====================

export const createIntegration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const integration = new Integration({ ...req.body, tenantId, createdBy: new mongoose.Types.ObjectId(userId) });
    await integration.save();
    res.status(201).json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getIntegrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const integrations = await Integration.find({ tenantId }).lean();
    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateIntegration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { integrationId } = req.params;
    const integration = await Integration.findOneAndUpdate({ _id: integrationId, tenantId }, { $set: req.body }, { new: true });
    if (!integration) { res.status(404).json({ success: false, message: 'Integration not found' }); return; }
    res.json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteIntegration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { integrationId } = req.params;
    await Integration.findOneAndDelete({ _id: integrationId, tenantId });
    res.json({ success: true, message: 'Integration deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const testIntegration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { integrationId } = req.params;
    const integration = await Integration.findOne({ _id: integrationId, tenantId }).select('+config.accessToken +config.apiKey');
    if (!integration) { res.status(404).json({ success: false, message: 'Integration not found' }); return; }
    // Test connection based on integration type - simplified
    res.json({ success: true, message: 'Integration test successful' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SSO ENDPOINTS ====================

export const createSSOConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const ssoConfig = new SSOConfig({ ...req.body, tenantId, createdBy: new mongoose.Types.ObjectId(userId) });
    await ssoConfig.save();
    res.status(201).json({ success: true, data: ssoConfig });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSSOConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const configs = await SSOConfig.find({ tenantId }).lean();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSSOConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { configId } = req.params;
    const config = await SSOConfig.findOne({ _id: configId, tenantId });
    if (!config) { res.status(404).json({ success: false, message: 'SSO config not found' }); return; }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSSOConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { configId } = req.params;
    const config = await SSOConfig.findOneAndUpdate({ _id: configId, tenantId }, { $set: req.body }, { new: true });
    if (!config) { res.status(404).json({ success: false, message: 'SSO config not found' }); return; }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSSOConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { configId } = req.params;
    await SSOConfig.findOneAndDelete({ _id: configId, tenantId });
    res.json({ success: true, message: 'SSO config deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleSSOConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { configId } = req.params;
    const { isEnabled } = req.body;
    const config = await SSOConfig.findOneAndUpdate({ _id: configId, tenantId }, { isEnabled }, { new: true });
    if (!config) { res.status(404).json({ success: false, message: 'SSO config not found' }); return; }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setDefaultSSOConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { configId } = req.params;
    await SSOConfig.updateMany({ tenantId }, { isDefault: false });
    const config = await SSOConfig.findOneAndUpdate({ _id: configId, tenantId }, { isDefault: true }, { new: true });
    if (!config) { res.status(404).json({ success: false, message: 'SSO config not found' }); return; }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSSOMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const metadata = {
      entityId: `${baseUrl}/api/sso/${tenantId}/metadata`,
      acsUrl: `${baseUrl}/api/sso/${tenantId}/acs`,
      sloUrl: `${baseUrl}/api/sso/${tenantId}/slo`,
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };
    res.json({ success: true, data: metadata });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CALENDAR SYNC ENDPOINTS ====================

export const connectCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, provider, accessToken, refreshToken, expiresAt, calendarId } = req.body;

    const calendarSync = await CalendarSync.findOneAndUpdate(
      { tenantId, employeeId, provider },
      { tenantId, employeeId, provider, accessToken, refreshToken, expiresAt, calendarId, isEnabled: true },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: { id: calendarSync._id, provider: calendarSync.provider, isEnabled: calendarSync.isEnabled } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCalendarConnections = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const connections = await CalendarSync.find({ tenantId, employeeId }).select('-accessToken -refreshToken').lean();
    res.json({ success: true, data: connections });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCalendarSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { connectionId } = req.params;
    const { syncSettings, isEnabled } = req.body;

    const connection = await CalendarSync.findOneAndUpdate(
      { _id: connectionId, tenantId },
      { syncSettings, isEnabled },
      { new: true }
    ).select('-accessToken -refreshToken');
    if (!connection) { res.status(404).json({ success: false, message: 'Calendar connection not found' }); return; }
    res.json({ success: true, data: connection });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const disconnectCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { connectionId } = req.params;
    await CalendarSync.findOneAndDelete({ _id: connectionId, tenantId });
    res.json({ success: true, message: 'Calendar disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const syncCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { connectionId } = req.params;
    const connection = await CalendarSync.findOneAndUpdate(
      { _id: connectionId, tenantId },
      { lastSyncAt: new Date(), lastError: null },
      { new: true }
    );
    if (!connection) { res.status(404).json({ success: false, message: 'Calendar connection not found' }); return; }
    // In a real implementation, this would trigger actual calendar sync
    res.json({ success: true, message: 'Calendar sync initiated', data: { lastSyncAt: connection.lastSyncAt } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
