import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationTemplate extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  category: string;
  subject: string;
  body: string;
  variables: string[];
  channels: ('email' | 'inApp' | 'sms' | 'push')[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
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
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    variables: [String],
    channels: [{
      type: String,
      enum: ['email', 'inApp', 'sms', 'push'],
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationTemplateSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<INotificationTemplate>('NotificationTemplate', notificationTemplateSchema);
