import TaxLimitsConfig, { ITaxLimitsConfig, DEFAULT_TAX_LIMITS_2025_26, DEFAULT_TAX_LIMITS_2024_25 } from '../models/TaxLimitsConfig';

/**
 * Get tax limits configuration for a financial year
 */
export async function getTaxLimitsConfig(
  tenantId: string,
  financialYear: string
): Promise<ITaxLimitsConfig | null> {
  return TaxLimitsConfig.findOne({
    tenantId,
    financialYear,
    isActive: true
  });
}

/**
 * Get or create tax limits config (with default if not exists)
 */
export async function getOrCreateTaxLimitsConfig(
  tenantId: string,
  financialYear: string
): Promise<ITaxLimitsConfig> {
  let config = await getTaxLimitsConfig(tenantId, financialYear);

  if (!config) {
    config = await createDefaultTaxLimits(tenantId, financialYear);
  }

  return config;
}

/**
 * Create default tax limits for a financial year
 * Uses FY 2025-26 defaults for new configurations
 */
export async function createDefaultTaxLimits(
  tenantId: string,
  financialYear: string
): Promise<ITaxLimitsConfig> {
  const [startYear, endYear] = financialYear.split('-').map(Number);
  const assessmentYear = `${endYear}-${endYear + 1}`;

  // Use 2025-26 defaults for FY 2025-26 onwards, else use 2024-25
  const defaultLimits = startYear >= 2025 ? DEFAULT_TAX_LIMITS_2025_26 : DEFAULT_TAX_LIMITS_2024_25;

  const config = new TaxLimitsConfig({
    ...defaultLimits,
    tenantId,
    financialYear,
    assessmentYear,
    effectiveFrom: new Date(`${startYear}-04-01`)
  });

  return config.save();
}

/**
 * Get section limit for a specific section
 */
export async function getSectionLimit(
  tenantId: string,
  financialYear: string,
  section: string
): Promise<number | null> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
  const limits = config.sectionLimits;

  switch (section.toLowerCase()) {
    case '80c':
      return limits.section80C.maxLimit;
    case '80ccc':
      return limits.section80CCC.maxLimit;
    case '80ccd':
    case '80ccd_1':
      return limits.section80CCD.employee80CCD1.maxLimit;
    case '80ccd_1b':
      return limits.section80CCD.additional80CCD1B.maxLimit;
    case '80ccd_2':
      return limits.section80CCD.employer80CCD2.maxLimit;
    case '80d':
      return limits.section80D.overallMaxLimit;
    case '80d_self':
      return limits.section80D.selfAndFamily.maxLimit;
    case '80d_parents':
      return limits.section80D.parents.maxLimit;
    case '80e':
      return null;  // No limit
    case '80g':
      return null;  // Depends on income
    case '80tta':
      return limits.section80TTA.maxLimit;
    case '80ttb':
      return limits.section80TTB.maxLimit;
    case '80ee':
      return limits.section80EE.maxLimit;
    case '80eea':
      return limits.section80EEA.maxLimit;
    case '80eeb':
      return limits.section80EEB.maxLimit;
    case '24':
    case 'section24':
      return limits.section24.selfOccupiedLimit;
    case '80gg':
      return limits.section80GG.maxLimit;
    case '80u':
      return limits.section80U.severeDisability;
    case '80dd':
      return limits.section80DD.severeDisability;
    case '80ddb':
      return limits.section80DDB.seniorCitizenLimit;
    default:
      return null;
  }
}

/**
 * Get rebate configuration (Section 87A)
 */
export async function getRebateConfig(
  tenantId: string,
  financialYear: string
): Promise<{ incomeLimit: number; maxRebate: number; applicableRegimes: string[] }> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
  return config.rebate87A;
}

/**
 * Get standard deduction (FY 2025-26)
 * New Regime: ₹75,000
 * Old Regime: ₹50,000
 */
export async function getStandardDeduction(
  tenantId: string,
  financialYear: string,
  regime: 'old' | 'new'
): Promise<number> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
  const { applicableRegimes } = config.standardDeduction;

  if (!applicableRegimes.includes(regime)) {
    return 0;
  }

  // FY 2025-26 onwards: Different standard deduction per regime
  const [startYear] = financialYear.split('-').map(Number);
  if (startYear >= 2025) {
    return regime === 'new' ? 75000 : 50000;
  }

  // Prior years: Same standard deduction for both regimes
  return config.standardDeduction.amount;
}

/**
 * Get surcharge rate based on income
 */
export async function getSurchargeRate(
  tenantId: string,
  financialYear: string,
  taxableIncome: number
): Promise<number> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);

  for (const slab of config.surchargeSlabs) {
    if (taxableIncome >= slab.fromIncome && taxableIncome <= slab.toIncome) {
      return slab.rate;
    }
  }

  return 0;
}

/**
 * Get cess rate
 */
export async function getCessRate(
  tenantId: string,
  financialYear: string
): Promise<{ rate: number; name: string }> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
  return config.cess;
}

/**
 * Calculate Section 80D limit based on age
 */
