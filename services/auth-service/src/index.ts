import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import connectDB from './config/database';
import authRoutes from './routes/authRoutes';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', authRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Auth Service] Error:', {
    message: err.message,
    code: err.code,
    name: err.name,
    stack: err.stack?.split('\n').slice(0, 5).join('\n'),
  });

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors || {}).map((e: any) => e.message),
    });
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Email already registered',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message, // Always return error message for debugging
  });
});

app.listen(PORT, () => {
  console.log(`[Auth Service] Running on port ${PORT}`);
});

export default app;
