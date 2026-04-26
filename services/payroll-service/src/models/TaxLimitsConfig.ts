import mongoose, { Document, Schema } from 'mongoose';

// Section Limit Interface
export interface ISectionLimit {
  section: string;
  name: string;
  maxLimit: number | null;  // null for unlimited
  applicableRegimes: ('old' | 'new')[];
  subLimits?: {
    category: string;
    limit: number;
    description: string;
  }[];
  notes?: string;
}

// Rebate Configuration
export interface IRebateConfig {
  incomeLimit: number;
  maxRebate: number;
  applicableRegimes: ('old' | 'new')[];
}

// Tax Limits Configuration Interface
export interface ITaxLimitsConfig extends Document {
  tenantId: string;
  financialYear: string;
  assessmentYear: string;
  countryCode: string;

  // Rebate u/s 87A
  rebate87A: IRebateConfig;

  // Standard Deduction
  standardDeduction: {
    amount: number;
    applicableRegimes: ('old' | 'new')[];
  };

  // Section-wise limits
  sectionLimits: {
    // Section 80C - Investments
    section80C: {
      maxLimit: number;
      includesNPS80CCD1: boolean;
    };

    // Section 80CCC - Pension Fund
    section80CCC: {
      maxLimit: number;
      combinedWith80C: boolean;
    };

    // Section 80CCD - NPS
    section80CCD: {
      employee80CCD1: {
        maxLimit: number;
        percentageOfSalary: number;
        combinedWith80C: boolean;
      };
      additional80CCD1B: {
        maxLimit: number;
      };
      employer80CCD2: {
        maxLimit: number | null;
        percentageOfSalary: number;
      };
    };

    // Section 80D - Medical Insurance
    section80D: {
      selfAndFamily: {
        maxLimit: number;
        seniorCitizenLimit: number;
      };
      parents: {
        maxLimit: number;
        seniorCitizenLimit: number;
      };
      preventiveHealthCheckup: {
        maxLimit: number;
      };
      overallMaxLimit: number;
    };

    // Section 80E - Education Loan Interest (No limit)
    section80E: {
      enabled: boolean;
      hasLimit: false;
      maxYears: number;
    };

    // Section 80G - Donations
    section80G: {
      enabled: boolean;
      categories: {
        code: string;
        name: string;
        deductionPercentage: 100 | 50;
        hasLimit: boolean;
        qualifyingLimit?: number;
      }[];
      qualifyingLimitPercentage: number;
    };

    // Section 80TTA - Savings Interest (Non-seniors)
    section80TTA: {
      maxLimit: number;
      applicableTo: 'non_senior';
    };

    // Section 80TTB - Interest for Seniors
    section80TTB: {
      maxLimit: number;
      applicableTo: 'senior' | 'super_senior';
    };

    // Section 80EE - First-time Home Buyers
    section80EE: {
      maxLimit: number;
      maxLoanAmount: number;
      maxPropertyValue: number;
      loanSanctionPeriod: {
        from: Date;
        to: Date;
      };
    };

    // Section 80EEA - Affordable Housing
    section80EEA: {
      maxLimit: number;
      maxStampDutyValue: number;
      loanSanctionPeriod: {
        from: Date;
        to: Date;
      };
    };

    // Section 80EEB - Electric Vehicle Loan Interest
    section80EEB: {
      maxLimit: number;
      loanSanctionPeriod: {
        from: Date;
        to: Date;
      };
    };

    // Section 24 - Home Loan Interest
    section24: {
      selfOccupiedLimit: number;
      letOutLimit: number | null;  // null = no limit
      preConstructionInterestYears: number;
    };

    // Section 80GG - Rent Paid (when no HRA)
    section80GG: {
      maxLimit: number;
      percentageOfTotalIncome: number;
    };

    // Section 80U - Disability
    section80U: {
      normalDisability: number;
      severeDisability: number;
      disabilityPercentageThreshold: number;
    };

    // Section 80DD - Dependent with Disability
    section80DD: {
      normalDisability: number;
      severeDisability: number;
    };

    // Section 80DDB - Medical Treatment
    section80DDB: {
      maxLimit: number;
      seniorCitizenLimit: number;
    };
  };

  // Surcharge slabs
  surchargeSlabs: {
    fromIncome: number;
    toIncome: number;
    rate: number;
  }[];

