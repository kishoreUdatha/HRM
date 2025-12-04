import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackCriteria {
  id: string;
  name: string;
  description: string;
  category: 'leadership' | 'communication' | 'teamwork' | 'technical' | 'innovation' | 'custom';
  weight: number;
}

export interface IFeedbackReviewer {
  employeeId: string;
  relationship: 'self' | 'manager' | 'peer' | 'direct_report' | 'external';
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
  invitedAt: Date;
  completedAt?: Date;
  reminderCount: number;
}

export interface IFeedback360Cycle extends Document {
  tenantId: string;
  name: string;
  description: string;
  criteria: IFeedbackCriteria[];
  settings: {
    anonymousPeerFeedback: boolean;
    anonymousDirectReportFeedback: boolean;
    selfAssessmentRequired: boolean;
    minReviewersPerRelationship: Record<string, number>;
    allowExternalReviewers: boolean;
    ratingScale: number;
  };
  schedule: {
    nominationStart: Date;
    nominationEnd: Date;
    feedbackStart: Date;
    feedbackEnd: Date;
    resultsReleaseDate: Date;
  };
  participants: Array<{
    employeeId: string;
    reviewers: IFeedbackReviewer[];
    status: 'nomination' | 'feedback_collection' | 'completed' | 'results_shared';
  }>;
  status: 'draft' | 'nomination' | 'feedback_collection' | 'processing' | 'completed' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackCriteriaSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['leadership', 'communication', 'teamwork', 'technical', 'innovation', 'custom'], default: 'custom' },
  weight: { type: Number, default: 1 }
}, { _id: false });

const ReviewerSchema = new Schema({
  employeeId: { type: String, required: true },
  relationship: { type: String, enum: ['self', 'manager', 'peer', 'direct_report', 'external'], required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'declined'], default: 'pending' },
  invitedAt: { type: Date, default: Date.now },
  completedAt: Date,
  reminderCount: { type: Number, default: 0 }
}, { _id: false });

const ParticipantSchema = new Schema({
  employeeId: { type: String, required: true },
  reviewers: [ReviewerSchema],
  status: { type: String, enum: ['nomination', 'feedback_collection', 'completed', 'results_shared'], default: 'nomination' }
}, { _id: false });

const Feedback360CycleSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  criteria: [FeedbackCriteriaSchema],
  settings: {
    anonymousPeerFeedback: { type: Boolean, default: true },
    anonymousDirectReportFeedback: { type: Boolean, default: true },
    selfAssessmentRequired: { type: Boolean, default: true },
    minReviewersPerRelationship: { type: Map, of: Number },
    allowExternalReviewers: { type: Boolean, default: false },
    ratingScale: { type: Number, default: 5 }
  },
  schedule: {
    nominationStart: Date,
    nominationEnd: Date,
    feedbackStart: Date,
    feedbackEnd: Date,
    resultsReleaseDate: Date
  },
  participants: [ParticipantSchema],
  status: { type: String, enum: ['draft', 'nomination', 'feedback_collection', 'processing', 'completed', 'archived'], default: 'draft' },
  createdBy: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IFeedback360Cycle>('Feedback360Cycle', Feedback360CycleSchema);
