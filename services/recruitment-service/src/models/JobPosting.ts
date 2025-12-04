import mongoose, { Document, Schema } from 'mongoose';

export interface IJobPosting extends Document {
  tenantId: mongoose.Types.ObjectId;
  requisitionNumber: string;
  title: string;
  departmentId: mongoose.Types.ObjectId;
  positionId?: mongoose.Types.ObjectId;
  location: {
    type: 'onsite' | 'remote' | 'hybrid';
    city?: string;
    state?: string;
    country?: string;
  };
  employmentType: 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  description: string;
  responsibilities: string[];
  requirements: {
    education?: string[];
    experience?: string;
    skills: string[];
    certifications?: string[];
  };
  preferredQualifications?: string[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    isVisible: boolean;
  };
  benefits?: string[];
  openings: number;
  filled: number;
  status: 'draft' | 'pending_approval' | 'open' | 'on_hold' | 'closed' | 'cancelled';
  publishedChannels: {
    channel: string;
    publishedAt: Date;
    url?: string;
  }[];
  applicationDeadline?: Date;
  hiringManager: mongoose.Types.ObjectId;
  recruiters?: mongoose.Types.ObjectId[];
  pipeline: {
    stage: string;
    order: number;
    isRequired: boolean;
  }[];
  scorecardTemplate?: {
    criteria: string;
    weight: number;
    description?: string;
  }[];
  autoScreening?: {
    enabled: boolean;
    questions: { question: string; type: 'text' | 'yes_no' | 'multiple_choice'; options?: string[]; isKnockout?: boolean; expectedAnswer?: string }[];
  };
  applicationCount: number;
  viewCount: number;
  approvalWorkflow?: {
    approverId: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    actionDate?: Date;
    comments?: string;
  }[];
  createdBy: mongoose.Types.ObjectId;
  publishedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobPostingSchema = new Schema<IJobPosting>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    requisitionNumber: { type: String, required: true },
    title: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Department' },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position' },
    location: {
      type: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite' },
      city: String,
      state: String,
      country: String,
    },
    employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'internship', 'temporary'], default: 'full_time' },
    experienceLevel: { type: String, enum: ['entry', 'mid', 'senior', 'lead', 'executive'], default: 'mid' },
    description: { type: String, required: true },
    responsibilities: [String],
    requirements: {
      education: [String],
      experience: String,
      skills: [String],
      certifications: [String],
    },
    preferredQualifications: [String],
    salaryRange: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
      isVisible: { type: Boolean, default: false },
    },
    benefits: [String],
    openings: { type: Number, default: 1 },
    filled: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'pending_approval', 'open', 'on_hold', 'closed', 'cancelled'], default: 'draft' },
    publishedChannels: [{ channel: String, publishedAt: Date, url: String }],
    applicationDeadline: Date,
    hiringManager: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    recruiters: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    pipeline: [{
      stage: String,
      order: Number,
      isRequired: { type: Boolean, default: true },
    }],
    scorecardTemplate: [{
      criteria: String,
      weight: Number,
      description: String,
    }],
    autoScreening: {
      enabled: { type: Boolean, default: false },
      questions: [{
        question: String,
        type: { type: String, enum: ['text', 'yes_no', 'multiple_choice'] },
        options: [String],
        isKnockout: Boolean,
        expectedAnswer: String,
      }],
    },
    applicationCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    approvalWorkflow: [{
      approverId: Schema.Types.ObjectId,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      actionDate: Date,
      comments: String,
    }],
    createdBy: Schema.Types.ObjectId,
    publishedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

jobPostingSchema.index({ tenantId: 1, requisitionNumber: 1 }, { unique: true });
jobPostingSchema.index({ tenantId: 1, status: 1 });
jobPostingSchema.index({ tenantId: 1, departmentId: 1 });
jobPostingSchema.index({ tenantId: 1, hiringManager: 1 });

export default mongoose.model<IJobPosting>('JobPosting', jobPostingSchema);
