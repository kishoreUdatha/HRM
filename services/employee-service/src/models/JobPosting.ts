import mongoose, { Document, Schema } from 'mongoose';

export interface IJobPosting extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  description: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  experience: {
    min: number;
    max: number;
  };
  salary: {
    min: number;
    max: number;
    currency: string;
    isVisible: boolean;
  };
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  location: string;
  isRemote: boolean;
  vacancies: number;
  applicationDeadline?: Date;
  status: 'draft' | 'open' | 'on_hold' | 'closed' | 'filled';
  hiringManagerId?: mongoose.Types.ObjectId;
  postedBy: mongoose.Types.ObjectId;
  postedAt?: Date;
  closedAt?: Date;
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const jobPostingSchema = new Schema<IJobPosting>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    description: {
      type: String,
      required: true,
    },
    requirements: [String],
    responsibilities: [String],
    skills: [String],
    experience: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      isVisible: { type: Boolean, default: false },
    },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern'],
      default: 'full_time',
    },
    location: String,
    isRemote: {
      type: Boolean,
      default: false,
    },
    vacancies: {
      type: Number,
      default: 1,
    },
    applicationDeadline: Date,
    status: {
      type: String,
      enum: ['draft', 'open', 'on_hold', 'closed', 'filled'],
      default: 'draft',
    },
    hiringManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    postedAt: Date,
    closedAt: Date,
    applicationsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

jobPostingSchema.index({ tenantId: 1, code: 1 }, { unique: true });
jobPostingSchema.index({ tenantId: 1, status: 1 });
jobPostingSchema.index({ tenantId: 1, departmentId: 1 });

export default mongoose.model<IJobPosting>('JobPosting', jobPostingSchema);
