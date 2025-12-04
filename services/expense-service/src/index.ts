import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'expense-service' });
});

app.listen(PORT, () => {
  console.log(`Expense Service running on port ${PORT}`);
});

export default app;
