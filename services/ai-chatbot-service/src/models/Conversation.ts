import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
  actions?: Array<{
    type: string;
    data: Record<string, any>;
    executed: boolean;
    result?: any;
  }>;
  feedback?: {
    helpful: boolean;
    rating?: number;
    comment?: string;
  };
  timestamp: Date;
}

export interface IConversation extends Document {
  tenantId: string;
  sessionId: string;
  employeeId?: string;
  channel: 'web' | 'mobile' | 'slack' | 'teams' | 'api';
  status: 'active' | 'closed' | 'escalated';
  messages: IMessage[];
  context: {
    currentIntent?: string;
    slots?: Record<string, any>;
    lastTopic?: string;
    employeeData?: Record<string, any>;
  };
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    language?: string;
    timezone?: string;
  };
  escalation?: {
    reason: string;
    escalatedTo: string;
    escalatedAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
  };
  analytics: {
    messageCount: number;
    avgResponseTime: number;
    satisfactionScore?: number;
    intentsDetected: string[];
    resolutionStatus: 'resolved' | 'unresolved' | 'partial';
  };
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  intent: String,
  entities: Schema.Types.Mixed,
  confidence: Number,
  actions: [{
    type: String,
    data: Schema.Types.Mixed,
    executed: Boolean,
    result: Schema.Types.Mixed
  }],
  feedback: {
    helpful: Boolean,
    rating: Number,
    comment: String
  },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ConversationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, unique: true },
  employeeId: { type: String, index: true },
  channel: { type: String, enum: ['web', 'mobile', 'slack', 'teams', 'api'], default: 'web' },
  status: { type: String, enum: ['active', 'closed', 'escalated'], default: 'active' },
  messages: [MessageSchema],
  context: {
    currentIntent: String,
    slots: Schema.Types.Mixed,
    lastTopic: String,
    employeeData: Schema.Types.Mixed
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    language: String,
    timezone: String
  },
  escalation: {
    reason: String,
    escalatedTo: String,
    escalatedAt: Date,
    resolved: Boolean,
    resolvedAt: Date
  },
  analytics: {
    messageCount: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    satisfactionScore: Number,
    intentsDetected: [String],
    resolutionStatus: { type: String, enum: ['resolved', 'unresolved', 'partial'], default: 'unresolved' }
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date
}, { timestamps: true });

ConversationSchema.index({ tenantId: 1, employeeId: 1, startedAt: -1 });
ConversationSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
