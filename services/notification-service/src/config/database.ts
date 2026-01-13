import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    // For CosmosDB, explicitly specify the database name
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.warn('[Notification Service] MONGODB_URI not configured, email logging will be disabled');
      return;
    }
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'hrm_notifications',
    });
    console.log(`[Notification Service] MongoDB Connected to hrm_notifications: ${conn.connection.host}`);
  } catch (error) {
    console.error('[Notification Service] MongoDB connection error:', error);
    console.warn('[Notification Service] Service will continue without database, email logging disabled');
  }
};

export default connectDB;
