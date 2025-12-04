import mongoose, { Schema, Document } from 'mongoose';

export interface IBonusEligibility {
  employeeId: string;
  employeeName?: string;
  eligible: boolean;
  eligibilityReason?: string;
  baseAmount: number;
  multiplier: number;
  calculatedAmount: number;
  adjustments: Array<{
    type: string;
    reason: string;
    amount: number;
  }>;
  finalAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'excluded';
  paidInPayrollId?: string;
}

export interface IBonus extends Document {
  tenantId: string;
  bonusCode: string;
  bonusType: 'performance' | 'festival' | 'annual' | 'retention' | 'referral' | 'spot' | 'signing' | 'project' | 'other';
  name: string;
  description?: string;
  financialYear: string;
  applicablePeriod: {
    startDate: Date;
    endDate: Date;
  };
  payoutDate: Date;
  calculationType: 'fixed' | 'percentage_of_basic' | 'percentage_of_gross' | 'percentage_of_ctc' | 'days_of_salary' | 'custom';
  calculationValue: number;
  eligibilityCriteria: {
    minServiceMonths?: number;
    departments?: string[];
    designations?: string[];
    employmentTypes?: string[];
    performanceRatingMin?: number;
    customCriteria?: string;
  };
  prorationRules: {
    enabled: boolean;
    prorationBasis: 'days' | 'months';
    minDaysForEligibility: number;
  };
  taxable: boolean;
  taxTreatment: 'fully_taxable' | 'exempt_upto_limit' | 'exempt';
  exemptionLimit?: number;
  status: 'draft' | 'calculating' | 'calculated' | 'pending_approval' | 'approved' | 'processing' | 'paid' | 'cancelled';
  employees: IBonusEligibility[];
  summary: {
    totalEligibleEmployees: number;
    totalExcludedEmployees: number;
    totalBonusAmount: number;
    averageBonusAmount: number;
    minBonusAmount: number;
    maxBonusAmount: number;
  };
  approvalWorkflow: Array<{
    level: number;
    approverRole: string;
    approverId?: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    actionDate?: Date;
  }>;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  payrollBatchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BonusEligibilitySchema = new Schema({
  employeeId: { type: String, required: true },
  employeeName: String,
  eligible: { type: Boolean, default: true },
  eligibilityReason: String,
  baseAmount: { type: Number, default: 0 },
  multiplier: { type: Number, default: 1 },
  calculatedAmount: { type: Number, default: 0 },
  adjustments: [{
    type: String,
    reason: String,
    amount: Number
  }],
  finalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'excluded'],
    default: 'pending'
  },
  paidInPayrollId: String
}, { _id: false });

const BonusSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  bonusCode: { type: String, required: true },
  bonusType: {
    type: String,
    enum: ['performance', 'festival', 'annual', 'retention', 'referral', 'spot', 'signing', 'project', 'other'],
    required: true
  },
  name: { type: String, required: true },
  description: String,
  financialYear: { type: String, required: true },
  applicablePeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  payoutDate: { type: Date, required: true },
  calculationType: {
    type: String,
    enum: ['fixed', 'percentage_of_basic', 'percentage_of_gross', 'percentage_of_ctc', 'days_of_salary', 'custom'],
    required: true
  },
  calculationValue: { type: Number, required: true },
  eligibilityCriteria: {
    minServiceMonths: Number,
    departments: [String],
    designations: [String],
    employmentTypes: [String],
    performanceRatingMin: Number,
    customCriteria: String
  },
  prorationRules: {
    enabled: { type: Boolean, default: false },
    prorationBasis: {
      type: String,
      enum: ['days', 'months'],
      default: 'months'
    },
    minDaysForEligibility: { type: Number, default: 0 }
  },
  taxable: { type: Boolean, default: true },
  taxTreatment: {
    type: String,
    enum: ['fully_taxable', 'exempt_upto_limit', 'exempt'],
    default: 'fully_taxable'
  },
  exemptionLimit: Number,
  status: {
    type: String,
    enum: ['draft', 'calculating', 'calculated', 'pending_approval', 'approved', 'processing', 'paid', 'cancelled'],
    default: 'draft'
  },
  employees: [BonusEligibilitySchema],
  summary: {
    totalEligibleEmployees: { type: Number, default: 0 },
    totalExcludedEmployees: { type: Number, default: 0 },
    totalBonusAmount: { type: Number, default: 0 },
    averageBonusAmount: { type: Number, default: 0 },
    minBonusAmount: { type: Number, default: 0 },
    maxBonusAmount: { type: Number, default: 0 }
  },
  approvalWorkflow: [{
    level: Number,
    approverRole: String,
    approverId: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date
  }],
  createdBy: { type: String, required: true },
  approvedBy: String,
  approvedAt: Date,
  paidAt: Date,
  payrollBatchId: String
}, { timestamps: true });

BonusSchema.index({ tenantId: 1, bonusCode: 1 }, { unique: true });
BonusSchema.index({ tenantId: 1, financialYear: 1, bonusType: 1 });
BonusSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IBonus>('Bonus', BonusSchema);
