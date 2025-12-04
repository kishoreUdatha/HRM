import mongoose, { Document, Schema } from 'mongoose';

export interface IReportExecution extends Document {
  tenantId: mongoose.Types.ObjectId;
  reportId: mongoose.Types.ObjectId;
  executedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'running' | 'completed' | 'failed';
  parameters: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  rowCount?: number;
  fileUrl?: string;
  fileSize?: number;
  format: 'json' | 'csv' | 'excel' | 'pdf';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportExecutionSchema = new Schema<IReportExecution>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reportId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Report',
    },
    executedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    parameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    duration: Number,
    rowCount: Number,
    fileUrl: String,
    fileSize: Number,
    format: {
      type: String,
      enum: ['json', 'csv', 'excel', 'pdf'],
      default: 'json',
    },
    error: String,
  },
  {
    timestamps: true,
  }
);

reportExecutionSchema.index({ tenantId: 1, reportId: 1 });
reportExecutionSchema.index({ tenantId: 1, executedBy: 1 });
reportExecutionSchema.index({ createdAt: -1 });

export default mongoose.model<IReportExecution>('ReportExecution', reportExecutionSchema);
