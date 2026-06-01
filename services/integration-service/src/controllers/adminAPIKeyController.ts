import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import APIKey, { API_KEY_SCOPES } from '../models/APIKey';
import APIKeyUsageLog from '../models/APIKeyUsageLog';
import TenantAPIConfig from '../models/TenantAPIConfig';

// ==================== SUPER ADMIN API KEY MANAGEMENT ====================

/**
 * Create a new API key for a tenant (super admin only)
 * POST /admin/api-keys
 */
export const createAPIKeyForTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only super_admin can create API keys for any tenant
    if (userRole !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admins can create API keys for tenants' });
      return;
    }

    const { tenantId, name, description, permissions, rateLimit, ipWhitelist, expiresAt, environment } = req.body;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'tenantId is required' });
      return;
    }

    if (!name) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }

    // Check tenant API configuration
    const tenantConfig = await TenantAPIConfig.findOne({ tenantId });
    if (!tenantConfig || !tenantConfig.isAPIAccessEnabled) {
      res.status(403).json({
        success: false,
        message: 'API access is not enabled for this tenant. Please configure tenant API permissions first.',
        requiresConfig: true
      });
      return;
    }

    // Check if tenant has reached max keys limit
    const activeKeyCount = await APIKey.countDocuments({ tenantId, isActive: true });
    if (activeKeyCount >= tenantConfig.maxKeys) {
      res.status(400).json({
        success: false,
        message: `Tenant has reached maximum API keys limit (${tenantConfig.maxKeys}). Revoke an existing key to create a new one.`
      });
      return;
    }

    // Check environment is allowed
    const env = environment || 'production';
    if (!tenantConfig.enabledEnvironments.includes(env)) {
      res.status(400).json({
        success: false,
        message: `Environment '${env}' is not enabled for this tenant. Allowed: ${tenantConfig.enabledEnvironments.join(', ')}`
      });
      return;
    }

    // Validate permissions against tenant's allowed scopes
    const requestedPerms = permissions && permissions.length > 0 ? permissions : ['*'];
    if (!requestedPerms.includes('*')) {
      const disallowedPerms = requestedPerms.filter((p: string) => !(tenantConfig.allowedScopes as string[]).includes(p));
      if (disallowedPerms.length > 0) {
        res.status(400).json({
          success: false,
          message: `Requested permissions not allowed for this tenant: ${disallowedPerms.join(', ')}`,
          allowedScopes: tenantConfig.allowedScopes
        });
        return;
      }
    } else if (!(tenantConfig.allowedScopes as string[]).includes('*')) {
      // If requesting full access but tenant doesn't have full access allowed
      res.status(400).json({
        success: false,
        message: 'Full access (*) is not allowed for this tenant. Please select specific scopes.',
        allowedScopes: tenantConfig.allowedScopes
      });
      return;
    }

    // Validate permissions
    if (permissions && permissions.length > 0) {
      const invalidScopes = permissions.filter((p: string) => !API_KEY_SCOPES.includes(p as any));
      if (invalidScopes.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid permission scopes: ${invalidScopes.join(', ')}`,
          validScopes: API_KEY_SCOPES
        });
        return;
      }
    }

    // Generate secure API key
    const key = `hrm_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12);

    const apiKey = new APIKey({
      tenantId,
      name,
      description,
      key, // Only stored temporarily, not returned after creation
      keyHash,
      prefix,
      permissions: permissions || ['*'],
      rateLimit: rateLimit || { requests: 1000, window: 3600 },
      ipWhitelist,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      environment: environment || 'production',
      createdBy: new mongoose.Types.ObjectId(userId),
      createdByRole: 'super_admin'
    });

    await apiKey.save();

    // Clear the stored key (we only keep the hash)
    await APIKey.updateOne({ _id: apiKey._id }, { $unset: { key: 1 } });

    res.status(201).json({
      success: true,
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
      data: {
        id: apiKey._id,
        tenantId: apiKey.tenantId,
        name: apiKey.name,
        description: apiKey.description,
        prefix: apiKey.prefix,
        key, // Only shown once at creation
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        ipWhitelist: apiKey.ipWhitelist,
        expiresAt: apiKey.expiresAt,
        environment: apiKey.environment,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error creating API key:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List all API keys (super admin can see all, with filters)
 * GET /admin/api-keys
 */
export const listAllAPIKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    console.log('[Admin API Keys] listAllAPIKeys called, role:', userRole);

    if (userRole !== 'super_admin') {
      console.log('[Admin API Keys] Access denied - not super_admin, role was:', userRole);
      res.status(403).json({ success: false, message: 'Only super admins can list all API keys' });
      return;
    }

    const { tenantId, isActive, environment, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (tenantId) query.tenantId = tenantId;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (environment) query.environment = environment;

    console.log('[Admin API Keys] Query:', JSON.stringify(query));

    const keys = await APIKey.find(query)
      .select('-key -keyHash')
      .sort({ _id: -1 })  // Use _id for sorting (always indexed in Cosmos DB)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await APIKey.countDocuments(query);
    console.log('[Admin API Keys] Found', keys.length, 'keys, total:', total);

    res.json({
      success: true,
      data: keys,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('[Admin API Keys] Error in listAllAPIKeys:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get API key details
 * GET /admin/api-keys/:keyId
 */
export const getAPIKeyDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { keyId } = req.params;

    if (userRole !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admins can view API key details' });
      return;
    }

    const apiKey = await APIKey.findById(keyId).select('-key -keyHash').lean();
    if (!apiKey) {
      res.status(404).json({ success: false, message: 'API key not found' });
      return;
    }

    res.json({ success: true, data: apiKey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Revoke an API key
 * DELETE /admin/api-keys/:keyId
 */
export const revokeAPIKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { keyId } = req.params;
    const { reason } = req.body;

    if (userRole !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admins can revoke API keys' });
      return;
    }

    const apiKey = await APIKey.findByIdAndUpdate(
      keyId,
      {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: new mongoose.Types.ObjectId(userId),
        revokedReason: reason || 'Revoked by super admin'
      },
      { new: true }
    ).select('-key -keyHash');

    if (!apiKey) {
      res.status(404).json({ success: false, message: 'API key not found' });
      return;
    }

    res.json({ success: true, message: 'API key revoked successfully', data: apiKey });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get API key usage statistics
 * GET /admin/api-keys/:keyId/usage
 */
export const getAPIKeyUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { keyId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    if (userRole !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admins can view API key usage' });
      return;
    }

    const query: any = { apiKeyId: new mongoose.Types.ObjectId(keyId) };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const logs = await APIKeyUsageLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await APIKeyUsageLog.countDocuments(query);

    // Get aggregated stats
    const stats = await APIKeyUsageLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          successCount: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
          errorCount: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } }
        }
      }
    ]);

    // Get endpoint breakdown
    const endpointBreakdown = await APIKeyUsageLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: { endpoint: '$endpoint', method: '$method' },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        logs,
        stats: stats[0] || { totalRequests: 0, avgResponseTime: 0, successCount: 0, errorCount: 0 },
        endpointBreakdown
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get available permission scopes
 * GET /admin/api-keys/scopes
 */
export const getAvailableScopes = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      scopes: API_KEY_SCOPES,
      descriptions: {
        'employees:read': 'Read employee data',
        'employees:write': 'Create/update employees',
        'attendance:read': 'Read attendance records',
        'attendance:write': 'Mark attendance',
        'leaves:read': 'Read leave requests/balances',
        'leaves:write': 'Create leave requests',
        'payroll:read': 'Read payroll/payslips',
        'timesheets:read': 'Read timesheets',
        'timesheets:write': 'Submit timesheets',
        'reports:read': 'Access reports',
        '*': 'Full access to all resources'
      }
    }
  });
};

// ==================== INTERNAL VALIDATION ENDPOINT ====================

/**
 * Validate API key (internal use by API Gateway)
 * POST /internal/api-keys/validate
 */
export const validateAPIKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keyHash, ipAddress } = req.body;

    if (!keyHash) {
      res.status(400).json({ valid: false, message: 'keyHash is required' });
      return;
    }

    const apiKey = await APIKey.findOne({ keyHash, isActive: true });

    if (!apiKey) {
      res.status(401).json({ valid: false, message: 'Invalid or inactive API key' });
      return;
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      res.status(401).json({ valid: false, message: 'API key has expired' });
      return;
    }

    // Check IP whitelist
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0 && ipAddress) {
      if (!apiKey.ipWhitelist.includes(ipAddress)) {
        res.status(403).json({ valid: false, message: 'IP address not whitelisted' });
        return;
      }
    }

    // Update usage stats (non-blocking)
    APIKey.updateOne(
      { _id: apiKey._id },
      { $set: { lastUsed: new Date() }, $inc: { usageCount: 1 } }
    ).catch(err => console.error('Failed to update API key usage:', err));

    res.json({
      valid: true,
      data: {
        keyId: apiKey._id,
        tenantId: apiKey.tenantId,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        environment: apiKey.environment
      }
    });
  } catch (error: any) {
    console.error('Error validating API key:', error);
    res.status(500).json({ valid: false, message: error.message });
  }
};

