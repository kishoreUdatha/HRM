import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  tenantId: mongoose.Types.ObjectId;
  razorpayCustomerId: string;
  razorpaySubscriptionId?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired';
  amount: number;
  currency: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    razorpayCustomerId: {
      type: String,
      required: true,
      index: true,
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    status: {
      type: String,
      enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
      default: 'created',
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    cancelledAt: Date,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriptionSchema.index({ tenantId: 1, status: 1 });
SubscriptionSchema.index({ razorpaySubscriptionId: 1 });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
