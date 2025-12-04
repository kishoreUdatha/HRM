import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3013;

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'compliance-service' });
});

app.listen(PORT, () => {
  console.log(`Compliance Service running on port ${PORT}`);
});

export default app;