/**
 * Log API key usage (internal use by API Gateway)
 * POST /internal/api-keys/log
 */
export const logAPIKeyUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, apiKeyId, endpoint, method, statusCode, responseTime, ipAddress, userAgent, errorMessage } = req.body;

    const log = new APIKeyUsageLog({
      tenantId,
      apiKeyId: new mongoose.Types.ObjectId(apiKeyId),
      endpoint,
      method,
      statusCode,
      responseTime,
      ipAddress,
      userAgent,
      errorMessage
    });

    await log.save();
    res.status(201).json({ success: true });
  } catch (error: any) {
    // Don't fail the request if logging fails
    console.error('Failed to log API key usage:', error);
    res.status(200).json({ success: true, warning: 'Usage logging failed' });
  }
};

// ==================== TENANT API CONFIGURATION ====================

/**
 * Get tenant API configuration
 * GET /admin/tenant-config/:tenantId
 */
export const getTenantAPIConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { tenantId } = req.params;

    if (userRole !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admins can view tenant API configuration' });
      return;
    }

    const config = await TenantAPIConfig.findOne({ tenantId }).lean();

    res.json({
      success: true,
      data: config || {
        tenantId,
        allowedScopes: [],
        maxKeys: 5,
        maxRequestsPerDay: 10000,
        isAPIAccessEnabled: false,
        enabledEnvironments: ['production']
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update tenant API configuration (super admin only)
 * PUT /admin/tenant-config/:tenantId
 */
export const updateTenantAPIConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { tenantId } = req.params;

    if (userRole !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admins can update tenant API configuration' });
      return;
    }

    const {
      tenantName,
      allowedScopes,
      maxKeys,
      maxRequestsPerDay,
      isAPIAccessEnabled,
      enabledEnvironments,
      notes
    } = req.body;

    // Validate scopes
    if (allowedScopes && allowedScopes.length > 0) {
      const invalidScopes = allowedScopes.filter((s: string) => !API_KEY_SCOPES.includes(s as any));
      if (invalidScopes.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid scopes: ${invalidScopes.join(', ')}`,
          validScopes: API_KEY_SCOPES
        });
        return;
      }
    }

    const config = await TenantAPIConfig.findOneAndUpdate(
      { tenantId },
      {
        tenantId,
        tenantName: tenantName || `Tenant ${tenantId}`,
        allowedScopes: allowedScopes || [],
        maxKeys: maxKeys || 5,
        maxRequestsPerDay: maxRequestsPerDay || 10000,
        isAPIAccessEnabled: isAPIAccessEnabled ?? false,
        enabledEnvironments: enabledEnvironments || ['production'],
        notes,
        configuredBy: new mongoose.Types.ObjectId(userId),
        configuredAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Tenant API configuration updated successfully',
      data: config
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List all tenant API configurations
 * GET /admin/tenant-configs
 */
export const listTenantAPIConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    console.log('[Admin API Keys] listTenantAPIConfigs called, role:', userRole);

    if (userRole !== 'super_admin') {
      console.log('[Admin API Keys] Access denied - not super_admin, role was:', userRole);
      res.status(403).json({ success: false, message: 'Only super admins can list tenant configurations' });
      return;
    }

    const { page = 1, limit = 20, isEnabled } = req.query;
    const query: any = {};
    if (isEnabled !== undefined) {
      query.isAPIAccessEnabled = isEnabled === 'true';
    }

    console.log('[Admin API Keys] Query:', JSON.stringify(query));

    const configs = await TenantAPIConfig.find(query)
      .sort({ _id: -1 })  // Use _id for sorting (always indexed in Cosmos DB)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await TenantAPIConfig.countDocuments(query);
    console.log('[Admin API Keys] Found', configs.length, 'configs, total:', total);

    res.json({
      success: true,
      data: configs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('[Admin API Keys] Error in listTenantAPIConfigs:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete tenant API configuration
 * DELETE /admin/tenant-config/:tenantId
 */
export const deleteTenantAPIConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { tenantId } = req.params;

    if (userRole !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Only super admins can delete tenant API configuration' });
      return;
    }

    // Also revoke all API keys for this tenant
    await APIKey.updateMany(
      { tenantId, isActive: true },
      { isActive: false, revokedAt: new Date(), revokedReason: 'Tenant API access disabled' }
    );

    await TenantAPIConfig.deleteOne({ tenantId });

    res.json({
      success: true,
      message: 'Tenant API configuration deleted and all API keys revoked'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
