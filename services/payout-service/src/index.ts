import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import payoutRoutes from './routes/payoutRoutes';
import { startScheduledPayoutJob } from './jobs/scheduledPayoutJob';
import { initializeRabbitMQ } from './services/rabbitmqService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3028;

// Middleware
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Raw body for webhook signature verification
app.use('/api/payouts/webhooks', express.raw({ type: 'application/json' }));

// JSON body for other routes
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payout-service',
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to test MongoDB directly
app.get('/debug/db-test', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const PayoutConfig = require('./models/PayoutConfig').default;
    const tenantId = String(req.headers['x-tenant-id'] || '');

    console.log('Debug: Testing DB with tenantId:', tenantId);
    console.log('Debug: Mongoose connection state:', mongoose.connection.readyState);

    const result = await PayoutConfig.findOne({ tenantId });
    console.log('Debug: Query result:', result);

    res.json({ success: true, connectionState: mongoose.connection.readyState, result });
  } catch (error: any) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Routes
app.use('/api/payouts', payoutRoutes);

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

    // Initialize RabbitMQ for event listening
    await initializeRabbitMQ();

    // Start scheduled payout cron job
    startScheduledPayoutJob();

    app.listen(PORT, () => {
      console.log(`Payout Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
