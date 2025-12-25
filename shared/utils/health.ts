/**
 * HRM Health Check Utilities
 * Provides standardized health check endpoints for all microservices
 */

import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
      message?: string;
    };
  };
}

interface HealthCheckOptions {
  serviceName: string;
  version?: string;
  customChecks?: {
    [key: string]: () => Promise<{ status: 'up' | 'down'; message?: string }>;
  };
}

/**
 * Check MongoDB connection health
 */
async function checkMongoDB(): Promise<{ status: 'up' | 'down'; latency?: number; message?: string }> {
  const startTime = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: 'down', message: 'MongoDB not connected' };
    }

    // Ping the database
    await mongoose.connection.db?.admin().ping();
    const latency = Date.now() - startTime;

    return { status: 'up', latency };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'MongoDB check failed',
    };
  }
}

/**
 * Check Redis connection health
 */
async function checkRedis(redisClient: any): Promise<{ status: 'up' | 'down'; latency?: number; message?: string }> {
  if (!redisClient) {
    return { status: 'down', message: 'Redis client not configured' };
  }

  const startTime = Date.now();
  try {
    await redisClient.ping();
    const latency = Date.now() - startTime;
    return { status: 'up', latency };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Redis check failed',
    };
  }
}

/**
 * Check RabbitMQ connection health
 */
async function checkRabbitMQ(connection: any): Promise<{ status: 'up' | 'down'; message?: string }> {
  if (!connection) {
    return { status: 'down', message: 'RabbitMQ connection not configured' };
  }

  try {
    // Check if connection is open
    if (connection.connection && connection.connection.serverProperties) {
      return { status: 'up' };
    }
    return { status: 'down', message: 'RabbitMQ connection not established' };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'RabbitMQ check failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: 'up' | 'down'; message?: string } {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usagePercent = (used.heapUsed / used.heapTotal) * 100;

  if (usagePercent > 90) {
    return {
      status: 'down',
      message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
    };
  }

  return {
    status: 'up',
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
  };
}

/**
 * Create health check router
 */
export function createHealthRouter(options: HealthCheckOptions): Router {
  const router = Router();
  const startTime = Date.now();

  /**
   * Basic liveness probe - just checks if the service is running
   * Used by Kubernetes to know if the container should be restarted
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: options.serviceName,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed readiness probe - checks all dependencies
   * Used by Kubernetes to know if the service can receive traffic
   */
  router.get('/health/ready', async (_req: Request, res: Response) => {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: HealthStatus['status'] = 'healthy';

    // Check MongoDB
    const mongoStatus = await checkMongoDB();
    checks.mongodb = mongoStatus;
    if (mongoStatus.status === 'down') {
      overallStatus = 'unhealthy';
    }

    // Check memory
    const memoryStatus = checkMemory();
    checks.memory = memoryStatus;
    if (memoryStatus.status === 'down') {
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Run custom checks
    if (options.customChecks) {
      for (const [name, checkFn] of Object.entries(options.customChecks)) {
        try {
          const result = await checkFn();
          checks[name] = result;
          if (result.status === 'down') {
            overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
          }
        } catch (error) {
          checks[name] = {
            status: 'down',
            message: error instanceof Error ? error.message : 'Check failed',
          };
          overallStatus = 'degraded';
        }
      }
    }

    const response: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: options.serviceName,
      version: options.version || process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };

    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(httpStatus).json(response);
  });

  /**
   * Detailed health check with all information
   */
  router.get('/health/details', async (_req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();

    const details = {
      service: options.serviceName,
      version: options.version || process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
      cpu: process.cpuUsage(),
      pid: process.pid,
    };

    res.status(200).json(details);
  });

  return router;
}

/**
 * Express middleware to add health headers
 */
export function healthMiddleware(serviceName: string) {
  return (_req: Request, res: Response, next: Function) => {
    res.setHeader('X-Service-Name', serviceName);
    res.setHeader('X-Service-Version', process.env.npm_package_version || '1.0.0');
    next();
  };
}

export { checkMongoDB, checkRedis, checkRabbitMQ, checkMemory };
