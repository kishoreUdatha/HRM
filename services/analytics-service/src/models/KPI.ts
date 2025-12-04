import mongoose, { Document, Schema } from 'mongoose';

export interface IKPI extends Document {
  tenantId: string;
  name: string;
  description: string;
  category: 'workforce' | 'attendance' | 'performance' | 'recruitment' | 'payroll' | 'engagement' | 'custom';
  type: 'metric' | 'ratio' | 'percentage' | 'count' | 'average' | 'sum';
  formula: {
    expression: string;
    variables: {
      name: string;
      source: string;
      field: string;
      aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
      filters?: Record<string, any>;
    }[];
  };
  target?: {
    value: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  thresholds: {
    critical: { value: number; operator: string };
    warning: { value: number; operator: string };
    good: { value: number; operator: string };
  };
  visualization: 'number' | 'gauge' | 'trend' | 'bar' | 'pie' | 'line';
  displayFormat: {
    prefix?: string;
    suffix?: string;
    decimals: number;
  };
  refreshInterval: number; // in minutes
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastCalculated?: Date;
  lastValue?: number;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    previousValue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const KPISchema = new Schema<IKPI>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['workforce', 'attendance', 'performance', 'recruitment', 'payroll', 'engagement', 'custom'],
      required: true,
    },
    type: {
      type: String,
      enum: ['metric', 'ratio', 'percentage', 'count', 'average', 'sum'],
      required: true,
    },
    formula: {
      expression: {
        type: String,
        required: true,
      },
      variables: [{
        name: String,
        source: String,
        field: String,
        aggregation: {
          type: String,
          enum: ['sum', 'avg', 'count', 'min', 'max'],
        },
        filters: Schema.Types.Mixed,
      }],
    },
    target: {
      value: Number,
      operator: {
        type: String,
        enum: ['gt', 'lt', 'eq', 'gte', 'lte'],
      },
      period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      },
    },
    thresholds: {
      critical: {
        value: Number,
        operator: String,
      },
      warning: {
        value: Number,
        operator: String,
      },
      good: {
        value: Number,
        operator: String,
      },
    },
    visualization: {
      type: String,
      enum: ['number', 'gauge', 'trend', 'bar', 'pie', 'line'],
      default: 'number',
    },
    displayFormat: {
      prefix: String,
      suffix: String,
      decimals: {
        type: Number,
        default: 2,
      },
    },
    refreshInterval: {
      type: Number,
      default: 60, // 1 hour
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    lastCalculated: Date,
    lastValue: Number,
    trend: {
      direction: {
        type: String,
        enum: ['up', 'down', 'stable'],
      },
      percentage: Number,
      previousValue: Number,
    },
  },
  {
    timestamps: true,
  }
);

KPISchema.index({ tenantId: 1, category: 1 });
KPISchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IKPI>('KPI', KPISchema);
