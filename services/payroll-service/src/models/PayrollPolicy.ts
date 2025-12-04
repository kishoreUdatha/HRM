import mongoose, { Schema, Document } from 'mongoose';

export interface ICondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ISalaryComponentRule {
  componentCode: string;
  componentName: string;
  componentType: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage_of_basic' | 'percentage_of_gross' | 'percentage_of_ctc' | 'formula';
  calculationValue?: number;
  formula?: string;
  conditions?: ICondition[];
  minAmount?: number;
  maxAmount?: number;
  taxable: boolean;
  partOfCTC: boolean;
  partOfGross: boolean;
  applicableFrom?: Date;
  applicableTo?: Date;
  isActive: boolean;
}

export interface IPayrollPolicy extends Document {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  applicableTo: {
    allEmployees: boolean;
    departments?: string[];
    designations?: string[];
    employmentTypes?: string[];
    locations?: string[];
    grades?: string[];
  };
  salaryComponents: ISalaryComponentRule[];
  deductionRules: {
    pfApplicable: boolean;
    pfCalculationBasis: 'basic' | 'basic_da';
    pfEmployeePercentage: number;
    pfEmployerPercentage: number;
    pfMaxLimit?: number;
    esiApplicable: boolean;
    esiGrossCeiling: number;
    esiEmployeePercentage: number;
    esiEmployerPercentage: number;
    ptApplicable: boolean;
    lwfApplicable: boolean;
    tdsApplicable: boolean;
  };
  paymentRules: {
    paymentCycle: 'monthly' | 'weekly' | 'bi_weekly' | 'semi_monthly';
    paymentDay: number;
    cutoffDay: number;
    lopCalculation: 'calendar_days' | 'working_days' | 'fixed_30_days';
  };
  roundingRules: {
    enabled: boolean;
    roundingType: 'nearest' | 'up' | 'down';
    roundingPrecision: number;
  };
  arrearRules: {
    autoCalculate: boolean;
    maxBackdatedMonths: number;
    requireApproval: boolean;
  };
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayrollPolicyAssignment extends Document {
  tenantId: string;
  employeeId: string;
  policyId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  assignedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConditionSchema = new Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'in', 'not_in', 'contains', 'starts_with', 'ends_with'],
    required: true
  },
  value: Schema.Types.Mixed,
  logicalOperator: {
    type: String,
    enum: ['AND', 'OR']
  }
}, { _id: false });

const SalaryComponentRuleSchema = new Schema({
  componentCode: { type: String, required: true },
  componentName: { type: String, required: true },
  componentType: {
    type: String,
    enum: ['earning', 'deduction'],
    required: true
  },
  calculationType: {
    type: String,
    enum: ['fixed', 'percentage_of_basic', 'percentage_of_gross', 'percentage_of_ctc', 'formula'],
    required: true
  },
  calculationValue: Number,
  formula: String,
  conditions: [ConditionSchema],
  minAmount: Number,
  maxAmount: Number,
  taxable: { type: Boolean, default: true },
  partOfCTC: { type: Boolean, default: true },
  partOfGross: { type: Boolean, default: true },
  applicableFrom: Date,
  applicableTo: Date,
  isActive: { type: Boolean, default: true }
}, { _id: false });

const PayrollPolicySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  applicableTo: {
    allEmployees: { type: Boolean, default: false },
    departments: [String],
    designations: [String],
    employmentTypes: [String],
    locations: [String],
    grades: [String]
  },
  salaryComponents: [SalaryComponentRuleSchema],
  deductionRules: {
    pfApplicable: { type: Boolean, default: true },
    pfCalculationBasis: {
      type: String,
      enum: ['basic', 'basic_da'],
      default: 'basic'
    },
    pfEmployeePercentage: { type: Number, default: 12 },
    pfEmployerPercentage: { type: Number, default: 12 },
    pfMaxLimit: { type: Number, default: 15000 },
    esiApplicable: { type: Boolean, default: true },
    esiGrossCeiling: { type: Number, default: 21000 },
    esiEmployeePercentage: { type: Number, default: 0.75 },
    esiEmployerPercentage: { type: Number, default: 3.25 },
    ptApplicable: { type: Boolean, default: true },
    lwfApplicable: { type: Boolean, default: true },
    tdsApplicable: { type: Boolean, default: true }
  },
  paymentRules: {
    paymentCycle: {
      type: String,
      enum: ['monthly', 'weekly', 'bi_weekly', 'semi_monthly'],
      default: 'monthly'
    },
    paymentDay: { type: Number, default: 1 },
    cutoffDay: { type: Number, default: 25 },
    lopCalculation: {
      type: String,
      enum: ['calendar_days', 'working_days', 'fixed_30_days'],
      default: 'calendar_days'
    }
  },
  roundingRules: {
    enabled: { type: Boolean, default: true },
    roundingType: {
      type: String,
      enum: ['nearest', 'up', 'down'],
      default: 'nearest'
    },
    roundingPrecision: { type: Number, default: 0 }
  },
  arrearRules: {
    autoCalculate: { type: Boolean, default: true },
    maxBackdatedMonths: { type: Number, default: 3 },
    requireApproval: { type: Boolean, default: true }
  },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  createdBy: { type: String, required: true }
}, { timestamps: true });

PayrollPolicySchema.index({ tenantId: 1, code: 1 }, { unique: true });
PayrollPolicySchema.index({ tenantId: 1, isActive: 1, isDefault: 1 });

const PayrollPolicyAssignmentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  policyId: { type: String, required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  isActive: { type: Boolean, default: true },
  assignedBy: { type: String, required: true }
}, { timestamps: true });

PayrollPolicyAssignmentSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 });

export const PayrollPolicy = mongoose.model<IPayrollPolicy>('PayrollPolicy', PayrollPolicySchema);
export const PayrollPolicyAssignment = mongoose.model<IPayrollPolicyAssignment>('PayrollPolicyAssignment', PayrollPolicyAssignmentSchema);
