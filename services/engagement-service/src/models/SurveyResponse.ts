import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer {
  questionId: string;
  value: string | number | string[] | Record<string, string>;
  skipped?: boolean;
}

export interface ISurveyResponse extends Document {
  tenantId: string;
  surveyId: string;
  employeeId?: string;
  anonymous: boolean;
  answers: IAnswer[];
  metadata: {
    department?: string;
    designation?: string;
    tenure?: number;
    location?: string;
  };
  completedAt?: Date;
  startedAt: Date;
  timeSpentSeconds?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AnswerSchema = new Schema({
  questionId: { type: String, required: true },
  value: Schema.Types.Mixed,
  skipped: { type: Boolean, default: false }
}, { _id: false });

const SurveyResponseSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  surveyId: { type: Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
  employeeId: { type: String, index: true },
  anonymous: { type: Boolean, default: true },
  answers: [AnswerSchema],
  metadata: {
    department: String,
    designation: String,
    tenure: Number,
    location: String
  },
  completedAt: Date,
  startedAt: { type: Date, default: Date.now },
  timeSpentSeconds: Number,
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

SurveyResponseSchema.index({ tenantId: 1, surveyId: 1 });
SurveyResponseSchema.index({ surveyId: 1, completedAt: 1 });

export default mongoose.model<ISurveyResponse>('SurveyResponse', SurveyResponseSchema);
