import mongoose, { Schema, Document } from 'mongoose';

export interface IPrediction extends Document {
  tenantId: string;
  modelId: string;
  modelType: string;
  entityType: 'employee' | 'team' | 'department' | 'organization';
  entityId: string;
  prediction: {
    value: number | string | boolean;
    probability?: number;
    confidence: number;
    category?: string;
  };
  features: Record<string, any>;
  factors: Array<{
    name: string;
    value: any;
    impact: number;
    direction: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    expectedImpact: number;
    category: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  validUntil: Date;
  actualOutcome?: {
    value: any;
    recordedAt: Date;
    accuracy: number;
  };
  status: 'active' | 'expired' | 'validated';
  createdAt: Date;
  updatedAt: Date;
}

const PredictionSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  modelId: { type: Schema.Types.ObjectId, ref: 'MLModel', required: true },
  modelType: { type: String, required: true },
  entityType: { type: String, enum: ['employee', 'team', 'department', 'organization'], required: true },
  entityId: { type: String, required: true, index: true },
  prediction: {
    value: Schema.Types.Mixed,
    probability: Number,
    confidence: Number,
    category: String
  },
  features: Schema.Types.Mixed,
  factors: [{
    name: String,
    value: Schema.Types.Mixed,
    impact: Number,
    direction: { type: String, enum: ['positive', 'negative', 'neutral'] },
    description: String
  }],
  recommendations: [{
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    action: String,
    description: String,
    expectedImpact: Number,
    category: String
  }],
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  validUntil: Date,
  actualOutcome: {
    value: Schema.Types.Mixed,
    recordedAt: Date,
    accuracy: Number
  },
  status: { type: String, enum: ['active', 'expired', 'validated'], default: 'active' }
}, { timestamps: true });

PredictionSchema.index({ tenantId: 1, entityId: 1, modelType: 1 });
PredictionSchema.index({ tenantId: 1, riskLevel: 1 });

export default mongoose.model<IPrediction>('Prediction', PredictionSchema);
