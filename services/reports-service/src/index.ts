import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reports', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reports-service' });
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_reports';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('[Reports Service] Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`[Reports Service] Running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[Reports Service] MongoDB connection error:', error);
    process.exit(1);
  });

export default app;
