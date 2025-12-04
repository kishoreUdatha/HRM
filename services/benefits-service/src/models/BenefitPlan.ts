import mongoose, { Document, Schema } from 'mongoose';

export interface IBenefitPlan extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description: string;
  category: 'health' | 'dental' | 'vision' | 'life' | 'disability' | 'retirement' | 'wellness' | 'other';
  type: 'insurance' | 'retirement' | 'allowance' | 'reimbursement' | 'discount' | 'other';
  provider?: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  coverage: {
    name: string;
    description: string;
    coverageAmount?: number;
    copay?: number;
    deductible?: number;
    outOfPocketMax?: number;
  }[];
  tiers: {
    name: string; // e.g., 'Employee Only', 'Employee + Spouse', 'Family'
    employeeCost: number;
    employerCost: number;
    frequency: 'monthly' | 'bi-weekly' | 'weekly' | 'annual';
  }[];
  eligibility: {
    employmentTypes: ('full_time' | 'part_time' | 'contract')[];
    minTenureDays: number;
    departments?: mongoose.Types.ObjectId[];
    designations?: string[];
  };
  enrollmentPeriod: {
    type: 'open' | 'qualifying_event' | 'anytime';
    openEnrollmentStart?: Date;
    openEnrollmentEnd?: Date;
  };
  effectiveDate: Date;
  terminationDate?: Date;
  waitingPeriodDays: number;
  documents?: {
    name: string;
    url: string;
    type: 'policy' | 'summary' | 'form' | 'other';
  }[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const benefitPlanSchema = new Schema<IBenefitPlan>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
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
    description: String,
    category: {
      type: String,
      enum: ['health', 'dental', 'vision', 'life', 'disability', 'retirement', 'wellness', 'other'],
      required: true,
    },
    type: {
      type: String,
      enum: ['insurance', 'retirement', 'allowance', 'reimbursement', 'discount', 'other'],
      required: true,
    },
    provider: {
      name: String,
      contactPerson: String,
      email: String,
      phone: String,
      website: String,
    },
    coverage: [{
      name: String,
      description: String,
      coverageAmount: Number,
      copay: Number,
      deductible: Number,
      outOfPocketMax: Number,
    }],
    tiers: [{
      name: String,
      employeeCost: { type: Number, default: 0 },
      employerCost: { type: Number, default: 0 },
      frequency: {
        type: String,
        enum: ['monthly', 'bi-weekly', 'weekly', 'annual'],
        default: 'monthly',
      },
    }],
    eligibility: {
      employmentTypes: [{
        type: String,
        enum: ['full_time', 'part_time', 'contract'],
      }],
      minTenureDays: { type: Number, default: 0 },
      departments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
      designations: [String],
    },
    enrollmentPeriod: {
      type: {
        type: String,
        enum: ['open', 'qualifying_event', 'anytime'],
        default: 'open',
      },
      openEnrollmentStart: Date,
      openEnrollmentEnd: Date,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    terminationDate: Date,
    waitingPeriodDays: { type: Number, default: 0 },
    documents: [{
      name: String,
      url: String,
      type: {
        type: String,
        enum: ['policy', 'summary', 'form', 'other'],
      },
    }],
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

benefitPlanSchema.index({ tenantId: 1, code: 1 }, { unique: true });
benefitPlanSchema.index({ tenantId: 1, category: 1 });
benefitPlanSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IBenefitPlan>('BenefitPlan', benefitPlanSchema);
