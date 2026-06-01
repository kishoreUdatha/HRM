import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_integrations';

    // Ensure we connect to the hrm_integrations database
    // For Cosmos DB URIs that don't include a database name, we need to add it
    if (mongoUri.includes('cosmos.azure.com') && !mongoUri.includes('/hrm_integrations')) {
      // Parse the URI and add the database name
      const url = new URL(mongoUri);
      if (!url.pathname || url.pathname === '/') {
        url.pathname = '/hrm_integrations';
        mongoUri = url.toString();
      }
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`[Integration Service] MongoDB Connected: ${conn.connection.host}, Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('[Integration Service] MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
