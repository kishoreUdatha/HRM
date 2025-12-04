import mongoose, { Document, Schema } from 'mongoose';

export interface IJobApplication extends Document {
  tenantId: mongoose.Types.ObjectId;
  jobPostingId: mongoose.Types.ObjectId;
  applicantName: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  coverLetter?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentPosition?: string;
  experienceYears: number;
  expectedSalary?: number;
  noticePeriod?: number;
  source: 'website' | 'linkedin' | 'referral' | 'job_board' | 'other';
  referredBy?: mongoose.Types.ObjectId;
  skills: string[];
  education: {
    degree: string;
    institution: string;
    year: number;
  }[];
  status: 'new' | 'screening' | 'interview' | 'technical' | 'hr_round' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
  stage: number;
  rating?: number;
  notes?: string;
  interviews: {
    scheduledAt: Date;
    interviewerId: mongoose.Types.ObjectId;
    type: 'phone' | 'video' | 'onsite' | 'technical';
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
    feedback?: string;
    rating?: number;
  }[];
  rejectionReason?: string;
  offerDetails?: {
    salary: number;
    joiningDate: Date;
    position: string;
    offerLetterUrl?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  };
  convertedEmployeeId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    jobPostingId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'JobPosting',
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: String,
    resumeUrl: String,
    coverLetter: String,
    linkedinUrl: String,
    portfolioUrl: String,
    currentCompany: String,
    currentPosition: String,
    experienceYears: {
      type: Number,
      default: 0,
    },
    expectedSalary: Number,
    noticePeriod: Number,
    source: {
      type: String,
      enum: ['website', 'linkedin', 'referral', 'job_board', 'other'],
      default: 'website',
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    skills: [String],
    education: [{
      degree: String,
      institution: String,
      year: Number,
    }],
    status: {
      type: String,
      enum: ['new', 'screening', 'interview', 'technical', 'hr_round', 'offer', 'hired', 'rejected', 'withdrawn'],
      default: 'new',
    },
    stage: {
      type: Number,
      default: 1,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    notes: String,
    interviews: [{
      scheduledAt: Date,
      interviewerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
      type: { type: String, enum: ['phone', 'video', 'onsite', 'technical'] },
      status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
      feedback: String,
      rating: Number,
    }],
    rejectionReason: String,
    offerDetails: {
      salary: Number,
      joiningDate: Date,
      position: String,
      offerLetterUrl: String,
      status: { type: String, enum: ['pending', 'accepted', 'rejected', 'negotiating'] },
    },
    convertedEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
  }
);

jobApplicationSchema.index({ tenantId: 1, jobPostingId: 1 });
jobApplicationSchema.index({ tenantId: 1, email: 1 });
jobApplicationSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema);
