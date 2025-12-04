import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
  tenantId: mongoose.Types.ObjectId;
  applicationNumber: string;
  jobPostingId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  coverLetter?: string;
  screeningAnswers?: { question: string; answer: string; passed?: boolean }[];
  currentStage: string;
  stageHistory: {
    stage: string;
    enteredAt: Date;
    exitedAt?: Date;
    movedBy?: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  status: 'new' | 'screening' | 'interviewing' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
  rejectionReason?: string;
  withdrawnReason?: string;
  scorecards?: {
    interviewId?: mongoose.Types.ObjectId;
    evaluatorId: mongoose.Types.ObjectId;
    scores: { criteria: string; score: number; comments?: string }[];
    overallScore: number;
    recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
    submittedAt: Date;
  }[];
  overallRating?: number;
  feedback?: { by: mongoose.Types.ObjectId; text: string; at: Date; isPrivate: boolean }[];
  tags?: string[];
  assignedRecruiter?: mongoose.Types.ObjectId;
  source: string;
  referralBonus?: {
    eligible: boolean;
    referrerId?: mongoose.Types.ObjectId;
    amount?: number;
    paidAt?: Date;
  };
  timeline: {
    action: string;
    by?: mongoose.Types.ObjectId;
    at: Date;
    details?: string;
  }[];
  appliedAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    applicationNumber: { type: String, required: true },
    jobPostingId: { type: Schema.Types.ObjectId, required: true, ref: 'JobPosting' },
    candidateId: { type: Schema.Types.ObjectId, required: true, ref: 'Candidate' },
    coverLetter: String,
    screeningAnswers: [{ question: String, answer: String, passed: Boolean }],
    currentStage: { type: String, default: 'applied' },
    stageHistory: [{
      stage: String,
      enteredAt: { type: Date, default: Date.now },
      exitedAt: Date,
      movedBy: Schema.Types.ObjectId,
      notes: String,
    }],
    status: {
      type: String,
      enum: ['new', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'],
      default: 'new',
    },
    rejectionReason: String,
    withdrawnReason: String,
    scorecards: [{
      interviewId: Schema.Types.ObjectId,
      evaluatorId: Schema.Types.ObjectId,
      scores: [{ criteria: String, score: Number, comments: String }],
      overallScore: Number,
      recommendation: { type: String, enum: ['strong_yes', 'yes', 'neutral', 'no', 'strong_no'] },
      submittedAt: Date,
    }],
    overallRating: Number,
    feedback: [{ by: Schema.Types.ObjectId, text: String, at: { type: Date, default: Date.now }, isPrivate: { type: Boolean, default: false } }],
    tags: [String],
    assignedRecruiter: { type: Schema.Types.ObjectId, ref: 'Employee' },
    source: String,
    referralBonus: {
      eligible: Boolean,
      referrerId: Schema.Types.ObjectId,
      amount: Number,
      paidAt: Date,
    },
    timeline: [{
      action: String,
      by: Schema.Types.ObjectId,
      at: { type: Date, default: Date.now },
      details: String,
    }],
    appliedAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

applicationSchema.index({ tenantId: 1, applicationNumber: 1 }, { unique: true });
applicationSchema.index({ tenantId: 1, jobPostingId: 1 });
applicationSchema.index({ tenantId: 1, candidateId: 1 });
applicationSchema.index({ tenantId: 1, status: 1 });
applicationSchema.index({ tenantId: 1, currentStage: 1 });

export default mongoose.model<IApplication>('Application', applicationSchema);
