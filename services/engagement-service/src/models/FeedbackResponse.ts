import mongoose, { Schema, Document } from 'mongoose';

export interface ICriteriaRating {
  criteriaId: string;
  rating: number;
  comment?: string;
}

export interface IFeedbackResponse extends Document {
  tenantId: string;
  cycleId: string;
  targetEmployeeId: string;
  reviewerEmployeeId: string;
  relationship: 'self' | 'manager' | 'peer' | 'direct_report' | 'external';
  ratings: ICriteriaRating[];
  overallComments: {
    strengths?: string;
    areasForImprovement?: string;
    additionalComments?: string;
  };
  status: 'draft' | 'submitted';
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CriteriaRatingSchema = new Schema({
  criteriaId: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: String
}, { _id: false });

const FeedbackResponseSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  cycleId: { type: Schema.Types.ObjectId, ref: 'Feedback360Cycle', required: true, index: true },
  targetEmployeeId: { type: String, required: true, index: true },
  reviewerEmployeeId: { type: String, required: true },
  relationship: { type: String, enum: ['self', 'manager', 'peer', 'direct_report', 'external'], required: true },
  ratings: [CriteriaRatingSchema],
  overallComments: {
    strengths: String,
    areasForImprovement: String,
    additionalComments: String
  },
  status: { type: String, enum: ['draft', 'submitted'], default: 'draft' },
  submittedAt: Date
}, { timestamps: true });

FeedbackResponseSchema.index({ cycleId: 1, targetEmployeeId: 1, reviewerEmployeeId: 1 }, { unique: true });

export default mongoose.model<IFeedbackResponse>('FeedbackResponse', FeedbackResponseSchema);
