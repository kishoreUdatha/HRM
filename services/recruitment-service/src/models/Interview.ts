import mongoose, { Document, Schema } from 'mongoose';

export interface IInterview extends Document {
  tenantId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  jobPostingId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  type: 'phone_screen' | 'video' | 'onsite' | 'technical' | 'panel' | 'hr' | 'final';
  round: number;
  title: string;
  scheduledAt: Date;
  duration: number;
  timezone: string;
  location?: {
    type: 'virtual' | 'onsite';
    meetingLink?: string;
    address?: string;
    room?: string;
  };
  interviewers: {
    employeeId: mongoose.Types.ObjectId;
    role: 'lead' | 'panel' | 'shadow';
    confirmed: boolean;
    confirmedAt?: Date;
  }[];
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  cancellationReason?: string;
  rescheduledFrom?: mongoose.Types.ObjectId;
  candidateConfirmed: boolean;
  candidateConfirmedAt?: Date;
  remindersSent: { type: string; sentAt: Date }[];
  agenda?: string;
  questions?: { question: string; category?: string; expectedAnswer?: string }[];
  feedback?: {
    interviewerId: mongoose.Types.ObjectId;
    scores?: { criteria: string; score: number; comments?: string }[];
    overallScore?: number;
    strengths?: string[];
    concerns?: string[];
    recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
    notes?: string;
    submittedAt: Date;
  }[];
  recording?: {
    url: string;
    duration: number;
    uploadedAt: Date;
  };
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSchema = new Schema<IInterview>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, required: true, ref: 'Application' },
    jobPostingId: { type: Schema.Types.ObjectId, required: true, ref: 'JobPosting' },
    candidateId: { type: Schema.Types.ObjectId, required: true, ref: 'Candidate' },
    type: {
      type: String,
      enum: ['phone_screen', 'video', 'onsite', 'technical', 'panel', 'hr', 'final'],
      required: true,
    },
    round: { type: Number, default: 1 },
    title: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 },
    timezone: { type: String, default: 'UTC' },
    location: {
      type: { type: String, enum: ['virtual', 'onsite'], default: 'virtual' },
      meetingLink: String,
      address: String,
      room: String,
    },
    interviewers: [{
      employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
      role: { type: String, enum: ['lead', 'panel', 'shadow'], default: 'panel' },
      confirmed: { type: Boolean, default: false },
      confirmedAt: Date,
    }],
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
      default: 'scheduled',
    },
    cancellationReason: String,
    rescheduledFrom: Schema.Types.ObjectId,
    candidateConfirmed: { type: Boolean, default: false },
    candidateConfirmedAt: Date,
    remindersSent: [{ type: String, sentAt: Date }],
    agenda: String,
    questions: [{ question: String, category: String, expectedAnswer: String }],
    feedback: [{
      interviewerId: Schema.Types.ObjectId,
      scores: [{ criteria: String, score: Number, comments: String }],
      overallScore: Number,
      strengths: [String],
      concerns: [String],
      recommendation: { type: String, enum: ['strong_yes', 'yes', 'neutral', 'no', 'strong_no'] },
      notes: String,
      submittedAt: Date,
    }],
    recording: {
      url: String,
      duration: Number,
      uploadedAt: Date,
    },
    notes: String,
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

interviewSchema.index({ tenantId: 1, applicationId: 1 });
interviewSchema.index({ tenantId: 1, scheduledAt: 1 });
interviewSchema.index({ tenantId: 1, 'interviewers.employeeId': 1 });
interviewSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IInterview>('Interview', interviewSchema);
