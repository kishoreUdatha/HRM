import mongoose, { Document, Schema } from 'mongoose';

export interface IWellnessProgram extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: 'fitness' | 'mental_health' | 'nutrition' | 'financial' | 'work_life' | 'other';
  type: 'reimbursement' | 'discount' | 'service' | 'challenge' | 'education';
  provider?: {
    name: string;
    website?: string;
    contactInfo?: string;
  };
  benefits: {
    description: string;
    value?: number;
    valueType?: 'fixed' | 'percentage';
    maxAmount?: number;
  }[];
  eligibility: {
    employmentTypes: string[];
    minTenureDays: number;
  };
  enrollmentLimit?: number;
  currentEnrollments: number;
  startDate: Date;
  endDate?: Date;
  activities?: {
    name: string;
    description: string;
    points: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'one_time';
  }[];
  rewards?: {
    milestone: number;
    reward: string;
    value?: number;
  }[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const wellnessProgramSchema = new Schema<IWellnessProgram>(
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
    description: String,
    category: {
      type: String,
      enum: ['fitness', 'mental_health', 'nutrition', 'financial', 'work_life', 'other'],
      required: true,
    },
    type: {
      type: String,
      enum: ['reimbursement', 'discount', 'service', 'challenge', 'education'],
      required: true,
    },
    provider: {
      name: String,
      website: String,
      contactInfo: String,
    },
    benefits: [{
      description: String,
      value: Number,
      valueType: {
        type: String,
        enum: ['fixed', 'percentage'],
      },
      maxAmount: Number,
    }],
    eligibility: {
      employmentTypes: [String],
      minTenureDays: { type: Number, default: 0 },
    },
    enrollmentLimit: Number,
    currentEnrollments: { type: Number, default: 0 },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    activities: [{
      name: String,
      description: String,
      points: Number,
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'one_time'],
      },
    }],
    rewards: [{
      milestone: Number,
      reward: String,
      value: Number,
    }],
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

wellnessProgramSchema.index({ tenantId: 1, category: 1 });
wellnessProgramSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IWellnessProgram>('WellnessProgram', wellnessProgramSchema);
