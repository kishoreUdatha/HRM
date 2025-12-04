import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/database';
import integrationRoutes from './routes/integrationRoutes';
import { openAPISpec } from './swagger/openapi';
import { retryFailedDeliveries } from './services/webhookService';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3013;

connectDB();

app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openAPISpec));
app.get('/api-docs.json', (_req, res) => res.json(openAPISpec));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'integration-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/integrations', integrationRoutes);

// Retry failed webhook deliveries every minute
setInterval(retryFailedDeliveries, 60000);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Integration Service] Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[Integration Service] Running on port ${PORT}`);
  console.log(`[Integration Service] API Docs available at http://localhost:${PORT}/api-docs`);
});

export default app;
