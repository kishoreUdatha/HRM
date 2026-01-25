/**
 * Optimized HTTP Server Configuration
 * Production-ready settings for high concurrency and keep-alive connections
 */

import http from 'http';
import https from 'https';

export interface ServerConfig {
  keepAliveTimeout: number;
  headersTimeout: number;
  maxConnections: number;
  requestTimeout: number;
  maxHeadersCount: number;
  timeout: number;
}

/**
 * Get optimized server configuration based on environment
 */
export const getServerConfig = (): ServerConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLoadTesting = process.env.LOAD_TESTING === 'true';

  // Base configuration
  const config: ServerConfig = {
    // Keep-alive timeout (in milliseconds)
    // Must be greater than ALB/Nginx idle timeout
    keepAliveTimeout: parseInt(process.env.SERVER_KEEP_ALIVE_TIMEOUT || '65000', 10),

    // Headers timeout - should be slightly higher than keepAliveTimeout
    headersTimeout: parseInt(process.env.SERVER_HEADERS_TIMEOUT || '66000', 10),

    // Maximum number of concurrent connections
    maxConnections: parseInt(process.env.SERVER_MAX_CONNECTIONS || (isProduction ? '0' : '1000'), 10), // 0 = unlimited

    // Request timeout
    requestTimeout: parseInt(process.env.SERVER_REQUEST_TIMEOUT || '120000', 10),

    // Maximum number of headers
    maxHeadersCount: parseInt(process.env.SERVER_MAX_HEADERS_COUNT || '100', 10),

    // Overall server timeout
    timeout: parseInt(process.env.SERVER_TIMEOUT || '120000', 10),
  };

  // Load testing optimizations
  if (isLoadTesting) {
    return {
      ...config,
      keepAliveTimeout: 120000,  // 2 minutes
      headersTimeout: 121000,
      maxConnections: 0,  // Unlimited for load testing
      requestTimeout: 300000,  // 5 minutes
      timeout: 300000,
    };
  }

  return config;
};

/**
 * Apply optimized settings to an HTTP server
 */
export const optimizeHttpServer = (server: http.Server | https.Server): void => {
  const config = getServerConfig();

  // Keep-alive settings
  server.keepAliveTimeout = config.keepAliveTimeout;
  server.headersTimeout = config.headersTimeout;
  server.timeout = config.timeout;
  server.requestTimeout = config.requestTimeout;

  // Connection limits
  if (config.maxConnections > 0) {
    server.maxConnections = config.maxConnections;
  }

  // Enable TCP keep-alive at socket level
  server.on('connection', (socket) => {
    socket.setKeepAlive(true, 30000);  // 30 second keep-alive probe
    socket.setNoDelay(true);  // Disable Nagle's algorithm for lower latency
  });

  console.log('HTTP Server optimized with settings:', {
    keepAliveTimeout: `${config.keepAliveTimeout}ms`,
    headersTimeout: `${config.headersTimeout}ms`,
    maxConnections: config.maxConnections === 0 ? 'unlimited' : config.maxConnections,
    requestTimeout: `${config.requestTimeout}ms`,
  });
};

/**
 * Configure global HTTP/HTTPS agent settings for outgoing requests
 */
export const configureGlobalAgents = (): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLoadTesting = process.env.LOAD_TESTING === 'true';

  const maxSockets = isLoadTesting ? 500 : (isProduction ? 100 : 50);
  const maxFreeSockets = isLoadTesting ? 100 : (isProduction ? 25 : 10);

  // Configure HTTP agent
  http.globalAgent.maxSockets = maxSockets;
  http.globalAgent.maxFreeSockets = maxFreeSockets;
  http.globalAgent.keepAlive = true;
  http.globalAgent.keepAliveMsecs = 30000;

  // Configure HTTPS agent
  https.globalAgent.maxSockets = maxSockets;
  https.globalAgent.maxFreeSockets = maxFreeSockets;
  https.globalAgent.keepAlive = true;
  https.globalAgent.keepAliveMsecs = 30000;

  console.log('Global HTTP agents configured:', {
    maxSockets,
    maxFreeSockets,
    keepAlive: true,
  });
};

export default {
  getServerConfig,
  optimizeHttpServer,
  configureGlobalAgents,
};
