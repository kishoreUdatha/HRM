import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_auth';

    // For CosmosDB, explicitly specify the database name
    await mongoose.connect(mongoURI, {
      dbName: 'hrm_auth',
    });

    console.log('[Auth Service] MongoDB connected successfully to hrm_auth database');

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
