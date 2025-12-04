import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import connectDB from './config/database';
import analyticsRoutes from './routes/analyticsRoutes';
import AnalyticsSnapshot from './models/AnalyticsSnapshot';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3011;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/analytics', analyticsRoutes);

// Schedule daily snapshot generation (runs at 1 AM)
cron.schedule('0 1 * * *', async () => {
  console.log('[Analytics Service] Generating daily snapshots...');
  // Snapshot generation would call other services to gather data
  // This is a placeholder - actual implementation would aggregate data
});

// Schedule monthly snapshot generation (runs on 1st of each month at 2 AM)
cron.schedule('0 2 1 * *', async () => {
  console.log('[Analytics Service] Generating monthly snapshots...');
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Analytics Service] Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`[Analytics Service] Running on port ${PORT}`);
});

export default app;
