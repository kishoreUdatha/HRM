import mongoose, { Document, Schema } from 'mongoose';

// Labour Welfare Fund Configuration Interface
export interface ILWFConfig extends Document {
  tenantId: string;
  state: string;
  stateCode: string;
  stateName: string;

  // Contribution details
  employeeContribution: number;
  employerContribution: number;
  contributionType: 'fixed' | 'percentage';
  contributionBasis?: 'basic' | 'gross' | 'fixed';

  // Frequency
  frequency: 'monthly' | 'half-yearly' | 'yearly';
  deductionMonths: number[];  // e.g., [6, 12] for June and December

  // Applicability criteria
  applicabilityCriteria: {
    minEmployeeCount?: number;
    minSalary?: number;
    maxSalary?: number;
    establishmentTypes?: string[];
  };

  // Registration details
  registrationRequired: boolean;
  registrationNumber?: string;

  // State-specific rules
  gracePeriodDays: number;
  penaltyRate?: number;

  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LWFConfigSchema = new Schema<ILWFConfig>({
  tenantId: { type: String, required: true, index: true },
  state: { type: String, required: true },
  stateCode: { type: String, required: true, uppercase: true },
  stateName: { type: String, required: true },

  employeeContribution: { type: Number, required: true },
  employerContribution: { type: Number, required: true },
  contributionType: {
    type: String,
    enum: ['fixed', 'percentage'],
    required: true,
    default: 'fixed'
  },
  contributionBasis: {
    type: String,
    enum: ['basic', 'gross', 'fixed'],
    default: 'fixed'
  },

  frequency: {
    type: String,
    enum: ['monthly', 'half-yearly', 'yearly'],
    required: true,
    default: 'half-yearly'
  },
  deductionMonths: { type: [Number], default: [6, 12] },

  applicabilityCriteria: {
    minEmployeeCount: { type: Number },
    minSalary: { type: Number },
    maxSalary: { type: Number },
    establishmentTypes: { type: [String] }
  },

  registrationRequired: { type: Boolean, default: true },
  registrationNumber: { type: String },

  gracePeriodDays: { type: Number, default: 15 },
  penaltyRate: { type: Number },

  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Compound index for efficient lookups
LWFConfigSchema.index({ tenantId: 1, stateCode: 1, isActive: 1 });

// Check if deduction is applicable for a given month
LWFConfigSchema.methods.isDeductionMonth = function(month: number): boolean {
  if (this.frequency === 'monthly') return true;
  return this.deductionMonths.includes(month);
};

// Calculate LWF contributions
LWFConfigSchema.methods.calculateContributions = function(salary: number): {
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
} {
  let employeeContribution = 0;
  let employerContribution = 0;

  if (this.contributionType === 'fixed') {
    employeeContribution = this.employeeContribution;
    employerContribution = this.employerContribution;
  } else {
    employeeContribution = Math.round(salary * (this.employeeContribution / 100));
    employerContribution = Math.round(salary * (this.employerContribution / 100));
  }

  return {
    employeeContribution,
    employerContribution,
    totalContribution: employeeContribution + employerContribution
  };
};

// Default LWF configurations for Indian states
export const DEFAULT_LWF_CONFIGS: Omit<ILWFConfig, keyof Document | 'createdAt' | 'updatedAt'>[] = [
  {
    tenantId: '',
    state: 'Maharashtra',
    stateCode: 'MH',
    stateName: 'Maharashtra',
    employeeContribution: 6,
    employerContribution: 18,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Karnataka',
    stateCode: 'KA',
    stateName: 'Karnataka',
    employeeContribution: 20,
    employerContribution: 40,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'yearly',
    deductionMonths: [12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Gujarat',
    stateCode: 'GJ',
    stateName: 'Gujarat',
    employeeContribution: 6,
    employerContribution: 12,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Madhya Pradesh',
    stateCode: 'MP',
    stateName: 'Madhya Pradesh',
    employeeContribution: 10,
    employerContribution: 30,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    employeeContribution: 5,
    employerContribution: 10,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'yearly',
    deductionMonths: [1],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'West Bengal',
    stateCode: 'WB',
    stateName: 'West Bengal',
    employeeContribution: 3,
    employerContribution: 5,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Telangana',
    stateCode: 'TG',
    stateName: 'Telangana',
    employeeContribution: 2,
    employerContribution: 5,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'yearly',
    deductionMonths: [1],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Andhra Pradesh',
    stateCode: 'AP',
    stateName: 'Andhra Pradesh',
    employeeContribution: 2,
    employerContribution: 5,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'yearly',
    deductionMonths: [1],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Kerala',
    stateCode: 'KL',
    stateName: 'Kerala',
    employeeContribution: 10,
    employerContribution: 20,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Odisha',
    stateCode: 'OD',
    stateName: 'Odisha',
    employeeContribution: 20,
    employerContribution: 40,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Punjab',
    stateCode: 'PB',
    stateName: 'Punjab',
    employeeContribution: 5,
    employerContribution: 20,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Haryana',
    stateCode: 'HR',
    stateName: 'Haryana',
    employeeContribution: 10,
    employerContribution: 25,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'monthly',
    deductionMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Chhattisgarh',
    stateCode: 'CG',
    stateName: 'Chhattisgarh',
    employeeContribution: 15,
    employerContribution: 30,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'half-yearly',
    deductionMonths: [6, 12],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  },
  {
    tenantId: '',
    state: 'Goa',
    stateCode: 'GA',
    stateName: 'Goa',
    employeeContribution: 60,
    employerContribution: 120,
    contributionType: 'fixed',
    contributionBasis: 'fixed',
    frequency: 'yearly',
    deductionMonths: [6],
    applicabilityCriteria: {},
    registrationRequired: true,
    gracePeriodDays: 15,
    effectiveFrom: new Date('2024-04-01'),
    isActive: true
  }
];

export default mongoose.model<ILWFConfig>('LWFConfig', LWFConfigSchema);
