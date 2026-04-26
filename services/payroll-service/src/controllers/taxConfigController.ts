import { Request, Response } from 'express';
import ProfessionalTaxConfig from '../models/ProfessionalTaxConfig';
import LWFConfig from '../models/LWFConfig';
import TaxLimitsConfig from '../models/TaxLimitsConfig';
import {
  getPTConfig,
  calculatePTFromConfig,
  seedDefaultPTConfigs,
  getAllPTConfigs
} from '../services/professionalTaxConfigService';
import {
  getLWFConfig,
  getAllLWFConfigs,
  calculateLWF,
  seedDefaultLWFConfigs,
  createLWFConfig,
  updateLWFConfig,
  deactivateLWFConfig
} from '../services/lwfConfigService';
import {
  getTaxLimitsConfig,
  getOrCreateTaxLimitsConfig,
  getSectionLimit,
  getRebateConfig,
  getStandardDeduction,
  updateTaxLimitsConfig,
  cloneConfigForNewYear
} from '../services/taxLimitsConfigService';

// ================= Professional Tax Configuration =================

export const getProfessionalTaxConfigs = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { activeOnly } = req.query;

    const configs = await getAllPTConfigs(tenantId, activeOnly !== 'false');
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch PT configs', error });
  }
};

export const getProfessionalTaxConfig = async (req: Request, res: Response) => {
  try {
    const { tenantId, stateCode } = req.params;

    const config = await getPTConfig(tenantId, stateCode);
    if (!config) {
      return res.status(404).json({ success: false, message: 'PT config not found for state' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch PT config', error });
  }
};

export const createProfessionalTaxConfig = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const configData = req.body;

    const config = new ProfessionalTaxConfig({
      ...configData,
      tenantId,
      stateCode: configData.stateCode?.toUpperCase()
    });

    await config.save();
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create PT config', error });
  }
};

export const updateProfessionalTaxConfig = async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const updates = req.body;

    if (updates.stateCode) {
      updates.stateCode = updates.stateCode.toUpperCase();
    }

    const config = await ProfessionalTaxConfig.findByIdAndUpdate(configId, updates, { new: true });
    if (!config) {
      return res.status(404).json({ success: false, message: 'PT config not found' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update PT config', error });
  }
};

export const deactivateProfessionalTaxConfig = async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;

    const config = await ProfessionalTaxConfig.findByIdAndUpdate(
      configId,
      { isActive: false, effectiveTo: new Date() },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ success: false, message: 'PT config not found' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate PT config', error });
  }
};

export const calculateProfessionalTax = async (req: Request, res: Response) => {
  try {
    const { tenantId, stateCode } = req.params;
    const { grossSalary, month } = req.body;

    const ptAmount = await calculatePTFromConfig(
      tenantId,
      stateCode,
      grossSalary,
      month ? parseInt(month) : undefined
    );

    res.json({
      success: true,
      data: {
        stateCode,
        grossSalary,
        month,
        professionalTax: ptAmount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate PT', error });
  }
};

export const seedProfessionalTaxConfigs = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const seededCount = await seedDefaultPTConfigs(tenantId);
    res.json({
      success: true,
      message: `Seeded ${seededCount} PT configurations`,
      data: { seededCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to seed PT configs', error });
  }
};

// ================= LWF Configuration =================

export const getLWFConfigs = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { activeOnly } = req.query;

    const configs = await getAllLWFConfigs(tenantId, activeOnly !== 'false');
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch LWF configs', error });
  }
};

export const getLWFConfigByState = async (req: Request, res: Response) => {
  try {
    const { tenantId, stateCode } = req.params;

    const config = await getLWFConfig(tenantId, stateCode);
    if (!config) {
      return res.status(404).json({ success: false, message: 'LWF config not found for state' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch LWF config', error });
  }
};

export const createLWFConfiguration = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const configData = req.body;

    const config = await createLWFConfig(tenantId, configData);
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create LWF config', error });
  }
};

export const updateLWFConfiguration = async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const updates = req.body;

    const config = await updateLWFConfig(configId, updates);
    if (!config) {
      return res.status(404).json({ success: false, message: 'LWF config not found' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update LWF config', error });
  }
};

export const deactivateLWFConfiguration = async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;

    const config = await deactivateLWFConfig(configId);
    if (!config) {
      return res.status(404).json({ success: false, message: 'LWF config not found' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate LWF config', error });
  }
};

export const calculateLWFContribution = async (req: Request, res: Response) => {
  try {
    const { tenantId, stateCode } = req.params;
    const { salary, month } = req.body;

    const lwf = await calculateLWF(tenantId, stateCode, salary, month);
    res.json({
      success: true,
      data: {
        stateCode,
        salary,
        month,
        ...lwf
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate LWF', error });
  }
};

export const seedLWFConfigs = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const seededCount = await seedDefaultLWFConfigs(tenantId);
    res.json({
      success: true,
      message: `Seeded ${seededCount} LWF configurations`,
      data: { seededCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to seed LWF configs', error });
  }
};

// ================= Tax Limits Configuration =================

export const getTaxLimits = async (req: Request, res: Response) => {
  try {
    const { tenantId, financialYear } = req.params;

    const config = await getOrCreateTaxLimitsConfig(tenantId, financialYear);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tax limits', error });
  }
};

export const getSectionLimitValue = async (req: Request, res: Response) => {
  try {
    const { tenantId, financialYear, section } = req.params;

    const limit = await getSectionLimit(tenantId, financialYear, section);
    res.json({
      success: true,
      data: {
        section,
        limit,
        unlimited: limit === null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch section limit', error });
  }
};

export const getRebateConfiguration = async (req: Request, res: Response) => {
  try {
    const { tenantId, financialYear } = req.params;

    const rebate = await getRebateConfig(tenantId, financialYear);
    res.json({ success: true, data: rebate });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rebate config', error });
  }
};

export const getStandardDeductionAmount = async (req: Request, res: Response) => {
  try {
    const { tenantId, financialYear } = req.params;
    const { regime } = req.query;

    const amount = await getStandardDeduction(tenantId, financialYear, (regime as 'old' | 'new') || 'new');
    res.json({
      success: true,
      data: {
        regime,
        standardDeduction: amount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch standard deduction', error });
  }
};

export const updateTaxLimits = async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const updates = req.body;

    const config = await updateTaxLimitsConfig(configId, updates);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Tax limits config not found' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update tax limits', error });
  }
};

export const cloneTaxLimitsForYear = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { sourceFinancialYear, targetFinancialYear } = req.body;

    const config = await cloneConfigForNewYear(tenantId, sourceFinancialYear, targetFinancialYear);
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clone tax limits', error });
  }
};

// ================= Seed All Defaults =================

export const seedAllDefaults = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { financialYear } = req.body;

    const ptCount = await seedDefaultPTConfigs(tenantId);
    const lwfCount = await seedDefaultLWFConfigs(tenantId);
    const taxLimits = await getOrCreateTaxLimitsConfig(tenantId, financialYear || '2024-2025');

    res.json({
      success: true,
      message: 'Default configurations seeded successfully',
      data: {
        professionalTaxConfigs: ptCount,
        lwfConfigs: lwfCount,
        taxLimitsConfig: taxLimits ? 1 : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to seed defaults', error });
  }
};

export default {
  // PT
  getProfessionalTaxConfigs,
  getProfessionalTaxConfig,
  createProfessionalTaxConfig,
  updateProfessionalTaxConfig,
  deactivateProfessionalTaxConfig,
  calculateProfessionalTax,
  seedProfessionalTaxConfigs,
  // LWF
  getLWFConfigs,
  getLWFConfigByState,
  createLWFConfiguration,
  updateLWFConfiguration,
  deactivateLWFConfiguration,
  calculateLWFContribution,
  seedLWFConfigs,
  // Tax Limits
  getTaxLimits,
  getSectionLimitValue,
  getRebateConfiguration,
  getStandardDeductionAmount,
  updateTaxLimits,
  cloneTaxLimitsForYear,
  // Seed All
  seedAllDefaults
};
