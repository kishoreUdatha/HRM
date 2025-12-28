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
  startTrial,
  endTrial,
  getAdminTenantList,
  createTenantWithAdmin,
  updateTenantByAdmin,
} from '../controllers/tenantController';
import * as platformAdmin from '../controllers/platformAdminController';

const router = Router();

// Super admin middleware
const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const userRole = req.headers['x-user-role'] as string;
  if (userRole !== 'super_admin') {
    res.status(403).json({
      success: false,
      message: 'Super Admin access required',
    });
    return;
  }
  next();
};

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
router.get('/admin/list', requireSuperAdmin, getAdminTenantList);
router.get('/admin/stats', requireSuperAdmin, getTenantStats);
router.post('/admin/create-with-admin', requireSuperAdmin, createTenantWithAdmin);
router.put('/admin/:id/update', requireSuperAdmin, updateTenantByAdmin);
router.put('/admin/:id/status', requireSuperAdmin, updateTenantStatus);
router.post('/admin/:id/start-trial', requireSuperAdmin, startTrial);
router.put('/admin/:id/extend-trial', requireSuperAdmin, extendTrial);
router.post('/admin/:id/end-trial', requireSuperAdmin, endTrial);
router.delete('/admin/:id', requireSuperAdmin, deleteTenant);

// Platform Admin Routes (super_admin only)
// Revenue & Analytics
router.get('/admin/revenue', requireSuperAdmin, platformAdmin.getRevenueAnalytics);
router.get('/admin/growth', requireSuperAdmin, platformAdmin.getGrowthAnalytics);
router.get('/admin/health', requireSuperAdmin, platformAdmin.getPlatformHealth);

// Platform Notifications
router.get('/admin/notifications', requireSuperAdmin, platformAdmin.getNotifications);
router.post('/admin/notifications', requireSuperAdmin, platformAdmin.createNotification);
router.put('/admin/notifications/:id', requireSuperAdmin, platformAdmin.updateNotification);
router.post('/admin/notifications/:id/send', requireSuperAdmin, platformAdmin.sendNotification);
router.delete('/admin/notifications/:id', requireSuperAdmin, platformAdmin.deleteNotification);

// System Settings
router.get('/admin/settings', requireSuperAdmin, platformAdmin.getSystemSettings);
router.put('/admin/settings', requireSuperAdmin, platformAdmin.updateSystemSettings);
router.post('/admin/maintenance', requireSuperAdmin, platformAdmin.toggleMaintenanceMode);

// Plan Management
router.get('/admin/plans', requireSuperAdmin, platformAdmin.getPlans);
router.get('/admin/features', requireSuperAdmin, platformAdmin.getAvailableFeatures);
router.put('/admin/plans/:planName', requireSuperAdmin, platformAdmin.updatePlan);
router.post('/admin/plans/:planName/features', requireSuperAdmin, platformAdmin.addPlanFeature);
router.delete('/admin/plans/:planName/features', requireSuperAdmin, platformAdmin.removePlanFeature);
router.put('/admin/plans/:planName/features', requireSuperAdmin, platformAdmin.updatePlanFeatures);

// Tenant notifications (for tenant users to get platform announcements)
router.get('/notifications', platformAdmin.getTenantNotifications);

export default router;
