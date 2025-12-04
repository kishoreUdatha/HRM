import mongoose, { Document, Schema } from 'mongoose';

export interface IDashboard extends Document {
  tenantId: string;
  name: string;
  description: string;
  type: 'executive' | 'hr' | 'manager' | 'employee' | 'custom';
  isDefault: boolean;
  isPublic: boolean;
  createdBy: mongoose.Types.ObjectId;
  sharedWith: {
    type: 'user' | 'role' | 'department';
    id: string;
    permission: 'view' | 'edit';
  }[];
  layout: {
    columns: number;
    rows: number;
  };
  widgets: {
    id: string;
    type: 'kpi' | 'chart' | 'table' | 'list' | 'calendar' | 'map' | 'text';
    title: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config: {
      kpiId?: mongoose.Types.ObjectId;
      chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'heatmap';
      dataSource?: string;
      query?: Record<string, any>;
      metrics?: string[];
      dimensions?: string[];
      filters?: Record<string, any>;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      colors?: string[];
      showLegend?: boolean;
      showLabels?: boolean;
      refreshInterval?: number;
    };
    style?: {
      backgroundColor?: string;
      borderColor?: string;
      textColor?: string;
    };
  }[];
  filters: {
    name: string;
    field: string;
    type: 'date' | 'select' | 'multiselect' | 'text';
    defaultValue?: any;
    options?: { label: string; value: any }[];
  }[];
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
  createdAt: Date;
  updatedAt: Date;
}

const DashboardSchema = new Schema<IDashboard>(
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
    },
    type: {
      type: String,
      enum: ['executive', 'hr', 'manager', 'employee', 'custom'],
      default: 'custom',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sharedWith: [{
      type: {
        type: String,
        enum: ['user', 'role', 'department'],
      },
      id: String,
      permission: {
        type: String,
        enum: ['view', 'edit'],
      },
    }],
    layout: {
      columns: { type: Number, default: 12 },
      rows: { type: Number, default: 8 },
    },
    widgets: [{
      id: { type: String, required: true },
      type: {
        type: String,
        enum: ['kpi', 'chart', 'table', 'list', 'calendar', 'map', 'text'],
        required: true,
      },
      title: { type: String, required: true },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
      },
      config: {
        kpiId: Schema.Types.ObjectId,
        chartType: String,
        dataSource: String,
        query: Schema.Types.Mixed,
        metrics: [String],
        dimensions: [String],
        filters: Schema.Types.Mixed,
        sortBy: String,
        sortOrder: String,
        limit: Number,
        colors: [String],
        showLegend: Boolean,
        showLabels: Boolean,
        refreshInterval: Number,
      },
      style: {
        backgroundColor: String,
        borderColor: String,
        textColor: String,
      },
    }],
    filters: [{
      name: String,
      field: String,
      type: {
        type: String,
        enum: ['date', 'select', 'multiselect', 'text'],
      },
      defaultValue: Schema.Types.Mixed,
      options: [{ label: String, value: Schema.Types.Mixed }],
    }],
    refreshInterval: {
      type: Number,
      default: 300, // 5 minutes
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
  },
  {
    timestamps: true,
  }
);

DashboardSchema.index({ tenantId: 1, createdBy: 1 });
DashboardSchema.index({ tenantId: 1, type: 1 });
DashboardSchema.index({ tenantId: 1, isDefault: 1 });

export default mongoose.model<IDashboard>('Dashboard', DashboardSchema);
