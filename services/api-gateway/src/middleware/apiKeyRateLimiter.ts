import { Response, NextFunction } from 'express';
import { APIKeyAuthRequest } from './apiKeyAuth';

// In-memory rate limit store (per key)
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Per-API-key rate limiting middleware
 * Uses the rate limit configuration from the API key itself
 */
export const apiKeyRateLimiter = (
  req: APIKeyAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Only apply to API key authenticated requests
  if (req.authType !== 'api_key' || !req.apiKey) {
    next();
    return;
  }

  const keyId = req.apiKey.keyId;
  const rateLimit = req.apiKey.rateLimit || { requests: 1000, window: 3600 };
  const { requests: maxRequests, window: windowSeconds } = rateLimit;

  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let entry = rateLimitStore.get(keyId);

  if (!entry || entry.resetTime < now) {
    // Start a new window
    entry = { count: 1, resetTime: now + windowMs };
    rateLimitStore.set(keyId, entry);
  } else {
    entry.count++;
  }

  // Calculate remaining requests and time until reset
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
  res.setHeader('X-RateLimit-Window', windowSeconds);

  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        limit: maxRequests,
        window: windowSeconds,
        retryAfter: resetInSeconds
      }
    });
    res.setHeader('Retry-After', resetInSeconds);
    return;
  }

  next();
};

/**
 * Get rate limit status for an API key (for debugging/monitoring)
 */
export const getRateLimitStatus = (keyId: string): {
  count: number;
  resetTime: number;
  remaining?: number;
} | null => {
  return rateLimitStore.get(keyId) || null;
};

/**
 * Reset rate limit for an API key (for testing)
 */
export const resetRateLimit = (keyId: string): void => {
  rateLimitStore.delete(keyId);
};
