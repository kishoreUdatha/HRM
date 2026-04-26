import mongoose, { Document, Schema } from 'mongoose';

export interface IPayoutConfig extends Document {
  tenantId: mongoose.Types.ObjectId;

  // Razorpay Account Configuration
  razorpayAccountId: string;
  razorpayKeyId: string;  // Encrypted
  razorpayKeySecret: string;  // Encrypted
  webhookSecret: string;  // Encrypted

  // Workflow Configuration
  payoutMode: 'automatic' | 'manual' | 'scheduled';
  scheduledDay?: number;  // Day of month (1-28) for scheduled payouts
  scheduledTime?: string;  // HH:mm format

  // Payout Settings
  defaultPayoutMethod: 'NEFT' | 'IMPS' | 'RTGS';
  impsThreshold: number;  // Amount below which IMPS is used (default 200000 paise = 2000 INR)
  rtgsThreshold: number;  // Amount above which RTGS is required (default 20000000 paise = 200000 INR)

  // Approval Settings
  requireApproval: boolean;
  approverRoles: string[];
  minApprovers: number;

  // Notifications
  notifyEmployeeOnPayout: boolean;
  notifyHROnFailure: boolean;
  notifyOnBatchComplete: boolean;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutConfigSchema = new Schema<IPayoutConfig>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    razorpayAccountId: {
      type: String,
      default: '',
    },
    razorpayKeyId: {
      type: String,
      default: '',
    },
    razorpayKeySecret: {
      type: String,
      default: '',
    },
    webhookSecret: {
      type: String,
      default: '',
    },
    payoutMode: {
      type: String,
      enum: ['automatic', 'manual', 'scheduled'],
      default: 'manual',
    },
    scheduledDay: {
      type: Number,
      min: 1,
      max: 28,
    },
    scheduledTime: {
      type: String,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    defaultPayoutMethod: {
      type: String,
      enum: ['NEFT', 'IMPS', 'RTGS'],
      default: 'IMPS',
    },
    impsThreshold: {
      type: Number,
      default: 20000000,  // 2 lakh in paise
    },
    rtgsThreshold: {
      type: Number,
      default: 2000000000,  // 2 crore in paise
    },
    requireApproval: {
      type: Boolean,
      default: true,
    },
    approverRoles: {
      type: [String],
      default: ['tenant_admin', 'hr'],
    },
    minApprovers: {
      type: Number,
      default: 1,
      min: 1,
    },
    notifyEmployeeOnPayout: {
      type: Boolean,
      default: true,
    },
    notifyHROnFailure: {
      type: Boolean,
      default: true,
    },
    notifyOnBatchComplete: {
      type: Boolean,
      default: true,
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

export default mongoose.model<IPayoutConfig>('PayoutConfig', PayoutConfigSchema);
