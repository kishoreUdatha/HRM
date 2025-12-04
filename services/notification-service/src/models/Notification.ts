import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'leave' | 'attendance' | 'payroll' | 'employee' | 'system' | 'announcement';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
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
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    category: {
      type: String,
      enum: ['leave', 'attendance', 'payroll', 'employee', 'system', 'announcement'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    link: String,
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ tenantId: 1, userId: 1, isRead: 1 });
notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
