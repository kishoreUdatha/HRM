import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  action: string;
  category: 'auth' | 'user' | 'employee' | 'attendance' | 'leave' | 'payroll' | 'settings' | 'document' | 'recruitment' | 'performance' | 'training' | 'system';
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['auth', 'user', 'employee', 'attendance', 'leave', 'payroll', 'settings', 'document', 'recruitment', 'performance', 'training', 'system'],
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: String,
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    changes: [{
      field: String,
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
    }],
    ipAddress: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
    errorMessage: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1 });
auditLogSchema.index({ tenantId: 1, category: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, action: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // Auto-delete after 1 year

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
