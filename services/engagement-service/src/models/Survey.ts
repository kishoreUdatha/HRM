import mongoose, { Document, Schema } from 'mongoose';

export interface ISurvey extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'engagement' | 'pulse' | 'satisfaction' | 'feedback' | 'exit' | 'onboarding' | 'custom';
  questions: {
    id: string;
    text: string;
    type: 'rating' | 'text' | 'multiple_choice' | 'checkbox' | 'nps' | 'scale';
    required: boolean;
    options?: string[];
    scale?: { min: number; max: number; labels?: { min: string; max: string } };
    category?: string;
  }[];
  targetAudience: {
    departments?: mongoose.Types.ObjectId[];
    employmentTypes?: string[];
    allEmployees: boolean;
  };
  isAnonymous: boolean;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'scheduled' | 'active' | 'closed' | 'archived';
  totalInvited: number;
  totalResponses: number;
  responseRate: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const surveySchema = new Schema<ISurvey>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['engagement', 'pulse', 'satisfaction', 'feedback', 'exit', 'onboarding', 'custom'], required: true },
    questions: [{ id: String, text: String, type: String, required: Boolean, options: [String], scale: { min: Number, max: Number, labels: { min: String, max: String } }, category: String }],
    targetAudience: { departments: [Schema.Types.ObjectId], employmentTypes: [String], allEmployees: { type: Boolean, default: true } },
    isAnonymous: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'scheduled', 'active', 'closed', 'archived'], default: 'draft' },
    totalInvited: { type: Number, default: 0 },
    totalResponses: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

surveySchema.index({ tenantId: 1, status: 1 });
export default mongoose.model<ISurvey>('Survey', surveySchema);
