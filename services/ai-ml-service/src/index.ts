import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import aiRoutes from './routes/aiRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3016;

connectDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ai-ml-service',
    timestamp: new Date().toISOString(),
    capabilities: {
      resumeParsing: true,
      attritionPrediction: true,
      performancePrediction: true,
      skillMatching: true,
      sentimentAnalysis: true,
      openAIIntegration: !!process.env.OPENAI_API_KEY
    }
  });
});

// Routes
app.use('/ai', aiRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[AI/ML Service] Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[AI/ML Service] Running on port ${PORT}`);
  console.log(`[AI/ML Service] OpenAI integration: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled'}`);
  console.log(`[AI/ML Service] Available features:`);
  console.log(`  - Resume Parsing & Analysis`);
  console.log(`  - Attrition Risk Prediction`);
  console.log(`  - Performance Prediction`);
  console.log(`  - Skill Matching & Gap Analysis`);
  console.log(`  - Sentiment Analysis`);
  console.log(`  - Salary Benchmarking`);
  console.log(`  - Promotion Readiness Assessment`);
});

export default app;
