import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: 'employee' | 'attendance' | 'leave' | 'payroll' | 'recruitment' | 'performance' | 'training' | 'custom';
  category: 'standard' | 'custom' | 'scheduled';
  query: Record<string, unknown>;
  filters: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
    value: unknown;
  }[];
  columns: {
    field: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
    format?: string;
  }[];
  sortBy?: {
    field: string;
    order: 'asc' | 'desc';
  };
  groupBy?: string;
  aggregations?: {
    field: string;
    type: 'sum' | 'avg' | 'count' | 'min' | 'max';
    label: string;
  }[];
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
  };
  lastGeneratedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['employee', 'attendance', 'leave', 'payroll', 'recruitment', 'performance', 'training', 'custom'],
      required: true,
    },
    category: {
      type: String,
      enum: ['standard', 'custom', 'scheduled'],
      default: 'standard',
    },
    query: {
      type: Schema.Types.Mixed,
      default: {},
    },
    filters: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'between', 'in'],
      },
      value: Schema.Types.Mixed,
    }],
    columns: [{
      field: { type: String, required: true },
      label: { type: String, required: true },
      type: {
        type: String,
        enum: ['string', 'number', 'date', 'boolean', 'currency'],
        default: 'string',
      },
      format: String,
    }],
    sortBy: {
      field: String,
      order: { type: String, enum: ['asc', 'desc'] },
    },
    groupBy: String,
    aggregations: [{
      field: String,
      type: { type: String, enum: ['sum', 'avg', 'count', 'min', 'max'] },
      label: String,
    }],
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      dayOfWeek: Number,
      dayOfMonth: Number,
      time: String,
      recipients: [String],
      format: { type: String, enum: ['pdf', 'excel', 'csv'] },
    },
    lastGeneratedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ tenantId: 1, type: 1 });
reportSchema.index({ tenantId: 1, createdBy: 1 });

export default mongoose.model<IReport>('Report', reportSchema);
