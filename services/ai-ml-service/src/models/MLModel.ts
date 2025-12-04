import mongoose, { Schema, Document } from 'mongoose';

export interface IMLModel extends Document {
  tenantId: string;
  name: string;
  type: 'attrition' | 'performance' | 'engagement' | 'skill_gap' | 'salary' | 'promotion' | 'sentiment' | 'custom';
  version: string;
  description: string;
  features: string[];
  targetVariable: string;
  algorithm: string;
  hyperparameters: Record<string, any>;
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    rmse?: number;
    mae?: number;
    r2?: number;
  };
  trainingData: {
    recordCount: number;
    dateRange: { start: Date; end: Date };
    lastTrainedAt: Date;
  };
  status: 'training' | 'active' | 'inactive' | 'failed';
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const MLModelSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['attrition', 'performance', 'engagement', 'skill_gap', 'salary', 'promotion', 'sentiment', 'custom'], required: true },
  version: { type: String, default: '1.0.0' },
  description: String,
  features: [String],
  targetVariable: String,
  algorithm: String,
  hyperparameters: Schema.Types.Mixed,
  metrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    rmse: Number,
    mae: Number,
    r2: Number
  },
  trainingData: {
    recordCount: Number,
    dateRange: { start: Date, end: Date },
    lastTrainedAt: Date
  },
  status: { type: String, enum: ['training', 'active', 'inactive', 'failed'], default: 'inactive' },
  isDefault: { type: Boolean, default: false },
  createdBy: String
}, { timestamps: true });

MLModelSchema.index({ tenantId: 1, type: 1, isDefault: 1 });

export default mongoose.model<IMLModel>('MLModel', MLModelSchema);
