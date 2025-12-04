import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import amqp, { Channel, Connection } from 'amqplib';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3009;

// Redis clients for pub/sub
const redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisPublisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Socket.IO server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Store connected users
interface ConnectedUser {
  odId: string;
  odtId: string;
  userId: string;
  tenantId: string;
  role: string;
  employeeId?: string;
}

const connectedUsers = new Map<string, ConnectedUser>();

// RabbitMQ connection
let rabbitChannel: Channel | null = null;

async function connectRabbitMQ(): Promise<void> {
  try {
    const connection: Connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://localhost:5672'
    );
    rabbitChannel = await connection.createChannel();

    // Declare exchanges for different event types
    await rabbitChannel.assertExchange('notifications', 'topic', { durable: true });
    await rabbitChannel.assertExchange('attendance', 'topic', { durable: true });
    await rabbitChannel.assertExchange('leave', 'topic', { durable: true });
    await rabbitChannel.assertExchange('dashboard', 'topic', { durable: true });
    await rabbitChannel.assertExchange('chat', 'topic', { durable: true });

    // Create queues for WebSocket service
    const wsQueue = await rabbitChannel.assertQueue('websocket_events', { durable: true });

    // Bind to all exchanges
    await rabbitChannel.bindQueue(wsQueue.queue, 'notifications', '#');
    await rabbitChannel.bindQueue(wsQueue.queue, 'attendance', '#');
    await rabbitChannel.bindQueue(wsQueue.queue, 'leave', '#');
    await rabbitChannel.bindQueue(wsQueue.queue, 'dashboard', '#');
    await rabbitChannel.bindQueue(wsQueue.queue, 'chat', '#');

    // Consume messages and broadcast to appropriate clients
    rabbitChannel.consume(wsQueue.queue, (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          handleRabbitMQEvent(event);
          rabbitChannel?.ack(msg);
        } catch (error) {
          console.error('Error processing RabbitMQ message:', error);
          rabbitChannel?.nack(msg, false, false);
        }
      }
    });

    console.log('[WebSocket Service] Connected to RabbitMQ');
  } catch (error) {
    console.error('[WebSocket Service] RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

function handleRabbitMQEvent(event: any): void {
  const { type, tenantId, userId, data } = event;

  switch (type) {
    case 'notification:new':
      // Send to specific user
      if (userId) {
        sendToUser(userId, tenantId, 'notification', data);
      }
      break;

    case 'notification:broadcast':
      // Send to all users in tenant
      sendToTenant(tenantId, 'notification', data);
      break;

    case 'attendance:checkin':
    case 'attendance:checkout':
      // Broadcast to managers and HR
      sendToRoles(tenantId, ['hr', 'manager', 'tenant_admin'], 'attendance:update', data);
      break;

    case 'leave:requested':
    case 'leave:approved':
    case 'leave:rejected':
      // Send to specific user and managers
      sendToUser(userId, tenantId, 'leave:update', data);
      if (data.managerId) {
        sendToUser(data.managerId, tenantId, 'leave:update', data);
      }
      break;

    case 'dashboard:refresh':
      sendToTenant(tenantId, 'dashboard:refresh', data);
      break;

    case 'chat:message':
      handleChatMessage(data);
      break;

    default:
      console.log('Unknown event type:', type);
  }
}

function sendToUser(userId: string, tenantId: string, event: string, data: any): void {
  connectedUsers.forEach((user, socketId) => {
    if (user.userId === userId && user.tenantId === tenantId) {
      io.to(socketId).emit(event, data);
    }
  });
}

function sendToTenant(tenantId: string, event: string, data: any): void {
  connectedUsers.forEach((user, socketId) => {
    if (user.tenantId === tenantId) {
      io.to(socketId).emit(event, data);
    }
  });
}

function sendToRoles(tenantId: string, roles: string[], event: string, data: any): void {
  connectedUsers.forEach((user, socketId) => {
    if (user.tenantId === tenantId && roles.includes(user.role)) {
      io.to(socketId).emit(event, data);
    }
  });
}

function handleChatMessage(data: any): void {
  const { roomId, senderId, recipientId, tenantId, message } = data;

  if (roomId) {
    // Group chat
    io.to(roomId).emit('chat:message', data);
  } else if (recipientId) {
    // Direct message
    sendToUser(senderId, tenantId, 'chat:message', data);
    sendToUser(recipientId, tenantId, 'chat:message', data);
  }
}

// JWT verification middleware for Socket.IO
io.use(async (socket: Socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret') as any;

    socket.data.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      employeeId: decoded.employeeId,
    };

    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handler
io.on('connection', async (socket: Socket) => {
  const user = socket.data.user;
  console.log(`[WebSocket] User connected: ${user.userId} (${socket.id})`);

  // Store connected user
  connectedUsers.set(socket.id, {
    odId: socket.id,
    odtId: socket.id,
    userId: user.userId,
    tenantId: user.tenantId,
    role: user.role,
    employeeId: user.employeeId,
  });

  // Join tenant room
  socket.join(`tenant:${user.tenantId}`);

  // Join role-based room
  socket.join(`role:${user.tenantId}:${user.role}`);

  // Update online status in Redis
  await redisClient.hset(`online:${user.tenantId}`, user.userId, JSON.stringify({
    odId: socket.id,
    connectedAt: new Date().toISOString(),
  }));

  // Notify others about online status
  io.to(`tenant:${user.tenantId}`).emit('user:online', {
    userId: user.userId,
    role: user.role,
  });

  // Handle joining chat rooms
  socket.on('chat:join', (roomId: string) => {
    socket.join(`chat:${roomId}`);
    console.log(`[WebSocket] User ${user.userId} joined chat room: ${roomId}`);
  });

  // Handle leaving chat rooms
  socket.on('chat:leave', (roomId: string) => {
    socket.leave(`chat:${roomId}`);
    console.log(`[WebSocket] User ${user.userId} left chat room: ${roomId}`);
  });

  // Handle chat messages
  socket.on('chat:send', async (data: any) => {
    const messageData = {
      ...data,
      senderId: user.userId,
      senderName: data.senderName,
      tenantId: user.tenantId,
      timestamp: new Date().toISOString(),
    };

    if (data.roomId) {
      // Group message
      io.to(`chat:${data.roomId}`).emit('chat:message', messageData);
    } else if (data.recipientId) {
      // Direct message - send to both sender and recipient
      sendToUser(user.userId, user.tenantId, 'chat:message', messageData);
      sendToUser(data.recipientId, user.tenantId, 'chat:message', messageData);
    }

    // Store message in RabbitMQ for persistence
    if (rabbitChannel) {
      rabbitChannel.publish('chat', 'message.new', Buffer.from(JSON.stringify(messageData)));
    }
  });

  // Handle typing indicators
  socket.on('chat:typing', (data: any) => {
    if (data.roomId) {
      socket.to(`chat:${data.roomId}`).emit('chat:typing', {
        userId: user.userId,
        roomId: data.roomId,
        isTyping: data.isTyping,
      });
    } else if (data.recipientId) {
      sendToUser(data.recipientId, user.tenantId, 'chat:typing', {
        userId: user.userId,
        isTyping: data.isTyping,
      });
    }
  });

  // Handle presence/heartbeat
  socket.on('presence:heartbeat', async () => {
    await redisClient.hset(`online:${user.tenantId}`, user.userId, JSON.stringify({
      odId: socket.id,
      lastSeen: new Date().toISOString(),
    }));
  });

  // Handle dashboard subscriptions
  socket.on('dashboard:subscribe', (dashboardId: string) => {
    socket.join(`dashboard:${dashboardId}`);
  });

  socket.on('dashboard:unsubscribe', (dashboardId: string) => {
    socket.leave(`dashboard:${dashboardId}`);
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`[WebSocket] User disconnected: ${user.userId} (${socket.id})`);

    connectedUsers.delete(socket.id);

    // Update online status in Redis
    await redisClient.hdel(`online:${user.tenantId}`, user.userId);

    // Notify others about offline status
    io.to(`tenant:${user.tenantId}`).emit('user:offline', {
      userId: user.userId,
    });
  });
});

// Redis Pub/Sub for cross-instance communication
redisSubscriber.subscribe('ws:broadcast', (err) => {
  if (err) {
    console.error('Redis subscribe error:', err);
  }
});

redisSubscriber.on('message', (channel, message) => {
  if (channel === 'ws:broadcast') {
    try {
      const event = JSON.parse(message);
      handleRabbitMQEvent(event);
    } catch (error) {
      console.error('Error handling Redis message:', error);
    }
  }
});

// Express middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'websocket-service',
    timestamp: new Date().toISOString(),
    connectedClients: connectedUsers.size,
  });
});

