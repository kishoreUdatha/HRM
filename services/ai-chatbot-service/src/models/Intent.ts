import mongoose, { Schema, Document } from 'mongoose';

export interface IIntent extends Document {
  tenantId: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  trainingPhrases: string[];
  entities: Array<{
    name: string;
    type: 'date' | 'number' | 'text' | 'employee' | 'department' | 'leave_type' | 'custom';
    required: boolean;
    prompts: string[];
  }>;
  responses: Array<{
    type: 'text' | 'action' | 'api_call' | 'handoff';
    content: string;
    action?: {
      type: string;
      endpoint?: string;
      method?: string;
      params?: Record<string, string>;
    };
    conditions?: Array<{
      entity: string;
      operator: 'equals' | 'contains' | 'greater' | 'less';
      value: any;
    }>;
  }>;
  contexts: {
    input: string[];
    output: string[];
    lifespan: number;
  };
  priority: number;
  isActive: boolean;
  isFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IntentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  description: String,
  category: { type: String, default: 'general' },
  trainingPhrases: [String],
  entities: [{
    name: String,
    type: { type: String, enum: ['date', 'number', 'text', 'employee', 'department', 'leave_type', 'custom'] },
    required: Boolean,
    prompts: [String]
  }],
  responses: [{
    type: { type: String, enum: ['text', 'action', 'api_call', 'handoff'] },
    content: String,
    action: {
      type: String,
      endpoint: String,
      method: String,
      params: Schema.Types.Mixed
    },
    conditions: [{
      entity: String,
      operator: { type: String, enum: ['equals', 'contains', 'greater', 'less'] },
      value: Schema.Types.Mixed
    }]
  }],
  contexts: {
    input: [String],
    output: [String],
    lifespan: { type: Number, default: 5 }
  },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFallback: { type: Boolean, default: false }
}, { timestamps: true });

IntentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<IIntent>('Intent', IntentSchema);
