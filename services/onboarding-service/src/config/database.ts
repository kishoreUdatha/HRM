import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_onboarding';
    // For CosmosDB, explicitly specify the database name
    await mongoose.connect(mongoURI, {
      dbName: 'hrm_onboarding',
    });
    console.log('Onboarding Service: MongoDB Connected to hrm_onboarding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