export async function getSection80DLimit(
  tenantId: string,
  financialYear: string,
  isSelfSenior: boolean,
  isParentsSenior: boolean
): Promise<{
  selfLimit: number;
  parentsLimit: number;
  preventiveHealthLimit: number;
  totalLimit: number;
}> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
  const limits = config.sectionLimits.section80D;

  const selfLimit = isSelfSenior
    ? limits.selfAndFamily.seniorCitizenLimit
    : limits.selfAndFamily.maxLimit;

  const parentsLimit = isParentsSenior
    ? limits.parents.seniorCitizenLimit
    : limits.parents.maxLimit;

  const preventiveHealthLimit = limits.preventiveHealthCheckup.maxLimit;

  return {
    selfLimit,
    parentsLimit,
    preventiveHealthLimit,
    totalLimit: Math.min(selfLimit + parentsLimit + preventiveHealthLimit, limits.overallMaxLimit)
  };
}

/**
 * Check if Section 80EE is applicable
 */
export async function isSection80EEApplicable(
  tenantId: string,
  financialYear: string,
  loanSanctionDate: Date,
  loanAmount: number,
  propertyValue: number
): Promise<{ isApplicable: boolean; reason?: string }> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
  const limits = config.sectionLimits.section80EE;

  if (loanSanctionDate < limits.loanSanctionPeriod.from) {
    return { isApplicable: false, reason: 'Loan sanctioned before eligible period' };
  }

  if (loanSanctionDate > limits.loanSanctionPeriod.to) {
    return { isApplicable: false, reason: 'Loan sanctioned after eligible period' };
  }

  if (loanAmount > limits.maxLoanAmount) {
    return { isApplicable: false, reason: `Loan amount exceeds limit of ${limits.maxLoanAmount}` };
  }

  if (propertyValue > limits.maxPropertyValue) {
    return { isApplicable: false, reason: `Property value exceeds limit of ${limits.maxPropertyValue}` };
  }

  return { isApplicable: true };
}

/**
 * Check if Section 80EEA is applicable
 */
export async function isSection80EEAApplicable(
  tenantId: string,
  financialYear: string,
  loanSanctionDate: Date,
  stampDutyValue: number
): Promise<{ isApplicable: boolean; reason?: string }> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
  const limits = config.sectionLimits.section80EEA;

  if (loanSanctionDate < limits.loanSanctionPeriod.from) {
    return { isApplicable: false, reason: 'Loan sanctioned before eligible period' };
  }

  if (loanSanctionDate > limits.loanSanctionPeriod.to) {
    return { isApplicable: false, reason: 'Loan sanctioned after eligible period' };
  }

  if (stampDutyValue > limits.maxStampDutyValue) {
    return { isApplicable: false, reason: `Stamp duty value exceeds limit of ${limits.maxStampDutyValue}` };
  }

  return { isApplicable: true };
}

/**
 * Get Section 80TTA/80TTB limit based on senior citizen status
 */
export async function getInterestDeductionLimit(
  tenantId: string,
  financialYear: string,
  isSeniorCitizen: boolean
): Promise<{ section: string; limit: number }> {
  const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);

  if (isSeniorCitizen) {
    return {
      section: '80TTB',
      limit: config.sectionLimits.section80TTB.maxLimit
    };
  }

  return {
    section: '80TTA',
    limit: config.sectionLimits.section80TTA.maxLimit
  };
}

/**
 * Update tax limits configuration
 */
export async function updateTaxLimitsConfig(
  configId: string,
  updates: Partial<ITaxLimitsConfig>
): Promise<ITaxLimitsConfig | null> {
  return TaxLimitsConfig.findByIdAndUpdate(configId, updates, { new: true });
}

/**
 * Clone configuration for new financial year
 */
export async function cloneConfigForNewYear(
  tenantId: string,
  sourceFinancialYear: string,
  targetFinancialYear: string
): Promise<ITaxLimitsConfig> {
  const sourceConfig = await getTaxLimitsConfig(tenantId, sourceFinancialYear);

  if (!sourceConfig) {
    return createDefaultTaxLimits(tenantId, targetFinancialYear);
  }

  const [startYear, endYear] = targetFinancialYear.split('-').map(Number);
  const assessmentYear = `${endYear}-${endYear + 1}`;

  const newConfig = new TaxLimitsConfig({
    ...sourceConfig.toObject(),
    _id: undefined,
    financialYear: targetFinancialYear,
    assessmentYear,
    effectiveFrom: new Date(`${startYear}-04-01`),
    createdAt: undefined,
    updatedAt: undefined
  });

  return newConfig.save();
}

export default {
  getTaxLimitsConfig,
  getOrCreateTaxLimitsConfig,
  createDefaultTaxLimits,
  getSectionLimit,
  getRebateConfig,
  getStandardDeduction,
  getSurchargeRate,
  getCessRate,
  getSection80DLimit,
  isSection80EEApplicable,
  isSection80EEAApplicable,
  getInterestDeductionLimit,
  updateTaxLimitsConfig,
  cloneConfigForNewYear
};
