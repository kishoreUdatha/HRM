import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  tenantId?: string;
}

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'hrm_saas_access_secret_2024';

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token is required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    req.tenantId = decoded.tenantId;

    // Add tenant context to headers for downstream services
    req.headers['x-tenant-id'] = decoded.tenantId;
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = decoded;
      req.tenantId = decoded.tenantId;
      req.headers['x-tenant-id'] = decoded.tenantId;
      req.headers['x-user-id'] = decoded.userId;
      req.headers['x-user-role'] = decoded.role;
    } catch {
      // Token invalid, but continue without auth
    }
  }

  next();
};

// Extract tenant from subdomain
export const extractTenant = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const host = req.headers.host || '';
  const parts = host.split('.');

  // Check for subdomain tenant (e.g., acme.hrm.com)
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
    req.headers['x-tenant-slug'] = parts[0];
  }

  // Also check for tenant in header (for API clients)
  const tenantHeader = req.headers['x-tenant-id'];
  if (tenantHeader) {
    req.tenantId = tenantHeader as string;
  }

  next();
};
