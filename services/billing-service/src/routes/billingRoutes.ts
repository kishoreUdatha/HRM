import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import * as billingController from '../controllers/billingController';
import * as webhookController from '../controllers/webhookController';
import * as planManagementController from '../controllers/planManagementController';

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

// ==================== PUBLIC ROUTES ====================

// Get pricing plans (public - from database)
router.get('/plans', planManagementController.getPublicPlans);

// ==================== TENANT ROUTES ====================

// Create/get Razorpay customer
router.post(
  '/customers',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  validate,
  billingController.createCustomer
);

// Create subscription (initiate payment)
router.post(
  '/subscriptions',
  [
    body('plan').isIn(['starter', 'professional', 'enterprise']).withMessage('Invalid plan'),
    body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle'),
  ],
  validate,
  billingController.createSubscription
);

// Verify payment and activate subscription
router.post(
  '/verify-payment',
  [
    body('razorpayOrderId').notEmpty().withMessage('Order ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Signature is required'),
  ],
  validate,
  billingController.verifyPayment
);

// Get current subscription
router.get('/subscriptions/current', billingController.getCurrentSubscription);

// Cancel subscription
router.post('/subscriptions/cancel', billingController.cancelSubscription);

// Get invoices
router.get('/invoices', billingController.getInvoices);

// Get current subscription features (for ARIA feature checks)
router.get('/features', billingController.getSubscriptionFeatures);

// Get invoice by ID
router.get('/invoices/:id', billingController.getInvoiceById);

// ==================== ADMIN ROUTES ====================

// Get all subscriptions
router.get('/admin/subscriptions', requireSuperAdmin, billingController.getAllSubscriptions);

// Get revenue analytics
router.get('/admin/revenue', requireSuperAdmin, billingController.getRevenueAnalytics);

// Get all invoices
router.get('/admin/invoices', requireSuperAdmin, billingController.getAllInvoices);

// Get invoice by ID (admin)
router.get('/admin/invoices/:id', requireSuperAdmin, billingController.getAdminInvoiceById);

// Download invoice as PDF/HTML
router.get('/admin/invoices/:id/download', requireSuperAdmin, billingController.downloadInvoicePdf);

// Update tenant subscription
router.put('/admin/tenants/:tenantId/subscription', requireSuperAdmin, billingController.updateTenantSubscription);

// ==================== PLAN MANAGEMENT ROUTES (SUPER ADMIN) ====================

// Get all plans (including inactive)
router.get('/admin/plans', requireSuperAdmin, planManagementController.getAllPlans);

// Get plan by code
router.get('/admin/plans/:planCode', requireSuperAdmin, planManagementController.getPlanByCode);

// Create new plan
router.post(
  '/admin/plans',
  requireSuperAdmin,
  [
    body('planCode').notEmpty().withMessage('Plan code is required'),
    body('displayName').notEmpty().withMessage('Display name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('pricing').isObject().withMessage('Pricing object is required'),
    body('limits').isObject().withMessage('Limits object is required'),
    body('features').isArray().withMessage('Features must be an array'),
  ],
  validate,
  planManagementController.createPlan
);

// Update plan
router.put('/admin/plans/:planCode', requireSuperAdmin, planManagementController.updatePlan);

// Update plan limits only
router.patch('/admin/plans/:planCode/limits', requireSuperAdmin, planManagementController.updatePlanLimits);

// Update plan features only
router.patch('/admin/plans/:planCode/features', requireSuperAdmin, planManagementController.updatePlanFeatures);

// Delete/deactivate plan
router.delete('/admin/plans/:planCode', requireSuperAdmin, planManagementController.deletePlan);

// ==================== WEBHOOK ROUTES ====================

// Razorpay webhook endpoint
router.post('/webhooks/razorpay', webhookController.handleRazorpayWebhook);

export default router;
