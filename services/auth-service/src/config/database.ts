import mongoose, { ConnectOptions } from 'mongoose';

/**
 * Get optimized MongoDB connection options
 */
const getMongooseOptions = (): ConnectOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLoadTesting = process.env.LOAD_TESTING === 'true';
  const mongoUri = process.env.MONGODB_URI || '';

  // Detect if using Azure Cosmos DB (doesn't support retryable writes)
  const isCosmosDB = mongoUri.includes('cosmos.azure.com');

  // Connection pool settings
  const maxPoolSize = parseInt(process.env.MONGODB_MAX_POOL_SIZE || (isLoadTesting ? '200' : isProduction ? '100' : '50'), 10);
  const minPoolSize = parseInt(process.env.MONGODB_MIN_POOL_SIZE || (isLoadTesting ? '20' : isProduction ? '10' : '5'), 10);

  return {
    dbName: 'hrm_auth',

    // Connection pool settings
    maxPoolSize,
    minPoolSize,

    // Timeouts
    serverSelectionTimeoutMS: isLoadTesting ? 60000 : 30000,
    socketTimeoutMS: isLoadTesting ? 60000 : 45000,
    connectTimeoutMS: 30000,

    // Keep-alive
    maxIdleTimeMS: isLoadTesting ? 300000 : 120000,

    // Write concern - Cosmos DB requires numeric write concern
    w: isCosmosDB ? 1 : (isProduction ? 'majority' : 1),

    // Retry settings - Cosmos DB doesn't support retryable writes
    retryWrites: !isCosmosDB,
    retryReads: true,

    // Heartbeat
    heartbeatFrequencyMS: isProduction ? 10000 : 30000,
  };
};

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_auth';
    const options = getMongooseOptions();

    await mongoose.connect(mongoURI, options);

    console.log('[Auth Service] MongoDB connected successfully to hrm_auth database');
    console.log('[Auth Service] Connection pool settings:', {
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize,
      loadTesting: process.env.LOAD_TESTING === 'true',
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Auth Service] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[Auth Service] MongoDB disconnected');
    });

  } catch (error) {
    console.error('[Auth Service] MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
