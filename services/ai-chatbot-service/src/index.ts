import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import chatbotRoutes from './routes/chatbotRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3015;

connectDB();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'ai-chatbot-service', timestamp: new Date().toISOString() });
});

// Quick chat endpoint for testing
app.post('/quick-chat', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  // Simple response for testing
  const responses: Record<string, string> = {
    hi: 'Hello! I\'m your HR Assistant. How can I help you today?',
    hello: 'Hi there! I\'m here to help with any HR-related questions.',
    help: 'I can assist you with:\n• Leave management\n• Attendance tracking\n• Payroll queries\n• Company policies\n• Benefits information\n\nJust ask me anything!',
    leave: 'I can help you with leave management. Would you like to:\n• Check your leave balance\n• Apply for leave\n• View leave status',
    salary: 'For salary-related queries, I can help you:\n• View your payslip\n• Check salary breakdown\n• See tax deductions',
    attendance: 'For attendance, I can help you:\n• Check in/out\n• View attendance records\n• See working hours summary'
  };

  const lowerMessage = message.toLowerCase();
  let response = responses['help'];

  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      response = value;
      break;
    }
  }

  res.json({
    success: true,
    data: {
      response: response,
      timestamp: new Date().toISOString()
    }
  });
});

// Routes
app.use('/chatbot', chatbotRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[AI Chatbot Service] Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[AI Chatbot Service] Running on port ${PORT}`);
  console.log(`[AI Chatbot Service] OpenAI integration: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled (using fallback)'}`);
});

export default app;
