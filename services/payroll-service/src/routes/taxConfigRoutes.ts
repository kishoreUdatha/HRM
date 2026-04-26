import { Router } from 'express';
import * as taxConfigController from '../controllers/taxConfigController';

const router = Router();

// ==================== PROFESSIONAL TAX CONFIG ROUTES ====================

// Get all PT configs for tenant
router.get('/:tenantId/pt', taxConfigController.getProfessionalTaxConfigs);

// Get PT config for specific state
router.get('/:tenantId/pt/:stateCode', taxConfigController.getProfessionalTaxConfig);

// Create PT config
router.post('/:tenantId/pt', taxConfigController.createProfessionalTaxConfig);

// Update PT config
router.put('/pt/:configId', taxConfigController.updateProfessionalTaxConfig);

// Deactivate PT config
router.delete('/pt/:configId', taxConfigController.deactivateProfessionalTaxConfig);

// Calculate PT for given salary
router.post('/:tenantId/pt/:stateCode/calculate', taxConfigController.calculateProfessionalTax);

// Seed default PT configs
router.post('/:tenantId/pt/seed', taxConfigController.seedProfessionalTaxConfigs);

// ==================== LWF CONFIG ROUTES ====================

// Get all LWF configs for tenant
router.get('/:tenantId/lwf', taxConfigController.getLWFConfigs);

// Get LWF config for specific state
router.get('/:tenantId/lwf/:stateCode', taxConfigController.getLWFConfigByState);

// Create LWF config
router.post('/:tenantId/lwf', taxConfigController.createLWFConfiguration);

// Update LWF config
router.put('/lwf/:configId', taxConfigController.updateLWFConfiguration);

// Deactivate LWF config
router.delete('/lwf/:configId', taxConfigController.deactivateLWFConfiguration);

// Calculate LWF contribution
router.post('/:tenantId/lwf/:stateCode/calculate', taxConfigController.calculateLWFContribution);

// Seed default LWF configs
router.post('/:tenantId/lwf/seed', taxConfigController.seedLWFConfigs);

// ==================== TAX LIMITS CONFIG ROUTES ====================

// Get tax limits config for financial year
router.get('/:tenantId/tax-limits/:financialYear', taxConfigController.getTaxLimits);

// Get section limit
router.get('/:tenantId/tax-limits/:financialYear/section/:section', taxConfigController.getSectionLimitValue);

// Get rebate config
router.get('/:tenantId/tax-limits/:financialYear/rebate', taxConfigController.getRebateConfiguration);

// Get standard deduction
router.get('/:tenantId/tax-limits/:financialYear/standard-deduction', taxConfigController.getStandardDeductionAmount);

// Update tax limits config
router.put('/tax-limits/:configId', taxConfigController.updateTaxLimits);

// Clone tax limits for new financial year
router.post('/:tenantId/tax-limits/clone', taxConfigController.cloneTaxLimitsForYear);

// ==================== SEED ALL DEFAULTS ====================

// Seed all default configurations (PT, LWF, Tax Limits)
router.post('/:tenantId/seed-all', taxConfigController.seedAllDefaults);

export default router;
