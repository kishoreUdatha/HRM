/**
 * Shared Configuration Module
 * Export all configuration utilities for HRM services
 */

export * from './database.config';
export * from './redis.config';
export * from './server.config';
export * from './production.config';

// Default export with all configurations
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import serverConfig from './server.config';
import productionConfig from './production.config';

export default {
  database: databaseConfig,
  redis: redisConfig,
  server: serverConfig,
  production: productionConfig,
};
