import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import documentRoutes from './routes/documentRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3012;

connectDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'document-service', timestamp: new Date().toISOString() });
});

app.use('/documents', documentRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Document Service] Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

app.listen(PORT, () => {
  console.log(`[Document Service] Running on port ${PORT}`);
});

export default app;
