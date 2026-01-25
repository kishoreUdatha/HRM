import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Check if load testing mode is enabled
const isLoadTesting = process.env.LOAD_TESTING === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// Rate limit multiplier based on environment
const getRateLimitMultiplier = (): number => {
  if (isLoadTesting) return 100;  // 100x higher limits for load testing
  if (!isProduction) return 10;   // 10x higher limits for development
  return 1;                        // Normal limits for production
};

const multiplier = getRateLimitMultiplier();

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || String(1000 * multiplier), 10),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skip: (req) => {
    // Skip rate limiting for tenant lookup (needed for login flow)
    // Skip all rate limiting in load testing mode
    if (isLoadTesting) return true;
    return req.path.startsWith('/api/tenants/by-slug');
  },
});

// Stricter rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: isLoadTesting ? 60 * 1000 : 15 * 60 * 1000, // 1 min for load test, 15 min otherwise
  max: isLoadTesting ? 10000 : 50 * (isProduction ? 1 : 10), // Much higher for load testing
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skip: () => isLoadTesting, // Skip entirely during load testing
});

// Very strict rate limit for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Custom rate limiter based on subscription plan
export const planBasedLimiter = (defaultMax: number = 100) => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req: Request, _res: Response) => {
      // Get plan from request headers (set by auth middleware)
      const plan = req.headers['x-tenant-plan'] as string;

      switch (plan) {
        case 'enterprise':
          return 1000;
        case 'professional':
          return 500;
        case 'starter':
          return 200;
        case 'free':
        default:
          return defaultMax;
      }
    },
    message: {
      success: false,
      message: 'Rate limit exceeded for your plan. Please upgrade for higher limits.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
  });
};
