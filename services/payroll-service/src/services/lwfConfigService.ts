import LWFConfig, { ILWFConfig, DEFAULT_LWF_CONFIGS } from '../models/LWFConfig';

/**
 * Get LWF configuration for a specific state
 */
export async function getLWFConfig(
  tenantId: string,
  stateCode: string
): Promise<ILWFConfig | null> {
  return LWFConfig.findOne({
    tenantId,
    stateCode: stateCode.toUpperCase(),
    isActive: true,
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: null },
      { effectiveTo: { $gte: new Date() } }
    ]
  }).sort({ effectiveFrom: -1 });
}

/**
 * Get all LWF configurations for a tenant
 */
export async function getAllLWFConfigs(
  tenantId: string,
  activeOnly: boolean = true
): Promise<ILWFConfig[]> {
  const query: any = { tenantId };
  if (activeOnly) {
    query.isActive = true;
  }
  return LWFConfig.find(query).sort({ stateName: 1 });
}

/**
 * Calculate LWF contributions
 */
export async function calculateLWF(
  tenantId: string,
  stateCode: string,
  salary: number,
  month: number
): Promise<{
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  isDeductionMonth: boolean;
}> {
  const config = await getLWFConfig(tenantId, stateCode);

  if (!config) {
    // Fallback to default
    const defaultConfig = DEFAULT_LWF_CONFIGS.find(c => c.stateCode === stateCode.toUpperCase());
    if (!defaultConfig) {
      return {
        employeeContribution: 0,
        employerContribution: 0,
        totalContribution: 0,
        isDeductionMonth: false
      };
    }

    const isDeductionMonth = defaultConfig.frequency === 'monthly' ||
      defaultConfig.deductionMonths.includes(month);

    if (!isDeductionMonth) {
      return {
        employeeContribution: 0,
        employerContribution: 0,
        totalContribution: 0,
        isDeductionMonth: false
      };
    }

    return calculateContributions(defaultConfig, salary, true);
  }

  // Check if this is a deduction month
  const isDeductionMonth = config.frequency === 'monthly' ||
    config.deductionMonths.includes(month);

  if (!isDeductionMonth) {
    return {
      employeeContribution: 0,
      employerContribution: 0,
      totalContribution: 0,
      isDeductionMonth: false
    };
  }

  return calculateContributions(config, salary, isDeductionMonth);
}

/**
 * LWF config type for calculations (partial type for defaults)
 */
interface ILWFConfigLike {
  contributionType: 'fixed' | 'percentage';
  employeeContribution: number;
  employerContribution: number;
}

/**
 * Calculate contributions based on config
 */
function calculateContributions(
  config: ILWFConfigLike,
  salary: number,
  isDeductionMonth: boolean
): {
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  isDeductionMonth: boolean;
} {
  let employeeContribution = 0;
  let employerContribution = 0;

  if (config.contributionType === 'fixed') {
    employeeContribution = config.employeeContribution;
    employerContribution = config.employerContribution;
  } else {
    employeeContribution = Math.round(salary * (config.employeeContribution / 100));
    employerContribution = Math.round(salary * (config.employerContribution / 100));
  }

  return {
    employeeContribution,
    employerContribution,
    totalContribution: employeeContribution + employerContribution,
    isDeductionMonth
  };
}

/**
 * Check if LWF is applicable for a given month
 */
export async function isLWFDeductionMonth(
  tenantId: string,
  stateCode: string,
  month: number
): Promise<boolean> {
  const config = await getLWFConfig(tenantId, stateCode);

  if (!config) {
    const defaultConfig = DEFAULT_LWF_CONFIGS.find(c => c.stateCode === stateCode.toUpperCase());
    if (!defaultConfig) return false;
    return defaultConfig.frequency === 'monthly' || defaultConfig.deductionMonths.includes(month);
  }

  return config.frequency === 'monthly' || config.deductionMonths.includes(month);
}

/**
 * Create LWF configuration
 */
