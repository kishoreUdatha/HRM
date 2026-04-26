import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_payout';

    // Debug: Log the URI (mask password)
    const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
    console.log('Connecting to MongoDB:', maskedUri);

    await mongoose.connect(mongoUri);

    console.log('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
