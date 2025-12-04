import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import dotenv from 'dotenv';

import { services, getServiceByPath } from './config/services';
import { authenticateToken, extractTenant, AuthRequest } from './middleware/auth';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        /\.hrm\.com$/,
        /^http:\/\/localhost:\d+$/,
      ];

      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
  })
);

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
      // Prepend the target path that the service expects
      // path here is the remainder after Express strips the mount point
      // e.g., for /api/employees/123, path will be /123 (after /api/employees is stripped)
      return service.targetPath + path;
    },
    timeout: service.timeout,
    on: {
      proxyReq: (proxyReq, req) => {
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
      proxyRes: (proxyRes, _req, _res) => {
        // Add CORS headers to response
        proxyRes.headers['x-proxied-by'] = 'hrm-api-gateway';
      },
      error: (err, _req, res) => {
        console.error(`Proxy error for ${service.name}:`, err.message);
        if (res && 'status' in res && typeof res.status === 'function') {
          (res as Response).status(503).json({
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
