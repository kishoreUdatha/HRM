import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_timesheet';
    // For CosmosDB, explicitly specify the database name
    await mongoose.connect(mongoURI, {
      dbName: 'hrm_timesheet',
    });
    console.log('Timesheet Service: MongoDB Connected to hrm_timesheet');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
