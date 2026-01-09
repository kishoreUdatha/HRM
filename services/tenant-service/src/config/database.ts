import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_tenants';

    // For CosmosDB, explicitly specify the database name
    await mongoose.connect(mongoURI, {
      dbName: 'hrm_tenants',
    });

    console.log('[Tenant Service] MongoDB connected successfully to hrm_tenants database');

    mongoose.connection.on('error', (err) => {
      console.error('[Tenant Service] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[Tenant Service] MongoDB disconnected');
    });

  } catch (error) {
    console.error('[Tenant Service] MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
