import mongoose, { Document, Schema } from 'mongoose';

export interface IComplianceTraining extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description: string;
  category: 'harassment' | 'safety' | 'data_privacy' | 'ethics' | 'diversity' | 'security' | 'regulatory' | 'other';
  content: {
    type: 'video' | 'document' | 'quiz' | 'external_link';
    url: string;
    duration?: number;
  }[];
  quiz?: {
    questions: {
      question: string;
      options: string[];
      correctAnswer: number;
      points: number;
    }[];
    passingScore: number;
    maxAttempts: number;
  };
  duration: number;
  isMandatory: boolean;
  frequency: 'once' | 'annual' | 'semi_annual' | 'quarterly';
  targetAudience: {
    departments?: mongoose.Types.ObjectId[];
    employmentTypes?: string[];
    allEmployees: boolean;
  };
  effectiveDate: Date;
  expiryDate?: Date;
  dueWithinDays: number;
  reminderDays: number[];
  certificateTemplate?: string;
  status: 'draft' | 'active' | 'archived';
  totalEnrollments: number;
  totalCompletions: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const complianceTrainingSchema = new Schema<IComplianceTraining>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    description: String,
    category: {
      type: String,
      enum: ['harassment', 'safety', 'data_privacy', 'ethics', 'diversity', 'security', 'regulatory', 'other'],
      required: true,
    },
    content: [{
      type: { type: String, enum: ['video', 'document', 'quiz', 'external_link'] },
      url: String,
      duration: Number,
    }],
    quiz: {
      questions: [{
        question: String,
        options: [String],
        correctAnswer: Number,
        points: Number,
      }],
      passingScore: Number,
      maxAttempts: { type: Number, default: 3 },
    },
    duration: { type: Number, required: true },
    isMandatory: { type: Boolean, default: true },
    frequency: { type: String, enum: ['once', 'annual', 'semi_annual', 'quarterly'], default: 'annual' },
    targetAudience: {
      departments: [Schema.Types.ObjectId],
      employmentTypes: [String],
      allEmployees: { type: Boolean, default: true },
    },
    effectiveDate: { type: Date, required: true },
    expiryDate: Date,
    dueWithinDays: { type: Number, default: 30 },
    reminderDays: [Number],
    certificateTemplate: String,
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
    totalEnrollments: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

complianceTrainingSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<IComplianceTraining>('ComplianceTraining', complianceTrainingSchema);