  // Health & Education Cess
  cess: {
    rate: number;
    name: string;
  };

  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaxLimitsConfigSchema = new Schema<ITaxLimitsConfig>({
  tenantId: { type: String, required: true, index: true },
  financialYear: { type: String, required: true },
  assessmentYear: { type: String, required: true },
  countryCode: { type: String, required: true, default: 'IN' },

  rebate87A: {
    incomeLimit: { type: Number, required: true },
    maxRebate: { type: Number, required: true },
    applicableRegimes: { type: [String], enum: ['old', 'new'], default: ['new'] }
  },

  standardDeduction: {
    amount: { type: Number, required: true },
    applicableRegimes: { type: [String], enum: ['old', 'new'], default: ['old', 'new'] }
  },

  sectionLimits: {
    section80C: {
      maxLimit: { type: Number, default: 150000 },
      includesNPS80CCD1: { type: Boolean, default: true }
    },
    section80CCC: {
      maxLimit: { type: Number, default: 150000 },
      combinedWith80C: { type: Boolean, default: true }
    },
    section80CCD: {
      employee80CCD1: {
        maxLimit: { type: Number, default: 150000 },
        percentageOfSalary: { type: Number, default: 10 },
        combinedWith80C: { type: Boolean, default: true }
      },
      additional80CCD1B: {
        maxLimit: { type: Number, default: 50000 }
      },
      employer80CCD2: {
        maxLimit: { type: Number, default: null },
        percentageOfSalary: { type: Number, default: 10 }
      }
    },
    section80D: {
      selfAndFamily: {
        maxLimit: { type: Number, default: 25000 },
        seniorCitizenLimit: { type: Number, default: 50000 }
      },
      parents: {
        maxLimit: { type: Number, default: 25000 },
        seniorCitizenLimit: { type: Number, default: 50000 }
      },
      preventiveHealthCheckup: {
        maxLimit: { type: Number, default: 5000 }
      },
      overallMaxLimit: { type: Number, default: 100000 }
    },
    section80E: {
      enabled: { type: Boolean, default: true },
      hasLimit: { type: Boolean, default: false },
      maxYears: { type: Number, default: 8 }
    },
    section80G: {
      enabled: { type: Boolean, default: true },
      categories: [{
        code: String,
        name: String,
        deductionPercentage: { type: Number, enum: [100, 50] },
        hasLimit: Boolean,
        qualifyingLimit: Number
      }],
      qualifyingLimitPercentage: { type: Number, default: 10 }
    },
    section80TTA: {
      maxLimit: { type: Number, default: 10000 },
      applicableTo: { type: String, default: 'non_senior' }
    },
    section80TTB: {
      maxLimit: { type: Number, default: 50000 },
      applicableTo: { type: String, default: 'senior' }
    },
    section80EE: {
      maxLimit: { type: Number, default: 50000 },
      maxLoanAmount: { type: Number, default: 3500000 },
      maxPropertyValue: { type: Number, default: 5000000 },
      loanSanctionPeriod: {
        from: Date,
        to: Date
      }
    },
    section80EEA: {
      maxLimit: { type: Number, default: 150000 },
      maxStampDutyValue: { type: Number, default: 4500000 },
      loanSanctionPeriod: {
        from: Date,
        to: Date
      }
    },
    section80EEB: {
      maxLimit: { type: Number, default: 150000 },
      loanSanctionPeriod: {
        from: Date,
        to: Date
      }
    },
    section24: {
      selfOccupiedLimit: { type: Number, default: 200000 },
      letOutLimit: { type: Number, default: null },
      preConstructionInterestYears: { type: Number, default: 5 }
    },
    section80GG: {
      maxLimit: { type: Number, default: 60000 },
      percentageOfTotalIncome: { type: Number, default: 25 }
    },
    section80U: {
      normalDisability: { type: Number, default: 75000 },
      severeDisability: { type: Number, default: 125000 },
      disabilityPercentageThreshold: { type: Number, default: 80 }
    },
    section80DD: {
      normalDisability: { type: Number, default: 75000 },
      severeDisability: { type: Number, default: 125000 }
    },
    section80DDB: {
      maxLimit: { type: Number, default: 40000 },
      seniorCitizenLimit: { type: Number, default: 100000 }
    }
  },

  surchargeSlabs: [{
    fromIncome: Number,
    toIncome: Number,
    rate: Number
  }],

  cess: {
    rate: { type: Number, default: 4 },
    name: { type: String, default: 'Health & Education Cess' }
  },

  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Compound index for efficient lookups
TaxLimitsConfigSchema.index({ tenantId: 1, financialYear: 1, isActive: 1 });

// Default configuration for FY 2024-2025 (Legacy)
export const DEFAULT_TAX_LIMITS_2024_25: Partial<ITaxLimitsConfig> = {
  financialYear: '2024-2025',
  assessmentYear: '2025-2026',
  countryCode: 'IN',

  rebate87A: {
    incomeLimit: 700000,
    maxRebate: 25000,
    applicableRegimes: ['new']
  },

  standardDeduction: {
    amount: 50000,
    applicableRegimes: ['old', 'new']
  },

  sectionLimits: {
    section80C: { maxLimit: 150000, includesNPS80CCD1: true },
    section80CCC: { maxLimit: 150000, combinedWith80C: true },
    section80CCD: {
      employee80CCD1: { maxLimit: 150000, percentageOfSalary: 10, combinedWith80C: true },
      additional80CCD1B: { maxLimit: 50000 },
      employer80CCD2: { maxLimit: null, percentageOfSalary: 10 }
    },
    section80D: {
      selfAndFamily: { maxLimit: 25000, seniorCitizenLimit: 50000 },
      parents: { maxLimit: 25000, seniorCitizenLimit: 50000 },
      preventiveHealthCheckup: { maxLimit: 5000 },
      overallMaxLimit: 100000
    },
    section80E: { enabled: true, hasLimit: false, maxYears: 8 },
    section80G: {
      enabled: true,
      categories: [
        { code: '100_NO_LIMIT', name: 'National Defence Fund, PM CARES', deductionPercentage: 100, hasLimit: false },
        { code: '100_WITH_LIMIT', name: 'Local Authority for Family Planning', deductionPercentage: 100, hasLimit: true, qualifyingLimit: 10 },
        { code: '50_WITH_LIMIT', name: 'Other Approved Charitable Trusts', deductionPercentage: 50, hasLimit: true, qualifyingLimit: 10 }
      ],
      qualifyingLimitPercentage: 10
    },
    section80TTA: { maxLimit: 10000, applicableTo: 'non_senior' },
    section80TTB: { maxLimit: 50000, applicableTo: 'senior' },
    section80EE: {
      maxLimit: 50000, maxLoanAmount: 3500000, maxPropertyValue: 5000000,
      loanSanctionPeriod: { from: new Date('2016-04-01'), to: new Date('2017-03-31') }
    },
    section80EEA: {
      maxLimit: 150000, maxStampDutyValue: 4500000,
      loanSanctionPeriod: { from: new Date('2019-04-01'), to: new Date('2022-03-31') }
    },
    section80EEB: {
      maxLimit: 150000,
      loanSanctionPeriod: { from: new Date('2019-04-01'), to: new Date('2023-03-31') }
    },
    section24: { selfOccupiedLimit: 200000, letOutLimit: null, preConstructionInterestYears: 5 },
    section80GG: { maxLimit: 60000, percentageOfTotalIncome: 25 },
    section80U: { normalDisability: 75000, severeDisability: 125000, disabilityPercentageThreshold: 80 },
    section80DD: { normalDisability: 75000, severeDisability: 125000 },
    section80DDB: { maxLimit: 40000, seniorCitizenLimit: 100000 }
  },

  surchargeSlabs: [
    { fromIncome: 5000000, toIncome: 10000000, rate: 10 },
    { fromIncome: 10000001, toIncome: 20000000, rate: 15 },
    { fromIncome: 20000001, toIncome: 50000000, rate: 25 },
    { fromIncome: 50000001, toIncome: Number.MAX_SAFE_INTEGER, rate: 37 }
  ],

  cess: { rate: 4, name: 'Health & Education Cess' },
  effectiveFrom: new Date('2024-04-01'),
  isActive: true
};

/**
 * Default configuration for FY 2025-2026 (Union Budget 2025)
 *
 * Key Changes:
 * - New Regime: Standard Deduction increased to ₹75,000
 * - New Regime: Rebate 87A increased to ₹60,000 (income up to ₹12 lakh tax-free)
 * - New Regime: New tax slabs - 0-4L: 0%, 4-8L: 5%, 8-12L: 10%, 12-16L: 15%, 16-20L: 20%, 20-24L: 25%, >24L: 30%
 * - Old Regime: Standard Deduction remains ₹50,000
 * - Old Regime: Rebate 87A remains ₹12,500 (income up to ₹5 lakh)
 * - New Regime is the default
 */
export const DEFAULT_TAX_LIMITS_2025_26: Partial<ITaxLimitsConfig> = {
  financialYear: '2025-2026',
  assessmentYear: '2026-2027',
  countryCode: 'IN',

  // Rebate u/s 87A - New Regime: ₹60,000 (up to ₹12 lakh income becomes tax-free)
  // Old Regime: ₹12,500 (up to ₹5 lakh income)
  rebate87A: {
    incomeLimit: 1200000,  // ₹12 lakh for new regime
    maxRebate: 60000,      // ₹60,000 rebate
    applicableRegimes: ['new']
  },

  // Standard Deduction - New Regime: ₹75,000, Old Regime: ₹50,000
  standardDeduction: {
    amount: 75000,  // ₹75,000 for new regime (₹50,000 for old - handled in logic)
    applicableRegimes: ['old', 'new']
  },

  sectionLimits: {
    // Section 80C - Investments (Only Old Regime)
    section80C: { maxLimit: 150000, includesNPS80CCD1: true },

    // Section 80CCC - Pension Fund
    section80CCC: { maxLimit: 150000, combinedWith80C: true },

    // Section 80CCD - NPS
    section80CCD: {
      employee80CCD1: { maxLimit: 150000, percentageOfSalary: 10, combinedWith80C: true },
      additional80CCD1B: { maxLimit: 50000 },
      employer80CCD2: { maxLimit: null, percentageOfSalary: 14 }  // 14% for govt employees
    },

    // Section 80D - Medical Insurance
    section80D: {
      selfAndFamily: { maxLimit: 25000, seniorCitizenLimit: 50000 },
      parents: { maxLimit: 25000, seniorCitizenLimit: 50000 },
      preventiveHealthCheckup: { maxLimit: 5000 },
      overallMaxLimit: 100000
    },

    // Section 80E - Education Loan Interest (No limit)
    section80E: { enabled: true, hasLimit: false, maxYears: 8 },

    // Section 80G - Donations
    section80G: {
      enabled: true,
      categories: [
        { code: '100_NO_LIMIT', name: 'National Defence Fund, PM CARES, PM National Relief Fund', deductionPercentage: 100, hasLimit: false },
        { code: '100_WITH_LIMIT', name: 'Local Authority/Govt for Family Planning', deductionPercentage: 100, hasLimit: true, qualifyingLimit: 10 },
        { code: '50_WITH_LIMIT', name: 'Other Approved Charitable Trusts & Institutions', deductionPercentage: 50, hasLimit: true, qualifyingLimit: 10 }
      ],
      qualifyingLimitPercentage: 10
    },

    // Section 80TTA - Savings Interest (Non-seniors)
    section80TTA: { maxLimit: 10000, applicableTo: 'non_senior' },

    // Section 80TTB - Interest for Seniors
    section80TTB: { maxLimit: 50000, applicableTo: 'senior' },

    // Section 80EE - First-time Home Buyers (Closed scheme)
    section80EE: {
      maxLimit: 50000, maxLoanAmount: 3500000, maxPropertyValue: 5000000,
      loanSanctionPeriod: { from: new Date('2016-04-01'), to: new Date('2017-03-31') }
    },

    // Section 80EEA - Affordable Housing (Closed scheme)
    section80EEA: {
      maxLimit: 150000, maxStampDutyValue: 4500000,
      loanSanctionPeriod: { from: new Date('2019-04-01'), to: new Date('2022-03-31') }
    },

    // Section 80EEB - Electric Vehicle Loan Interest
    section80EEB: {
      maxLimit: 150000,
      loanSanctionPeriod: { from: new Date('2019-04-01'), to: new Date('2025-03-31') }
    },

    // Section 24 - Home Loan Interest
    section24: { selfOccupiedLimit: 200000, letOutLimit: null, preConstructionInterestYears: 5 },

    // Section 80GG - Rent Paid (when no HRA)
    section80GG: { maxLimit: 60000, percentageOfTotalIncome: 25 },

    // Section 80U - Disability
    section80U: { normalDisability: 75000, severeDisability: 125000, disabilityPercentageThreshold: 80 },

    // Section 80DD - Dependent with Disability
    section80DD: { normalDisability: 75000, severeDisability: 125000 },

    // Section 80DDB - Medical Treatment
    section80DDB: { maxLimit: 40000, seniorCitizenLimit: 100000 }
  },

  // Surcharge Slabs for FY 2025-26
  // New Regime: Max 25% surcharge
  // Old Regime: Max 37% surcharge
  surchargeSlabs: [
    { fromIncome: 5000000, toIncome: 10000000, rate: 10 },
    { fromIncome: 10000001, toIncome: 20000000, rate: 15 },
    { fromIncome: 20000001, toIncome: 50000000, rate: 25 },
    { fromIncome: 50000001, toIncome: Number.MAX_SAFE_INTEGER, rate: 25 }  // Capped at 25% for new regime
  ],

  cess: { rate: 4, name: 'Health & Education Cess' },
  effectiveFrom: new Date('2025-04-01'),
  isActive: true
};

// Export the current FY default (2025-26)
export const CURRENT_TAX_LIMITS = DEFAULT_TAX_LIMITS_2025_26;

export default mongoose.model<ITaxLimitsConfig>('TaxLimitsConfig', TaxLimitsConfigSchema);
