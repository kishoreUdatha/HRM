import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3015;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_assets')
  .then(() => console.log('Asset Service: MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', routes);
app.get('/health', (req, res) => res.json({ status: 'OK', service: 'asset-service' }));

app.listen(PORT, () => console.log(`Asset Service running on port ${PORT}`));
export default app;
