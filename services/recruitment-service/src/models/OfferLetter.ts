import mongoose, { Document, Schema } from 'mongoose';

export interface IOfferLetter extends Document {
  tenantId: mongoose.Types.ObjectId;
  offerNumber: string;
  applicationId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  jobPostingId: mongoose.Types.ObjectId;
  positionTitle: string;
  departmentId: mongoose.Types.ObjectId;
  reportingTo: mongoose.Types.ObjectId;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
  startDate: Date;
  compensation: {
    baseSalary: number;
    currency: string;
    payFrequency: 'hourly' | 'weekly' | 'biweekly' | 'monthly' | 'annual';
    signingBonus?: number;
    relocationBonus?: number;
    performanceBonus?: { type: string; amount: number; frequency: string };
    stockOptions?: { shares: number; vestingSchedule: string; strikePrice?: number };
    commission?: { type: string; percentage?: number; cap?: number };
  };
  benefits: string[];
  workLocation: {
    type: 'onsite' | 'remote' | 'hybrid';
    address?: string;
    remotePolicy?: string;
  };
  probationPeriod?: {
    duration: number;
    unit: 'days' | 'months';
  };
  additionalTerms?: string;
  expiresAt: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
  approvalWorkflow: {
    level: number;
    approverId: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    actionDate?: Date;
    comments?: string;
  }[];
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  declineReason?: string;
  negotiation?: {
    round: number;
    requestedChanges: string;
    counterOffer?: object;
    respondedAt: Date;
  }[];
  signedDocument?: {
    url: string;
    signedAt: Date;
    ipAddress?: string;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const offerLetterSchema = new Schema<IOfferLetter>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    offerNumber: { type: String, required: true },
    applicationId: { type: Schema.Types.ObjectId, required: true, ref: 'Application' },
    candidateId: { type: Schema.Types.ObjectId, required: true, ref: 'Candidate' },
    jobPostingId: { type: Schema.Types.ObjectId, required: true, ref: 'JobPosting' },
    positionTitle: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Department' },
    reportingTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'internship'], default: 'full_time' },
    startDate: { type: Date, required: true },
    compensation: {
      baseSalary: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
      payFrequency: { type: String, enum: ['hourly', 'weekly', 'biweekly', 'monthly', 'annual'], default: 'annual' },
      signingBonus: Number,
      relocationBonus: Number,
      performanceBonus: { type: String, amount: Number, frequency: String },
      stockOptions: { shares: Number, vestingSchedule: String, strikePrice: Number },
      commission: { type: String, percentage: Number, cap: Number },
    },
    benefits: [String],
    workLocation: {
      type: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite' },
      address: String,
      remotePolicy: String,
    },
    probationPeriod: {
      duration: Number,
      unit: { type: String, enum: ['days', 'months'] },
    },
    additionalTerms: String,
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'],
      default: 'draft',
    },
    approvalWorkflow: [{
      level: Number,
      approverId: Schema.Types.ObjectId,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      actionDate: Date,
      comments: String,
    }],
    sentAt: Date,
    viewedAt: Date,
    respondedAt: Date,
    declineReason: String,
    negotiation: [{
      round: Number,
      requestedChanges: String,
      counterOffer: Schema.Types.Mixed,
      respondedAt: Date,
    }],
    signedDocument: {
      url: String,
      signedAt: Date,
      ipAddress: String,
    },
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

offerLetterSchema.index({ tenantId: 1, offerNumber: 1 }, { unique: true });
offerLetterSchema.index({ tenantId: 1, applicationId: 1 });
offerLetterSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IOfferLetter>('OfferLetter', offerLetterSchema);
