import ProfessionalTaxConfig, { IProfessionalTaxConfig, DEFAULT_PT_CONFIGS } from '../models/ProfessionalTaxConfig';

/**
 * Get PT configuration for a specific state
 */
export async function getPTConfig(
  tenantId: string,
  stateCode: string
): Promise<IProfessionalTaxConfig | null> {
  return ProfessionalTaxConfig.findOne({
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
 * Get all PT configurations for a tenant
 */
export async function getAllPTConfigs(
  tenantId: string,
  activeOnly: boolean = true
): Promise<IProfessionalTaxConfig[]> {
  const query: any = { tenantId };
  if (activeOnly) {
    query.isActive = true;
  }
  return ProfessionalTaxConfig.find(query).sort({ stateName: 1 });
}

/**
 * Calculate Professional Tax from database configuration
 */
export async function calculatePTFromConfig(
  tenantId: string,
  stateCode: string,
  grossSalary: number,
  month?: number
): Promise<number> {
  const config = await getPTConfig(tenantId, stateCode);

  if (!config) {
    // Fallback to default calculation if no config found
    console.warn(`No PT config found for state ${stateCode}, using default`);
    return calculateDefaultPT(stateCode, grossSalary, month);
  }

  // Apply February adjustment if applicable (e.g., Maharashtra)
  if (config.februaryAdjustment && month === 2 && config.februaryAmount) {
    return config.februaryAmount;
  }

  // Find applicable slab
  for (const slab of config.slabs) {
    if (grossSalary >= slab.fromAmount && grossSalary <= slab.toAmount) {
      return slab.taxAmount;
    }
  }

  // If salary exceeds all slabs, return the highest slab amount
  if (config.slabs.length > 0) {
    const lastSlab = config.slabs[config.slabs.length - 1];
    if (grossSalary > lastSlab.toAmount) {
      return lastSlab.taxAmount;
    }
  }

  return 0;
}

/**
 * Default PT calculation (fallback)
 */
function calculateDefaultPT(stateCode: string, grossSalary: number, month?: number): number {
  const defaultConfig = DEFAULT_PT_CONFIGS.find(c => c.stateCode === stateCode.toUpperCase());

  if (!defaultConfig) {
    // Generic default: 0 below 10000, 200 above
    if (grossSalary <= 10000) return 0;
    return 200;
  }

  // Apply February adjustment
  if (defaultConfig.februaryAdjustment && month === 2 && defaultConfig.februaryAmount) {
    return defaultConfig.februaryAmount;
  }

  // Find applicable slab
  for (const slab of defaultConfig.slabs) {
    if (grossSalary >= slab.fromAmount && grossSalary <= slab.toAmount) {
      return slab.taxAmount;
    }
  }

  return 0;
}

/**
 * Create PT configuration
 */
export async function createPTConfig(
  tenantId: string,
  config: Partial<IProfessionalTaxConfig>
): Promise<IProfessionalTaxConfig> {
  const ptConfig = new ProfessionalTaxConfig({
    ...config,
    tenantId,
    stateCode: config.stateCode?.toUpperCase()
  });
  return ptConfig.save();
}

/**
 * Update PT configuration
 */
export async function updatePTConfig(
  configId: string,
  updates: Partial<IProfessionalTaxConfig>
): Promise<IProfessionalTaxConfig | null> {
  if (updates.stateCode) {
    updates.stateCode = updates.stateCode.toUpperCase();
  }
  return ProfessionalTaxConfig.findByIdAndUpdate(configId, updates, { new: true });
}

/**
 * Deactivate PT configuration
 */
export async function deactivatePTConfig(configId: string): Promise<IProfessionalTaxConfig | null> {
  return ProfessionalTaxConfig.findByIdAndUpdate(
    configId,
    { isActive: false, effectiveTo: new Date() },
    { new: true }
  );
}

/**
 * Seed default PT configurations for a tenant
 */
export async function seedDefaultPTConfigs(tenantId: string): Promise<number> {
  let seededCount = 0;

  for (const config of DEFAULT_PT_CONFIGS) {
    // Check if config already exists
    const existing = await ProfessionalTaxConfig.findOne({
      tenantId,
      stateCode: config.stateCode,
      isActive: true
    });

    if (!existing) {
      await ProfessionalTaxConfig.create({
        ...config,
        tenantId
      });
      seededCount++;
    }
  }

  return seededCount;
}

/**
 * Get list of all states with PT configured
 */
export async function getAllStatesWithPT(tenantId: string): Promise<string[]> {
  const configs = await ProfessionalTaxConfig.find({
    tenantId,
    isActive: true
  }).select('stateCode stateName');

  return configs.map(c => c.stateCode);
}

/**
 * Calculate annual PT for an employee
 */
export async function calculateAnnualPT(
  tenantId: string,
  stateCode: string,
  monthlySalaries: number[]
): Promise<{
  monthlyPT: number[];
  totalAnnualPT: number;
  maxAnnualLimit: number;
  isLimitApplied: boolean;
}> {
  const config = await getPTConfig(tenantId, stateCode);
  const maxAnnualLimit = config?.maxAnnualLimit || 2500;

  const monthlyPT: number[] = [];
  let totalPT = 0;

  for (let month = 1; month <= 12; month++) {
    const salary = monthlySalaries[month - 1] || 0;
    const pt = await calculatePTFromConfig(tenantId, stateCode, salary, month);
    monthlyPT.push(pt);
    totalPT += pt;
  }

  // Apply annual limit if exceeded
  const isLimitApplied = totalPT > maxAnnualLimit;
  const adjustedTotalPT = Math.min(totalPT, maxAnnualLimit);

  return {
    monthlyPT,
    totalAnnualPT: adjustedTotalPT,
    maxAnnualLimit,
    isLimitApplied
  };
}

/**
 * Check if employee is exempt from PT
 */
export async function isExemptFromPT(
  tenantId: string,
  stateCode: string,
  exemptCategory: string
): Promise<boolean> {
  const config = await getPTConfig(tenantId, stateCode);
  if (!config) return false;

  return config.exemptCategories.includes(exemptCategory.toLowerCase());
}

export default {
  getPTConfig,
  getAllPTConfigs,
  calculatePTFromConfig,
  createPTConfig,
  updatePTConfig,
  deactivatePTConfig,
  seedDefaultPTConfigs,
  getAllStatesWithPT,
  calculateAnnualPT,
  isExemptFromPT
};
