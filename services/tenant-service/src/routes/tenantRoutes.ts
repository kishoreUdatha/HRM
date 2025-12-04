import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import {
  createTenant,
  getTenantById,
  getTenantBySlug,
  updateTenant,
  updateTenantSettings,
  getCurrentTenant,
  getAllTenants,
  updateSubscription,
  checkSlugAvailability,
  updateTenantStatus,
  getTenantStats,
  deleteTenant,
  extendTrial,
} from '../controllers/tenantController';

const router = Router();

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
    return;
  }
  next();
};

// Validation rules
const createTenantValidation = [
  body('name').notEmpty().withMessage('Organization name is required'),
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
];

const updateSubscriptionValidation = [
  body('plan')
    .isIn(['free', 'starter', 'professional', 'enterprise'])
    .withMessage('Invalid plan'),
];

// Public routes
router.get('/check-slug/:slug', checkSlugAvailability);
router.get('/by-slug/:slug', getTenantBySlug);
router.post('/', createTenantValidation, validate, createTenant);

// Protected routes
router.get('/current', getCurrentTenant);
router.get('/', getAllTenants);
router.get('/:id', getTenantById);
router.put('/current', updateTenant);
router.put('/current/settings', updateTenantSettings);
router.put('/current/subscription', updateSubscriptionValidation, validate, updateSubscription);

// Admin routes (super_admin only)
router.get('/admin/stats', getTenantStats);
router.put('/admin/:id/status', updateTenantStatus);
router.put('/admin/:id/extend-trial', extendTrial);
router.delete('/admin/:id', deleteTenant);

export default router;