export async function createLWFConfig(
  tenantId: string,
  config: Partial<ILWFConfig>
): Promise<ILWFConfig> {
  const lwfConfig = new LWFConfig({
    ...config,
    tenantId,
    stateCode: config.stateCode?.toUpperCase()
  });
  return lwfConfig.save();
}

/**
 * Update LWF configuration
 */
export async function updateLWFConfig(
  configId: string,
  updates: Partial<ILWFConfig>
): Promise<ILWFConfig | null> {
  if (updates.stateCode) {
    updates.stateCode = updates.stateCode.toUpperCase();
  }
  return LWFConfig.findByIdAndUpdate(configId, updates, { new: true });
}

/**
 * Deactivate LWF configuration
 */
export async function deactivateLWFConfig(configId: string): Promise<ILWFConfig | null> {
  return LWFConfig.findByIdAndUpdate(
    configId,
    { isActive: false, effectiveTo: new Date() },
    { new: true }
  );
}

/**
 * Seed default LWF configurations for a tenant
 */
export async function seedDefaultLWFConfigs(tenantId: string): Promise<number> {
  let seededCount = 0;

  for (const config of DEFAULT_LWF_CONFIGS) {
    // Check if config already exists
    const existing = await LWFConfig.findOne({
      tenantId,
      stateCode: config.stateCode,
      isActive: true
    });

    if (!existing) {
      await LWFConfig.create({
        ...config,
        tenantId
      });
      seededCount++;
    }
  }

  return seededCount;
}

/**
 * Get list of all states with LWF configured
 */
export async function getAllStatesWithLWF(tenantId: string): Promise<string[]> {
  const configs = await LWFConfig.find({
    tenantId,
    isActive: true
  }).select('stateCode stateName');

  return configs.map(c => c.stateCode);
}

/**
 * Calculate annual LWF for an employee
 */
export async function calculateAnnualLWF(
  tenantId: string,
  stateCode: string,
  monthlySalaries: number[]
): Promise<{
  monthlyLWF: { employee: number; employer: number }[];
  totalEmployeeContribution: number;
  totalEmployerContribution: number;
  totalContribution: number;
  deductionMonths: number[];
}> {
  const config = await getLWFConfig(tenantId, stateCode);
  const monthlyLWF: { employee: number; employer: number }[] = [];
  let totalEmployee = 0;
  let totalEmployer = 0;
  const deductionMonths: number[] = [];

  for (let month = 1; month <= 12; month++) {
    const salary = monthlySalaries[month - 1] || 0;
    const lwf = await calculateLWF(tenantId, stateCode, salary, month);

    monthlyLWF.push({
      employee: lwf.employeeContribution,
      employer: lwf.employerContribution
    });

    if (lwf.isDeductionMonth) {
      deductionMonths.push(month);
      totalEmployee += lwf.employeeContribution;
      totalEmployer += lwf.employerContribution;
    }
  }

  return {
    monthlyLWF,
    totalEmployeeContribution: totalEmployee,
    totalEmployerContribution: totalEmployer,
    totalContribution: totalEmployee + totalEmployer,
    deductionMonths
  };
}

/**
 * Get LWF due date for a month
 */
export async function getLWFDueDate(
  tenantId: string,
  stateCode: string,
  month: number,
  year: number
): Promise<Date | null> {
  const config = await getLWFConfig(tenantId, stateCode);
  if (!config) return null;

  const isDeductionMonth = config.frequency === 'monthly' ||
    config.deductionMonths.includes(month);

  if (!isDeductionMonth) return null;

  // LWF is typically due by 15th of the following month
  const dueDate = new Date(year, month, 15);  // month is 0-indexed in Date, so this gives next month
  dueDate.setDate(dueDate.getDate() + config.gracePeriodDays);

  return dueDate;
}

export default {
  getLWFConfig,
  getAllLWFConfigs,
  calculateLWF,
  isLWFDeductionMonth,
  createLWFConfig,
  updateLWFConfig,
  deactivateLWFConfig,
  seedDefaultLWFConfigs,
  getAllStatesWithLWF,
  calculateAnnualLWF,
  getLWFDueDate
};
