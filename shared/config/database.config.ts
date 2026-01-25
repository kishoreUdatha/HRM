/**
 * Optimized MongoDB Connection Configuration
 * Production-ready settings for high concurrency and performance
 */

import { ConnectOptions } from 'mongoose';

export interface DatabaseConfig {
  uri: string;
  dbName: string;
  options: ConnectOptions;
}

/**
 * Get optimized MongoDB connection options based on environment
 */
export const getMongooseOptions = (): ConnectOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLoadTesting = process.env.LOAD_TESTING === 'true';

  // Base options for all environments
  const baseOptions: ConnectOptions = {
    // Connection pool settings
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || (isProduction ? '100' : '50'), 10),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || (isProduction ? '10' : '5'), 10),

    // Connection timeouts
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '30000', 10),
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '30000', 10),

    // Keep-alive settings
    maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '120000', 10),

    // Write concern for durability
    w: isProduction ? 'majority' : 1,

    // Read preference
    readPreference: isProduction ? 'primaryPreferred' : 'primary',

    // Retry settings
    retryWrites: true,
    retryReads: true,

    // Compression for reduced network overhead
    compressors: ['zlib'],

    // Heartbeat frequency for replica set monitoring
    heartbeatFrequencyMS: isProduction ? 10000 : 30000,
  };

  // Load testing specific optimizations
  if (isLoadTesting) {
    return {
      ...baseOptions,
      maxPoolSize: 200,  // Higher pool for load testing
      minPoolSize: 20,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxIdleTimeMS: 300000,  // Keep connections alive longer
    };
  }

  return baseOptions;
};

/**
 * Create database configuration for a specific service
 */
export const createDatabaseConfig = (serviceName: string, defaultDbName: string): DatabaseConfig => {
  const uri = process.env.MONGODB_URI || `mongodb://localhost:27017/${defaultDbName}`;

  return {
    uri,
    dbName: defaultDbName,
    options: {
      ...getMongooseOptions(),
      dbName: defaultDbName,
      appName: serviceName,
    },
  };
};

/**
 * Connection pool statistics helper
 */
export const logConnectionPoolStats = (mongoose: any, serviceName: string): void => {
  const connection = mongoose.connection;

  if (connection && connection.client) {
    const topology = connection.client.topology;
    if (topology) {
      console.log(`[${serviceName}] MongoDB Pool Stats:`, {
        totalConnectionCount: topology.s?.pool?.totalConnectionCount || 'N/A',
        availableConnectionCount: topology.s?.pool?.availableConnectionCount || 'N/A',
        waitQueueSize: topology.s?.pool?.waitQueueSize || 'N/A',
      });
    }
  }
};

export default {
  getMongooseOptions,
  createDatabaseConfig,
  logConnectionPoolStats,
};
