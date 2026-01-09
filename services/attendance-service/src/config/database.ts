import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    // For CosmosDB, explicitly specify the database name
    const conn = await mongoose.connect(process.env.MONGODB_URI as string, {
      dbName: 'hrm_attendance',
    });
    console.log(`[Attendance Service] MongoDB Connected to hrm_attendance: ${conn.connection.host}`);
  } catch (error) {
    console.error('[Attendance Service] MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
