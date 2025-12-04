import mongoose, { Document, Schema } from 'mongoose';

export interface ICompensationPlan extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  effectiveDate: Date;
  endDate?: Date;
  baseSalary: number;
  currency: string;
  payFrequency: 'monthly' | 'bi-weekly' | 'weekly' | 'annual';
  salaryGrade?: string;
  payBand?: {
    min: number;
    mid: number;
    max: number;
  };
  components: {
    name: string;
    code: string;
    type: 'earning' | 'deduction' | 'employer_contribution';
    calculationType: 'fixed' | 'percentage';
    value: number;
    baseComponent?: string;
    isTaxable: boolean;
    isRecurring: boolean;
  }[];
  allowances: {
    name: string;
    amount: number;
    frequency: 'monthly' | 'annual' | 'one_time';
    isTaxable: boolean;
  }[];
  bonusStructure?: {
    type: 'annual' | 'quarterly' | 'performance' | 'signing' | 'retention' | 'other';
    targetPercentage: number;
    maxPercentage?: number;
    criteria?: string;
  }[];
  stockOptions?: {
    grantDate: Date;
    numberOfShares: number;
    strikePrice: number;
    vestingSchedule: {
      date: Date;
      percentage: number;
    }[];
    expirationDate: Date;
  };
  retirementContribution?: {
    planType: '401k' | 'pension' | 'provident_fund' | 'other';
    employeeContribution: number;
    employeeContributionType: 'fixed' | 'percentage';
    employerMatch: number;
    employerMatchType: 'fixed' | 'percentage';
    maxEmployerMatch?: number;
  };
  status: 'draft' | 'active' | 'superseded' | 'terminated';
  reason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  previousPlanId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const compensationPlanSchema = new Schema<ICompensationPlan>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    baseSalary: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    payFrequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly', 'annual'],
      default: 'monthly',
    },
    salaryGrade: String,
    payBand: {
      min: Number,
      mid: Number,
      max: Number,
    },
    components: [{
      name: { type: String, required: true },
      code: { type: String, required: true },
      type: {
        type: String,
        enum: ['earning', 'deduction', 'employer_contribution'],
        required: true,
      },
      calculationType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
      },
      value: { type: Number, required: true },
      baseComponent: String,
      isTaxable: { type: Boolean, default: true },
      isRecurring: { type: Boolean, default: true },
    }],
    allowances: [{
      name: String,
      amount: Number,
      frequency: {
        type: String,
        enum: ['monthly', 'annual', 'one_time'],
        default: 'monthly',
      },
      isTaxable: { type: Boolean, default: true },
    }],
    bonusStructure: [{
      type: {
        type: String,
        enum: ['annual', 'quarterly', 'performance', 'signing', 'retention', 'other'],
      },
      targetPercentage: Number,
      maxPercentage: Number,
      criteria: String,
    }],
    stockOptions: {
      grantDate: Date,
      numberOfShares: Number,
      strikePrice: Number,
      vestingSchedule: [{
        date: Date,
        percentage: Number,
      }],
      expirationDate: Date,
    },
    retirementContribution: {
      planType: {
        type: String,
        enum: ['401k', 'pension', 'provident_fund', 'other'],
      },
      employeeContribution: Number,
      employeeContributionType: {
        type: String,
        enum: ['fixed', 'percentage'],
      },
      employerMatch: Number,
      employerMatchType: {
        type: String,
        enum: ['fixed', 'percentage'],
      },
      maxEmployerMatch: Number,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'superseded', 'terminated'],
      default: 'draft',
    },
    reason: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    previousPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'CompensationPlan',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

compensationPlanSchema.index({ tenantId: 1, employeeId: 1, effectiveDate: -1 });
compensationPlanSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<ICompensationPlan>('CompensationPlan', compensationPlanSchema);