// Get online users for a tenant
app.get('/online/:tenantId', async (req: Request, res: Response) => {
  try {
    const onlineUsers = await redisClient.hgetall(`online:${req.params.tenantId}`);
    res.json({
      success: true,
      data: Object.keys(onlineUsers).map(userId => ({
        userId,
        ...JSON.parse(onlineUsers[userId]),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get online users' });
  }
});

// Broadcast message to tenant (internal API)
app.post('/broadcast', (req: Request, res: Response) => {
  const { tenantId, event, data } = req.body;

  if (!tenantId || !event) {
    return res.status(400).json({ success: false, message: 'tenantId and event required' });
  }

  sendToTenant(tenantId, event, data);

  res.json({ success: true, message: 'Broadcast sent' });
});

// Send to specific user (internal API)
app.post('/send-to-user', (req: Request, res: Response) => {
  const { userId, tenantId, event, data } = req.body;

  if (!userId || !tenantId || !event) {
    return res.status(400).json({ success: false, message: 'userId, tenantId, and event required' });
  }

  sendToUser(userId, tenantId, event, data);

  res.json({ success: true, message: 'Message sent' });
});

// Initialize connections and start server
async function start(): Promise<void> {
  await connectRabbitMQ();

  httpServer.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║        HRM WebSocket Service                          ║
    ║        Running on port ${PORT}                          ║
    ║        Environment: ${process.env.NODE_ENV || 'development'}                    ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    `);
  });
}

start();

export { io, sendToUser, sendToTenant, sendToRoles };
