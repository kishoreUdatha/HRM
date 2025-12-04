import mongoose, { Document, Schema } from 'mongoose';

export interface IPrediction extends Document {
  tenantId: string;
  type: 'attrition' | 'performance' | 'attendance' | 'hiring' | 'salary' | 'engagement';
  entityType: 'employee' | 'department' | 'organization';
  entityId?: mongoose.Types.ObjectId;
  period: {
    start: Date;
    end: Date;
  };
  prediction: {
    value: number;
    confidence: number;
    range: {
      low: number;
      high: number;
    };
  };
  factors: {
    name: string;
    weight: number;
    value: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: number;
    category: string;
  }[];
  modelInfo: {
    name: string;
    version: string;
    accuracy: number;
    lastTrained: Date;
  };
  status: 'active' | 'expired' | 'superseded';
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PredictionSchema = new Schema<IPrediction>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['attrition', 'performance', 'attendance', 'hiring', 'salary', 'engagement'],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['employee', 'department', 'organization'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    prediction: {
      value: { type: Number, required: true },
      confidence: { type: Number, required: true },
      range: {
        low: Number,
        high: Number,
      },
    },
    factors: [{
      name: String,
      weight: Number,
      value: Number,
      impact: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
      },
      description: String,
    }],
    recommendations: [{
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
      },
      action: String,
      expectedImpact: Number,
      category: String,
    }],
    modelInfo: {
      name: String,
      version: String,
      accuracy: Number,
      lastTrained: Date,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'superseded'],
      default: 'active',
    },
    validUntil: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

PredictionSchema.index({ tenantId: 1, type: 1, status: 1 });
PredictionSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
PredictionSchema.index({ validUntil: 1 });

export default mongoose.model<IPrediction>('Prediction', PredictionSchema);
