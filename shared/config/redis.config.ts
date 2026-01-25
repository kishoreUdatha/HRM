/**
 * Optimized Redis Connection Configuration
 * Production-ready settings for high concurrency
 */

import { RedisOptions } from 'ioredis';

export interface RedisConfig {
  url: string;
  options: RedisOptions;
}

/**
 * Get optimized Redis connection options
 */
export const getRedisOptions = (): RedisOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLoadTesting = process.env.LOAD_TESTING === 'true';

  return {
    // Connection settings
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Keep-alive
    keepAlive: 30000,

    // Retry strategy
    retryStrategy: (times: number) => {
      if (times > 10) {
        console.error('[Redis] Max retries reached, giving up');
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
      return delay;
    },

    // Connection pool (via maxRetriesPerRequest)
    maxRetriesPerRequest: isLoadTesting ? 5 : 3,

    // Enable offline queue
    enableOfflineQueue: true,

    // Lazy connect for better startup
    lazyConnect: false,

    // Read-only mode for replicas (if applicable)
    readOnly: false,

    // Auto-reconnect
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },

    // TLS settings for production
    ...(isProduction && process.env.REDIS_TLS === 'true' ? {
      tls: {
        rejectUnauthorized: false,
      },
    } : {}),
  };
};

/**
 * Get Redis connection URL
 */
export const getRedisUrl = (): string => {
  return process.env.REDIS_URL || 'redis://localhost:6379';
};

/**
 * Create Redis configuration
 */
export const createRedisConfig = (): RedisConfig => {
  return {
    url: getRedisUrl(),
    options: getRedisOptions(),
  };
};

/**
 * Parse Redis URL for cluster mode (if needed)
 */
export const parseRedisUrl = (url: string): { host: string; port: number; password?: string } => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
    };
  }
};

export default {
  getRedisOptions,
  getRedisUrl,
  createRedisConfig,
  parseRedisUrl,
};
