import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import billingRoutes from './routes/billingRoutes';
import { startSubscriptionExpiryJob } from './jobs/subscriptionExpiryJob';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3027;

// Middleware
app.use(cors());

// Raw body for webhook signature verification
app.use('/api/billing/webhooks', express.raw({ type: 'application/json' }));

// JSON body for other routes
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'billing-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/billing', billingRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start subscription expiry cron job
    startSubscriptionExpiryJob();

    app.listen(PORT, () => {
      console.log(`Billing Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
