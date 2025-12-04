import mongoose, { Document, Schema } from 'mongoose';

export interface ICandidate extends Document {
  tenantId: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  linkedInUrl?: string;
  portfolioUrl?: string;
  source: 'job_board' | 'referral' | 'career_site' | 'linkedin' | 'agency' | 'social_media' | 'other';
  sourceDetails?: string;
  referredBy?: mongoose.Types.ObjectId;
  resume?: {
    url: string;
    fileName: string;
    uploadedAt: Date;
    parsedData?: {
      skills?: string[];
      experience?: { company: string; title: string; startDate?: Date; endDate?: Date; description?: string }[];
      education?: { institution: string; degree: string; field?: string; year?: number }[];
      certifications?: string[];
      languages?: string[];
      summary?: string;
    };
  };
  currentPosition?: {
    title: string;
    company: string;
    salary?: number;
    currency?: string;
  };
  expectedSalary?: {
    min: number;
    max: number;
    currency: string;
  };
  noticePeriod?: string;
  availableFrom?: Date;
  skills: string[];
  yearsOfExperience?: number;
  tags?: string[];
  rating?: number;
  notes?: { by: mongoose.Types.ObjectId; text: string; at: Date }[];
  doNotContact: boolean;
  gdprConsent: {
    given: boolean;
    date?: Date;
    expiresAt?: Date;
  };
  status: 'active' | 'inactive' | 'hired' | 'blacklisted';
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: String,
    location: {
      city: String,
      state: String,
      country: String,
    },
    linkedInUrl: String,
    portfolioUrl: String,
    source: {
      type: String,
      enum: ['job_board', 'referral', 'career_site', 'linkedin', 'agency', 'social_media', 'other'],
      default: 'career_site',
    },
    sourceDetails: String,
    referredBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    resume: {
      url: String,
      fileName: String,
      uploadedAt: Date,
      parsedData: {
        skills: [String],
        experience: [{ company: String, title: String, startDate: Date, endDate: Date, description: String }],
        education: [{ institution: String, degree: String, field: String, year: Number }],
        certifications: [String],
        languages: [String],
        summary: String,
      },
    },
    currentPosition: {
      title: String,
      company: String,
      salary: Number,
      currency: String,
    },
    expectedSalary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
    },
    noticePeriod: String,
    availableFrom: Date,
    skills: [String],
    yearsOfExperience: Number,
    tags: [String],
    rating: { type: Number, min: 1, max: 5 },
    notes: [{ by: Schema.Types.ObjectId, text: String, at: { type: Date, default: Date.now } }],
    doNotContact: { type: Boolean, default: false },
    gdprConsent: {
      given: { type: Boolean, default: false },
      date: Date,
      expiresAt: Date,
    },
    status: { type: String, enum: ['active', 'inactive', 'hired', 'blacklisted'], default: 'active' },
  },
  { timestamps: true }
);

candidateSchema.index({ tenantId: 1, email: 1 }, { unique: true });
candidateSchema.index({ tenantId: 1, status: 1 });
candidateSchema.index({ tenantId: 1, skills: 1 });
candidateSchema.index({ tenantId: 1, '$**': 'text' });

export default mongoose.model<ICandidate>('Candidate', candidateSchema);
