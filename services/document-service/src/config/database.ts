import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_documents');
    console.log(`[Document Service] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[Document Service] MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
