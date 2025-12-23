import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformNotification extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature' | 'billing';
  targetAudience: 'all' | 'plan_specific' | 'tenant_specific';
  targetPlans?: string[];
  targetTenants?: mongoose.Types.ObjectId[];
  scheduledAt?: Date;
  sentAt?: Date;
  expiresAt?: Date;
  status: 'draft' | 'scheduled' | 'sent' | 'expired' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dismissible: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdBy: mongoose.Types.ObjectId;
  readBy: { tenantId: mongoose.Types.ObjectId; readAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const PlatformNotificationSchema = new Schema<IPlatformNotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'maintenance', 'feature', 'billing'],
      default: 'info',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'plan_specific', 'tenant_specific'],
      default: 'all',
    },
    targetPlans: [{
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
    }],
    targetTenants: [{
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
    }],
    scheduledAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'expired', 'cancelled'],
      default: 'draft',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    dismissible: {
      type: Boolean,
      default: true,
    },
    actionUrl: {
      type: String,
    },
    actionLabel: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    readBy: [{
      tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
      readAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
PlatformNotificationSchema.index({ status: 1, scheduledAt: 1 });
PlatformNotificationSchema.index({ status: 1, targetAudience: 1 });
PlatformNotificationSchema.index({ createdAt: -1 });

export default mongoose.model<IPlatformNotification>('PlatformNotification', PlatformNotificationSchema);
