import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  planCode: string; // 'trial', 'free', 'starter', 'professional', 'enterprise'
  displayName: string; // 'Trial Plan', 'Free Plan', etc.
  description: string;

  // Pricing
  pricing: {
    monthly: number; // Amount in paise (INR smallest unit)
    yearly: number;
    currency: string;
  };

  // Limits
  limits: {
    maxEmployees: number; // -1 for unlimited
    maxAdmins: number; // -1 for unlimited
    maxStorage: number; // in MB, -1 for unlimited
    maxApiCalls: number; // per month, -1 for unlimited
  };

  // Features
  features: string[]; // Array of feature codes

  // Status
  isActive: boolean;
  isVisible: boolean; // Show on pricing page
  sortOrder: number; // Display order on pricing page

  // Metadata
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    planCode: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    pricing: {
      monthly: {
        type: Number,
        required: true,
        default: 0,
      },
      yearly: {
        type: Number,
        required: true,
        default: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
    },
    limits: {
      maxEmployees: {
        type: Number,
        required: true,
        default: 10,
      },
      maxAdmins: {
        type: Number,
        required: true,
        default: 1,
      },
      maxStorage: {
        type: Number,
        default: 1024, // 1GB default
      },
      maxApiCalls: {
        type: Number,
        default: 10000, // 10k calls per month
      },
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionPlanSchema.index({ isActive: 1, isVisible: 1 });
subscriptionPlanSchema.index({ sortOrder: 1 });

const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
