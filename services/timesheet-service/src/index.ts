import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3024;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Health check - must be before routes to avoid /:id matching
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'timesheet-service' });
});

// Routes - mounted at root since API gateway strips /api/timesheets prefix
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Timesheet Service running on port ${PORT}`);
});

export default app;
