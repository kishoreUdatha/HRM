import mongoose, { Document, Schema } from 'mongoose';

export interface ITaxSlab {
  minIncome: number;
  maxIncome: number;
  rate: number;
  fixedAmount: number;
}

export interface IStatutoryDeduction {
  code: string;
  name: string;
  type: 'percentage' | 'fixed' | 'slab';
  employeeContribution: number;
  employerContribution: number;
  maxLimit?: number;
  minLimit?: number;
  applicableOn: 'basic' | 'gross' | 'ctc';
  isOptional: boolean;
  slabs?: { minSalary: number; maxSalary: number; rate: number }[];
}

export interface ITaxConfiguration extends Document {
  tenantId: string;
  country: string;
  countryCode: string;
  financialYearStart: { month: number; day: number };
  financialYearEnd: { month: number; day: number };
  currency: { code: string; symbol: string; name: string };
  taxSlabs: ITaxSlab[];
  standardDeduction: number;
  taxExemptions: { code: string; name: string; maxAmount: number; section: string }[];
  statutoryDeductions: IStatutoryDeduction[];
  surcharge: { slabs: { minIncome: number; maxIncome: number; rate: number }[] };
  cess: { rate: number; name: string };
  tdsRates: { type: string; rate: number; threshold: number }[];
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaxConfigurationSchema = new Schema<ITaxConfiguration>({
  tenantId: { type: String, required: true, index: true },
  country: { type: String, required: true },
  countryCode: { type: String, required: true },
  financialYearStart: { month: { type: Number, required: true }, day: { type: Number, required: true } },
  financialYearEnd: { month: { type: Number, required: true }, day: { type: Number, required: true } },
  currency: { code: { type: String, required: true }, symbol: { type: String, required: true }, name: { type: String, required: true } },
  taxSlabs: [{ minIncome: Number, maxIncome: Number, rate: Number, fixedAmount: Number }],
  standardDeduction: { type: Number, default: 0 },
  taxExemptions: [{ code: String, name: String, maxAmount: Number, section: String }],
  statutoryDeductions: [{
    code: String, name: String, type: { type: String, enum: ['percentage', 'fixed', 'slab'] },
    employeeContribution: Number, employerContribution: Number, maxLimit: Number, minLimit: Number,
    applicableOn: { type: String, enum: ['basic', 'gross', 'ctc'] }, isOptional: Boolean,
    slabs: [{ minSalary: Number, maxSalary: Number, rate: Number }]
  }],
  surcharge: { slabs: [{ minIncome: Number, maxIncome: Number, rate: Number }] },
  cess: { rate: Number, name: String },
  tdsRates: [{ type: { type: String }, rate: Number, threshold: Number }],
  isActive: { type: Boolean, default: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date
}, { timestamps: true });

TaxConfigurationSchema.index({ tenantId: 1, countryCode: 1, isActive: 1 });

export default mongoose.model<ITaxConfiguration>('TaxConfiguration', TaxConfigurationSchema);
