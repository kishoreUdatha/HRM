import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import connectDB from './config/database';
import routes from './routes';
import pushNotificationService from './services/pushNotificationService';

const app: Application = express();
const PORT = process.env.PORT || 3007;

// Connect to MongoDB
connectDB();

// Initialize push notification service (Firebase Admin SDK)
pushNotificationService.initialize();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  console.log(`[REQUEST] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[REQUEST] Body:`, JSON.stringify(req.body, null, 2));
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Notification Service] Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`[Notification Service] Running on port ${PORT}`);
});

export default app;
