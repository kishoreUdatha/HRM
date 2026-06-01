import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface APIKeyData {
  keyId: string;
  tenantId: string;
  permissions: string[];
  rateLimit: { requests: number; window: number };
  environment: string;
}

export interface APIKeyAuthRequest extends Request {
  apiKey?: APIKeyData;
  authType?: 'jwt' | 'api_key';
}

interface ValidateAPIKeyResponse {
  valid: boolean;
  message?: string;
  data?: APIKeyData;
}

const INTEGRATION_SERVICE_URL = process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3010';

/**
 * Middleware to authenticate requests using API key
 * Checks for X-API-Key header and validates against integration service
 */
export const authenticateAPIKey = async (
  req: APIKeyAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (!apiKeyHeader) {
    res.status(401).json({
      success: false,
      message: 'API key is required. Provide X-API-Key header.',
    });
    return;
  }

  // Validate API key format
  if (!apiKeyHeader.startsWith('hrm_') || apiKeyHeader.length < 40) {
    res.status(401).json({
      success: false,
      message: 'Invalid API key format',
    });
    return;
  }

  try {
    // Hash the key for secure comparison
    const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const clientIP = getClientIP(req);

    // Validate against integration service
    const response = await fetch(`${INTEGRATION_SERVICE_URL}/integrations/internal/api-keys/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_API_KEY || 'hrm_internal_service_key_2024'
      },
      body: JSON.stringify({ keyHash, ipAddress: clientIP })
    });

    const result = await response.json() as ValidateAPIKeyResponse;

    if (!response.ok || !result.valid || !result.data) {
      res.status(response.status === 200 ? 401 : response.status).json({
        success: false,
        message: result.message || 'Invalid API key',
      });
      return;
    }

    // Set API key context on request
    req.apiKey = result.data;
    req.authType = 'api_key';

    // Set headers for downstream services
    req.headers['x-tenant-id'] = result.data.tenantId;
    req.headers['x-api-key-id'] = result.data.keyId;
    req.headers['x-auth-type'] = 'api_key';
    req.headers['x-api-key-permissions'] = JSON.stringify(result.data.permissions);

    next();
  } catch (error) {
    console.error('[Gateway API Key Auth] Validation failed:', error);
    res.status(503).json({
      success: false,
      message: 'Unable to validate API key. Service temporarily unavailable.',
    });
  }
};

/**
 * Middleware that accepts either JWT or API key authentication
 * First checks for API key, then falls back to JWT
 */
export const authenticateJWTOrAPIKey = (jwtAuthMiddleware: Function) => {
  return async (req: APIKeyAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization;

    // If API key is provided, use API key auth
    if (apiKeyHeader) {
      return authenticateAPIKey(req, res, next);
    }

    // Otherwise, use JWT auth
    if (authHeader) {
      return jwtAuthMiddleware(req, res, next);
    }

    // Neither provided
    res.status(401).json({
      success: false,
      message: 'Authentication required. Provide Authorization header or X-API-Key header.',
    });
  };
};

/**
 * Check if the API key has required permissions
 */
export const requireAPIKeyPermission = (requiredPermission: string) => {
  return (req: APIKeyAuthRequest, res: Response, next: NextFunction): void => {
    if (req.authType !== 'api_key') {
      // Not using API key auth, skip permission check
      next();
      return;
    }

    const permissions = req.apiKey?.permissions || [];

    // Check for wildcard access
    if (permissions.includes('*')) {
      next();
      return;
    }

    // Check for specific permission
    if (permissions.includes(requiredPermission)) {
      next();
      return;
    }

    // Check for read/write scope matching
    const [resource, action] = requiredPermission.split(':');
    if (action === 'read' && permissions.includes(`${resource}:write`)) {
      // Write permission implies read permission
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `API key does not have required permission: ${requiredPermission}`,
      requiredPermission,
      availablePermissions: permissions
    });
  };
};

/**
 * Log API key usage (non-blocking)
 */
export const logAPIKeyUsage = async (
  req: APIKeyAuthRequest,
  statusCode: number,
  responseTime: number,
  errorMessage?: string
): Promise<void> => {
  if (req.authType !== 'api_key' || !req.apiKey) {
    return;
  }

  try {
    await fetch(`${INTEGRATION_SERVICE_URL}/internal/api-keys/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_API_KEY || 'hrm_internal_service_key_2024'
      },
      body: JSON.stringify({
        tenantId: req.apiKey.tenantId,
        apiKeyId: req.apiKey.keyId,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode,
        responseTime,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        errorMessage
      })
    });
  } catch (error) {
    console.error('[Gateway] Failed to log API key usage:', error);
  }
};

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.socket.remoteAddress || req.ip || 'unknown';
}
