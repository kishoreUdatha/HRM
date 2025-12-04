import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Stricter rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
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
