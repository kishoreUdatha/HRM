import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/database';
import { connectRabbitMQ } from './config/rabbitmq';
import chatRoutes from './routes/chatRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3010;

// Connect to MongoDB
connectDB();

// Connect to RabbitMQ
connectRabbitMQ();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'chat-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/chat', chatRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Chat Service] Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`[Chat Service] Running on port ${PORT}`);
});

export default app;
