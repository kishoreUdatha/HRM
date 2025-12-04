import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/database';
import tenantRoutes from './routes/tenantRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3002;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'tenant-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', tenantRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Tenant Service] Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`[Tenant Service] Running on port ${PORT}`);
});

export default app;
