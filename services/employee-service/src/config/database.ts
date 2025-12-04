import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_employees';

    await mongoose.connect(mongoURI);

    console.log('[Employee Service] MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('[Employee Service] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[Employee Service] MongoDB disconnected');
    });

  } catch (error) {
    console.error('[Employee Service] MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
