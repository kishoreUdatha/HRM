/**
 * Production Optimization Configuration
 * Centralized configuration for high concurrency and load testing
 */

import { getMongooseOptions, getMongooseUrl } from './database.config';
import { getRedisOptions, getRedisUrl, createRedisConfig } from './redis.config';

/**
 * Environment detection
 */
export const isProduction = process.env.NODE_ENV === 'production';
export const isLoadTesting = process.env.LOAD_TESTING === 'true';
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * HTTP Server optimization settings
 */
export const getServerConfig = () => {
  return {
    // Keep-alive settings
    keepAliveTimeout: isLoadTesting ? 120000 : isProduction ? 65000 : 30000,
    headersTimeout: (isLoadTesting ? 120000 : isProduction ? 65000 : 30000) + 1000,

    // Request timeout
    timeout: isLoadTesting ? 300000 : isProduction ? 120000 : 60000,

    // Socket settings
    socketKeepAlive: true,
    socketKeepAliveDelay: 30000,
    socketNoDelay: true,

    // Max connections
    maxConnections: isLoadTesting ? 10000 : isProduction ? 5000 : 1000,
  };
};

/**
 * Rate limiting configuration
 */
export const getRateLimitConfig = () => {
  const multiplier = isLoadTesting ? 100 : isProduction ? 1 : 10;

  return {
    // General API rate limit
    general: {
      windowMs: isLoadTesting ? 60 * 1000 : 15 * 60 * 1000,
      max: 1000 * multiplier,
      skip: isLoadTesting,
    },

    // Authentication rate limit
    auth: {
      windowMs: isLoadTesting ? 60 * 1000 : 15 * 60 * 1000,
      max: 50 * multiplier,
      skip: isLoadTesting,
    },

    // Strict rate limit (password reset, etc.)
    strict: {
      windowMs: isLoadTesting ? 60 * 1000 : 60 * 60 * 1000,
      max: 5 * multiplier,
      skip: isLoadTesting,
    },

    // Upload rate limit
    upload: {
      windowMs: isLoadTesting ? 60 * 1000 : 60 * 60 * 1000,
      max: 20 * multiplier,
      skip: isLoadTesting,
    },
  };
};

/**
 * Connection pool configuration
 */
export const getConnectionPoolConfig = () => {
  return {
    mongodb: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || (isLoadTesting ? '200' : isProduction ? '100' : '50'), 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || (isLoadTesting ? '20' : isProduction ? '10' : '5'), 10),
    },
    redis: {
      maxRetriesPerRequest: isLoadTesting ? 5 : 3,
      enableOfflineQueue: true,
    },
  };
};

/**
 * Timeout configuration
 */
export const getTimeoutConfig = () => {
  return {
    // API request timeout
    request: isLoadTesting ? 60000 : isProduction ? 30000 : 15000,

    // Database operations
    database: {
      serverSelection: isLoadTesting ? 60000 : 30000,
      socket: isLoadTesting ? 60000 : 45000,
      connect: 30000,
    },

    // Redis operations
    redis: {
      connect: 10000,
      command: 5000,
    },

    // External service calls
    external: isLoadTesting ? 30000 : 15000,
  };
};

/**
 * Retry configuration
 */
export const getRetryConfig = () => {
  return {
    // Database retry
    database: {
      maxRetries: isLoadTesting ? 5 : 3,
      retryWrites: true,
      retryReads: true,
    },

    // Redis retry
    redis: {
      maxRetries: 10,
      baseDelay: 100,
      maxDelay: 3000,
    },

    // HTTP retry
    http: {
      maxRetries: isLoadTesting ? 5 : 3,
      retryDelay: 1000,
    },
  };
};

/**
 * Logging configuration for load testing
 */
export const getLoggingConfig = () => {
  return {
    level: isLoadTesting ? 'warn' : isProduction ? 'info' : 'debug',
    prettyPrint: isDevelopment,
    timestamp: true,

    // Disable request logging during load tests to reduce overhead
    logRequests: !isLoadTesting,

    // Sample rate for request logging (1 = 100%, 0.1 = 10%)
    sampleRate: isLoadTesting ? 0.01 : 1,
  };
};

/**
 * Clustering configuration
 */
export const getClusterConfig = () => {
  const cpuCount = parseInt(process.env.CLUSTER_WORKERS || '0', 10);

  return {
    enabled: isProduction || isLoadTesting,
    workers: cpuCount || (isLoadTesting ? 4 : isProduction ? 2 : 1),
    restartOnExit: isProduction,
  };
};

/**
 * Complete production configuration
 */
export const getProductionConfig = () => {
  return {
    environment: {
      isProduction,
      isLoadTesting,
      isDevelopment,
    },
    server: getServerConfig(),
    rateLimit: getRateLimitConfig(),
    connectionPool: getConnectionPoolConfig(),
    timeouts: getTimeoutConfig(),
    retry: getRetryConfig(),
    logging: getLoggingConfig(),
    cluster: getClusterConfig(),
    mongodb: {
      url: getMongooseUrl(),
      options: getMongooseOptions(),
    },
    redis: createRedisConfig(),
  };
};

/**
 * Apply server optimizations to an HTTP server instance
 */
export const applyServerOptimizations = (server: any) => {
  const config = getServerConfig();

  server.keepAliveTimeout = config.keepAliveTimeout;
  server.headersTimeout = config.headersTimeout;
  server.timeout = config.timeout;
  server.maxConnections = config.maxConnections;

  server.on('connection', (socket: any) => {
    socket.setKeepAlive(config.socketKeepAlive, config.socketKeepAliveDelay);
    socket.setNoDelay(config.socketNoDelay);
  });

  console.log('[Server] Applied production optimizations:', {
    keepAliveTimeout: config.keepAliveTimeout,
    headersTimeout: config.headersTimeout,
    timeout: config.timeout,
    maxConnections: config.maxConnections,
    loadTesting: isLoadTesting,
  });

  return server;
};

export default {
  isProduction,
  isLoadTesting,
  isDevelopment,
  getServerConfig,
  getRateLimitConfig,
  getConnectionPoolConfig,
  getTimeoutConfig,
  getRetryConfig,
  getLoggingConfig,
  getClusterConfig,
  getProductionConfig,
  applyServerOptimizations,
};
