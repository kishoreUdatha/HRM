import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  templateCode?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  sentAt?: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    to: {
      type: String,
      required: true,
    },
    cc: [String],
    bcc: [String],
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    templateCode: String,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    error: String,
    sentAt: Date,
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index({ tenantId: 1, status: 1 });
emailLogSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
