import mongoose, { Document, Schema } from 'mongoose';

// Professional Tax Slab Interface
export interface IPTSlab {
  fromAmount: number;
  toAmount: number;
  taxAmount: number;
}

// Professional Tax Configuration Interface
export interface IProfessionalTaxConfig extends Document {
  tenantId: string;
  state: string;
  stateCode: string;
  stateName: string;
  slabs: IPTSlab[];
  maxAnnualLimit: number;
  frequency: 'monthly' | 'half-yearly' | 'yearly';
  februaryAdjustment: boolean;
  februaryAmount?: number;
  exemptCategories: string[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PTSlabSchema = new Schema<IPTSlab>({
  fromAmount: { type: Number, required: true },
  toAmount: { type: Number, required: true },
  taxAmount: { type: Number, required: true }
}, { _id: false });

const ProfessionalTaxConfigSchema = new Schema<IProfessionalTaxConfig>({
  tenantId: { type: String, required: true, index: true },
  state: { type: String, required: true },
  stateCode: { type: String, required: true, uppercase: true },
  stateName: { type: String, required: true },
  slabs: { type: [PTSlabSchema], required: true },
  maxAnnualLimit: { type: Number, default: 2500 },
  frequency: {
    type: String,
    enum: ['monthly', 'half-yearly', 'yearly'],
    default: 'monthly'
  },
  februaryAdjustment: { type: Boolean, default: false },
  februaryAmount: { type: Number },
  exemptCategories: { type: [String], default: [] },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Compound index for efficient lookups
ProfessionalTaxConfigSchema.index({ tenantId: 1, stateCode: 1, isActive: 1 });
ProfessionalTaxConfigSchema.index({ tenantId: 1, stateCode: 1, effectiveFrom: -1 });

// Calculate PT based on salary
ProfessionalTaxConfigSchema.methods.calculateTax = function(grossSalary: number, month?: number): number {
  // Apply February adjustment if applicable
  if (this.februaryAdjustment && month === 2 && this.februaryAmount) {
    return this.februaryAmount;
  }

  // Find applicable slab
  for (const slab of this.slabs) {
    if (grossSalary >= slab.fromAmount && grossSalary <= slab.toAmount) {
      return slab.taxAmount;
    }
  }

  // If salary exceeds all slabs, return the highest slab amount
  if (this.slabs.length > 0 && grossSalary > this.slabs[this.slabs.length - 1].toAmount) {
    return this.slabs[this.slabs.length - 1].taxAmount;
  }

  return 0;
};

/**
 * Default Professional Tax Configurations for Indian States
 * Updated for FY 2025-26 (effective from April 1, 2025)
 *
 * Key Updates:
 * - Karnataka: Revised threshold to ₹24,999, ₹200/month (₹300 in Feb)
 * - Maharashtra: Women earning ≤₹25,000 exempt
 * - Tamil Nadu: Half-yearly deduction in Aug & Jan
 * - Max PT: ₹2,500 per annum (as per Article 276)
 *
 * States with NO Professional Tax:
 * - Rajasthan, Haryana, Uttar Pradesh, Uttarakhand, Delhi NCT,
 *   Himachal Pradesh, Jammu & Kashmir, Ladakh, Goa, Nagaland,
 *   Arunachal Pradesh, Manipur, Mizoram
 */
export const DEFAULT_PT_CONFIGS: Omit<IProfessionalTaxConfig, keyof Document | 'createdAt' | 'updatedAt'>[] = [
  // ===================== MAHARASHTRA =====================
  // Updated FY 2025-26: Women earning ≤₹25,000 exempt
  {
    tenantId: '',
    state: 'Maharashtra',
    stateCode: 'MH',
    stateName: 'Maharashtra',
    slabs: [
      { fromAmount: 0, toAmount: 7500, taxAmount: 0 },
      { fromAmount: 7501, toAmount: 10000, taxAmount: 175 },
      { fromAmount: 10001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: true,
    februaryAmount: 300,  // ₹300 in Feb/March to reach ₹2,500 annual limit
    exemptCategories: ['disabled', 'parental_leave', 'women_below_25000'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== KARNATAKA =====================
  // Revised effective April 1, 2025
  {
    tenantId: '',
    state: 'Karnataka',
    stateCode: 'KA',
    stateName: 'Karnataka',
    slabs: [
      { fromAmount: 0, toAmount: 24999, taxAmount: 0 },
      { fromAmount: 25000, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: true,
    februaryAmount: 300,  // ₹300 in February
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },
  // ===================== TELANGANA =====================
  {
    tenantId: '',
    state: 'Telangana',
    stateCode: 'TG',
    stateName: 'Telangana',
    slabs: [
      { fromAmount: 0, toAmount: 15000, taxAmount: 0 },
      { fromAmount: 15001, toAmount: 20000, taxAmount: 150 },
      { fromAmount: 20001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== TAMIL NADU =====================
  // Half-yearly deduction (August & January)
  {
    tenantId: '',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    slabs: [
      { fromAmount: 0, toAmount: 21000, taxAmount: 0 },
      { fromAmount: 21001, toAmount: 30000, taxAmount: 135 },
      { fromAmount: 30001, toAmount: 45000, taxAmount: 315 },
      { fromAmount: 45001, toAmount: 60000, taxAmount: 690 },
      { fromAmount: 60001, toAmount: 75000, taxAmount: 1025 },
      { fromAmount: 75001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 1095 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'half-yearly',  // Deducted in Aug & Jan only
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus', 'parents_of_disabled'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== WEST BENGAL =====================
  {
    tenantId: '',
    state: 'West Bengal',
    stateCode: 'WB',
    stateName: 'West Bengal',
    slabs: [
      { fromAmount: 0, toAmount: 10000, taxAmount: 0 },
      { fromAmount: 10001, toAmount: 15000, taxAmount: 110 },
      { fromAmount: 15001, toAmount: 25000, taxAmount: 130 },
      { fromAmount: 25001, toAmount: 40000, taxAmount: 150 },
      { fromAmount: 40001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== GUJARAT =====================
  {
    tenantId: '',
    state: 'Gujarat',
    stateCode: 'GJ',
    stateName: 'Gujarat',
    slabs: [
      { fromAmount: 0, toAmount: 5999, taxAmount: 0 },
      { fromAmount: 6000, toAmount: 8999, taxAmount: 80 },
      { fromAmount: 9000, toAmount: 11999, taxAmount: 150 },
      { fromAmount: 12000, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== ANDHRA PRADESH =====================
  {
    tenantId: '',
    state: 'Andhra Pradesh',
    stateCode: 'AP',
    stateName: 'Andhra Pradesh',
    slabs: [
      { fromAmount: 0, toAmount: 15000, taxAmount: 0 },
      { fromAmount: 15001, toAmount: 20000, taxAmount: 150 },
      { fromAmount: 20001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== KERALA =====================
  // Half-yearly deduction
  {
    tenantId: '',
    state: 'Kerala',
    stateCode: 'KL',
    stateName: 'Kerala',
    slabs: [
      { fromAmount: 0, toAmount: 11999, taxAmount: 0 },
      { fromAmount: 12000, toAmount: 17999, taxAmount: 120 },
      { fromAmount: 18000, toAmount: 29999, taxAmount: 180 },
      { fromAmount: 30000, toAmount: 44999, taxAmount: 300 },
      { fromAmount: 45000, toAmount: 59999, taxAmount: 450 },
      { fromAmount: 60000, toAmount: 74999, taxAmount: 600 },
      { fromAmount: 75000, toAmount: 99999, taxAmount: 750 },
      { fromAmount: 100000, toAmount: 124999, taxAmount: 1000 },
      { fromAmount: 125000, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 1250 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'half-yearly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== MADHYA PRADESH =====================
  // Annual calculation split monthly (₹208 for 11 months, ₹212 in last month)
  {
    tenantId: '',
    state: 'Madhya Pradesh',
    stateCode: 'MP',
    stateName: 'Madhya Pradesh',
    slabs: [
      { fromAmount: 0, toAmount: 18750, taxAmount: 0 },          // ₹2,25,000 annual
      { fromAmount: 18751, toAmount: 25000, taxAmount: 125 },    // ₹1,500 annual
      { fromAmount: 25001, toAmount: 33333, taxAmount: 166 },    // ₹2,000 annual
      { fromAmount: 33334, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 208 }  // ₹2,500 annual
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: true,
    februaryAmount: 212,  // ₹212 in last month to reach annual limit
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },
  // ===================== ODISHA =====================
  {
    tenantId: '',
    state: 'Odisha',
    stateCode: 'OD',
    stateName: 'Odisha',
    slabs: [
      { fromAmount: 0, toAmount: 13304, taxAmount: 0 },
      { fromAmount: 13305, toAmount: 25000, taxAmount: 125 },
      { fromAmount: 25001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== ASSAM =====================
  {
    tenantId: '',
    state: 'Assam',
    stateCode: 'AS',
    stateName: 'Assam',
    slabs: [
      { fromAmount: 0, toAmount: 10000, taxAmount: 0 },
      { fromAmount: 10001, toAmount: 15000, taxAmount: 150 },
      { fromAmount: 15001, toAmount: 25000, taxAmount: 180 },
      { fromAmount: 25001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 208 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== BIHAR =====================
  {
    tenantId: '',
    state: 'Bihar',
    stateCode: 'BR',
    stateName: 'Bihar',
    slabs: [
      { fromAmount: 0, toAmount: 25000, taxAmount: 0 },          // ₹3L annual
      { fromAmount: 25001, toAmount: 41666, taxAmount: 100 },    // ₹3-5L annual
      { fromAmount: 41667, toAmount: 83333, taxAmount: 150 },    // ₹5-10L annual
      { fromAmount: 83334, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== JHARKHAND =====================
  {
    tenantId: '',
    state: 'Jharkhand',
    stateCode: 'JH',
    stateName: 'Jharkhand',
    slabs: [
      { fromAmount: 0, toAmount: 25000, taxAmount: 0 },
      { fromAmount: 25001, toAmount: 41666, taxAmount: 100 },
      { fromAmount: 41667, toAmount: 66666, taxAmount: 150 },
      { fromAmount: 66667, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== MEGHALAYA =====================
  {
    tenantId: '',
    state: 'Meghalaya',
    stateCode: 'ML',
    stateName: 'Meghalaya',
    slabs: [
      { fromAmount: 0, toAmount: 4166, taxAmount: 0 },
      { fromAmount: 4167, toAmount: 6250, taxAmount: 20 },
      { fromAmount: 6251, toAmount: 8333, taxAmount: 50 },
      { fromAmount: 8334, toAmount: 12500, taxAmount: 100 },
      { fromAmount: 12501, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== TRIPURA =====================
  {
    tenantId: '',
    state: 'Tripura',
    stateCode: 'TR',
    stateName: 'Tripura',
    slabs: [
      { fromAmount: 0, toAmount: 7500, taxAmount: 0 },
      { fromAmount: 7501, toAmount: 15000, taxAmount: 150 },
      { fromAmount: 15001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 180 }
    ],
    maxAnnualLimit: 2160,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== SIKKIM =====================
  // Annual slabs
  {
    tenantId: '',
    state: 'Sikkim',
    stateCode: 'SK',
    stateName: 'Sikkim',
    slabs: [
      { fromAmount: 0, toAmount: 20000, taxAmount: 0 },
      { fromAmount: 20001, toAmount: 30000, taxAmount: 125 },
      { fromAmount: 30001, toAmount: 40000, taxAmount: 150 },
      { fromAmount: 40001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  },

  // ===================== CHHATTISGARH =====================
  {
    tenantId: '',
    state: 'Chhattisgarh',
    stateCode: 'CG',
    stateName: 'Chhattisgarh',
    slabs: [
      { fromAmount: 0, toAmount: 13000, taxAmount: 0 },
      { fromAmount: 13001, toAmount: 20000, taxAmount: 150 },
      { fromAmount: 20001, toAmount: Number.MAX_SAFE_INTEGER, taxAmount: 200 }
    ],
    maxAnnualLimit: 2500,
    frequency: 'monthly',
    februaryAdjustment: false,
    exemptCategories: ['senior_citizen_65plus'],
    effectiveFrom: new Date('2025-04-01'),
    isActive: true
  }
];

export default mongoose.model<IProfessionalTaxConfig>('ProfessionalTaxConfig', ProfessionalTaxConfigSchema);
