import mongoose, { Document, Schema } from 'mongoose';

export interface IDashboard extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  layout: 'grid' | 'freeform';
  widgets: {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'list' | 'gauge';
    title: string;
    dataSource: string;
    query: Record<string, unknown>;
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';
    config: Record<string, unknown>;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    refreshInterval?: number;
  }[];
  createdBy: mongoose.Types.ObjectId;
  isDefault: boolean;
  isPublic: boolean;
  sharedWith?: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dashboardSchema = new Schema<IDashboard>(
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
    layout: {
      type: String,
      enum: ['grid', 'freeform'],
      default: 'grid',
    },
    widgets: [{
      id: { type: String, required: true },
      type: {
        type: String,
        enum: ['chart', 'metric', 'table', 'list', 'gauge'],
        required: true,
      },
      title: { type: String, required: true },
      dataSource: { type: String, required: true },
      query: { type: Schema.Types.Mixed, default: {} },
      chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter'],
      },
      config: { type: Schema.Types.Mixed, default: {} },
      position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 4 },
        height: { type: Number, default: 3 },
      },
      refreshInterval: Number,
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

dashboardSchema.index({ tenantId: 1, createdBy: 1 });
dashboardSchema.index({ tenantId: 1, isDefault: 1 });

export default mongoose.model<IDashboard>('Dashboard', dashboardSchema);
