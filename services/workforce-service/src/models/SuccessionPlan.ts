import mongoose, { Document, Schema } from 'mongoose';

export interface ISuccessionPlan extends Document {
  tenantId: mongoose.Types.ObjectId;
  positionId: mongoose.Types.ObjectId;
  currentIncumbent?: mongoose.Types.ObjectId;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vacancyRisk: 'imminent' | 'near_term' | 'long_term' | 'none';
  successors: {
    employeeId: mongoose.Types.ObjectId;
    readiness: 'ready_now' | 'ready_1_year' | 'ready_2_years' | 'development_needed';
    potential: 'high' | 'medium' | 'low';
    performanceRating?: number;
    strengths?: string[];
    developmentAreas?: string[];
    developmentPlan?: string;
    mentorId?: mongoose.Types.ObjectId;
    lastReviewedAt?: Date;
  }[];
  talentPool?: mongoose.Types.ObjectId[];
  externalCandidatesNeeded: boolean;
  notes?: string;
  lastReviewedBy?: mongoose.Types.ObjectId;
  lastReviewedAt?: Date;
  nextReviewDate?: Date;
  status: 'active' | 'draft' | 'archived';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const successionPlanSchema = new Schema<ISuccessionPlan>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    positionId: { type: Schema.Types.ObjectId, required: true, ref: 'Position' },
    currentIncumbent: { type: Schema.Types.ObjectId, ref: 'Employee' },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    vacancyRisk: {
      type: String,
      enum: ['imminent', 'near_term', 'long_term', 'none'],
      default: 'none',
    },
    successors: [{
      employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
      readiness: {
        type: String,
        enum: ['ready_now', 'ready_1_year', 'ready_2_years', 'development_needed'],
      },
      potential: { type: String, enum: ['high', 'medium', 'low'] },
      performanceRating: Number,
      strengths: [String],
      developmentAreas: [String],
      developmentPlan: String,
      mentorId: Schema.Types.ObjectId,
      lastReviewedAt: Date,
    }],
    talentPool: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    externalCandidatesNeeded: { type: Boolean, default: false },
    notes: String,
    lastReviewedBy: Schema.Types.ObjectId,
    lastReviewedAt: Date,
    nextReviewDate: Date,
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'draft',
    },
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

successionPlanSchema.index({ tenantId: 1, positionId: 1 });
successionPlanSchema.index({ tenantId: 1, riskLevel: 1 });

export default mongoose.model<ISuccessionPlan>('SuccessionPlan', successionPlanSchema);
