import mongoose, { Document, Schema } from 'mongoose';

export interface IPerformanceReview extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  reviewCycleId?: mongoose.Types.ObjectId;
  period: {
    startDate: Date;
    endDate: Date;
  };
  type: 'annual' | 'quarterly' | 'probation' | 'mid_year' | 'project';
  status: 'draft' | 'self_review' | 'manager_review' | 'calibration' | 'completed';
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  goals: {
    title: string;
    description: string;
    targetDate?: Date;
    weight: number;
    selfScore?: number;
    managerScore?: number;
    comments?: string;
    status: 'pending' | 'in_progress' | 'achieved' | 'partially_achieved' | 'not_achieved';
  }[];
  competencies: {
    name: string;
    description: string;
    selfScore?: number;
    managerScore?: number;
    comments?: string;
  }[];
  strengths?: string[];
  areasOfImprovement?: string[];
  selfComments?: string;
  managerComments?: string;
  employeeFeedback?: string;
  developmentPlan?: string;
  promotionRecommendation?: boolean;
  salaryRecommendation?: {
    percentage: number;
    amount: number;
    comments: string;
  };
  submittedAt?: Date;
  completedAt?: Date;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const performanceReviewSchema = new Schema<IPerformanceReview>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    reviewCycleId: {
      type: Schema.Types.ObjectId,
      ref: 'ReviewCycle',
    },
    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    type: {
      type: String,
      enum: ['annual', 'quarterly', 'probation', 'mid_year', 'project'],
      default: 'annual',
    },
    status: {
      type: String,
      enum: ['draft', 'self_review', 'manager_review', 'calibration', 'completed'],
      default: 'draft',
    },
    selfRating: { type: Number, min: 1, max: 5 },
    managerRating: { type: Number, min: 1, max: 5 },
    finalRating: { type: Number, min: 1, max: 5 },
    goals: [{
      title: { type: String, required: true },
      description: String,
      targetDate: Date,
      weight: { type: Number, default: 0 },
      selfScore: { type: Number, min: 1, max: 5 },
      managerScore: { type: Number, min: 1, max: 5 },
      comments: String,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'achieved', 'partially_achieved', 'not_achieved'],
        default: 'pending',
      },
    }],
    competencies: [{
      name: { type: String, required: true },
      description: String,
      selfScore: { type: Number, min: 1, max: 5 },
      managerScore: { type: Number, min: 1, max: 5 },
      comments: String,
    }],
    strengths: [String],
    areasOfImprovement: [String],
    selfComments: String,
    managerComments: String,
    employeeFeedback: String,
    developmentPlan: String,
    promotionRecommendation: Boolean,
    salaryRecommendation: {
      percentage: Number,
      amount: Number,
      comments: String,
    },
    submittedAt: Date,
    completedAt: Date,
    acknowledgedAt: Date,
  },
  {
    timestamps: true,
  }
);

performanceReviewSchema.index({ tenantId: 1, employeeId: 1 });
performanceReviewSchema.index({ tenantId: 1, reviewerId: 1 });
performanceReviewSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IPerformanceReview>('PerformanceReview', performanceReviewSchema);
