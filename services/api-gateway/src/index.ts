import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
// cors import removed - using manual CORS middleware for better control with proxies
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware, Options, fixRequestBody } from 'http-proxy-middleware';

import { services, getServiceByPath } from './config/services';
import { authenticateToken, extractTenant, AuthRequest } from './middleware/auth';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Manual CORS headers for ALL responses (including proxied ones)
// This ensures CORS works even when http-proxy-middleware takes over the response
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');

  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
    return;
  }

  next();
});

// Security middleware - disable conflicting CORS policies
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Note: Do NOT add express.json() here - it will consume the body stream
// and break the proxy. Body parsing is handled by the downstream services.

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Extract tenant from subdomain/header
app.use(extractTenant);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Service health aggregator
app.get('/health/services', async (_req: Request, res: Response) => {
  const healthChecks = await Promise.allSettled(
    services.map(async (service) => {
      try {
        const response = await fetch(`${service.url}${service.healthCheck}`);
        return {
          name: service.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          url: service.url,
        };
      } catch {
        return {
          name: service.name,
          status: 'unreachable',
          url: service.url,
        };
      }
    })
  );

  const results = healthChecks.map((result) =>
    result.status === 'fulfilled' ? result.value : { status: 'error' }
  );

  res.json({
    gateway: 'healthy',
    services: results,
    timestamp: new Date().toISOString(),
  });
});

// Apply rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

// Setup proxy for each service
services.forEach((service) => {
  const proxyOptions: Options = {
    target: service.url,
    changeOrigin: true,
    pathRewrite: (path, _req) => {
      // Strip the pathPrefix from the incoming path and prepend targetPath
      // e.g., /api/auth/super-admin/login -> strip /api/auth -> /super-admin/login -> prepend '' -> /super-admin/login
      const strippedPath = path.replace(service.pathPrefix, '') || '/';
      return service.targetPath + strippedPath;
    },
    timeout: service.timeout,
    on: {
      proxyReq: (proxyReq, req) => {
        // Fix request body streaming issue with Express 5 + http-proxy-middleware
        // This ensures the body is properly forwarded even if bodyParser was used
        fixRequestBody(proxyReq, req);

        // Forward tenant context headers
        const authReq = req as AuthRequest;
        if (authReq.headers['x-tenant-id']) {
          proxyReq.setHeader('x-tenant-id', authReq.headers['x-tenant-id'] as string);
        }
        if (authReq.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', authReq.headers['x-user-id'] as string);
        }
        if (authReq.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', authReq.headers['x-user-role'] as string);
        }

        // Add request ID for tracing
        const requestId = authReq.headers['x-request-id'] || `req_${Date.now()}`;
        proxyReq.setHeader('x-request-id', requestId as string);
      },
      proxyRes: (proxyRes, req) => {
        // Add CORS headers to ALL proxied responses (including errors from backend services)
        // This is critical because http-proxy-middleware pipes responses directly,
        // bypassing Express middleware headers
        const origin = req.headers.origin;
        proxyRes.headers['access-control-allow-origin'] = origin || '*';
        proxyRes.headers['access-control-allow-credentials'] = 'true';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID';
        proxyRes.headers['access-control-expose-headers'] = 'X-Request-ID';
        // Mark response as proxied
        proxyRes.headers['x-proxied-by'] = 'hrm-api-gateway';
      },
      error: (err, req, res) => {
        console.error(`Proxy error for ${service.name}:`, err.message);
        if (res && 'status' in res && typeof res.status === 'function') {
          const response = res as Response;
          // Explicitly set CORS headers for proxy errors (no proxied response to modify)
          const origin = req.headers.origin;
          response.setHeader('Access-Control-Allow-Origin', origin || '*');
          response.setHeader('Access-Control-Allow-Credentials', 'true');
          response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
          response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID');
          response.status(503).json({
            success: false,
            message: `Service ${service.name} is temporarily unavailable`,
            service: service.name,
          });
        }
      },
    },
  };

  // Apply authentication middleware for protected services
  if (service.requiresAuth) {
    app.use(service.pathPrefix, authenticateToken, createProxyMiddleware(proxyOptions));
  } else {
    app.use(service.pathPrefix, createProxyMiddleware(proxyOptions));
  }

  console.log(`Proxy configured: ${service.pathPrefix} -> ${service.url}`);
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Gateway error:', err);
  // CORS headers already set by middleware
  res.status(500).json({
    success: false,
    message: 'Internal gateway error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║        HRM SaaS API Gateway                          ║
  ║        Running on port ${PORT}                          ║
  ║        Environment: ${process.env.NODE_ENV || 'development'}                    ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝

  Configured Services:
  ${services.map((s) => `  - ${s.pathPrefix} -> ${s.url}`).join('\n')}
  `);
});

export default app;
