import { Router } from 'express';
import { body, query } from 'express-validator';
import * as notificationController from '../controllers/notificationController';
import * as billingNotificationController from '../controllers/billingNotificationController';

const router = Router();

// ==================== NOTIFICATION ROUTES ====================

// Get notifications
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  notificationController.getNotifications
);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Create notification
router.post(
  '/',
  [
    body('userId').optional(),
    body('category').optional(),
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  notificationController.createNotification
);

// Send bulk notification
router.post('/bulk', notificationController.sendBulkNotification);

// Mark all as read
router.patch('/mark-all-read', notificationController.markAllAsRead);

// Mark as read
router.patch('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// ==================== EMAIL ROUTES ====================

// Send email
router.post(
  '/email/send',
  [
    body('to').isEmail().withMessage('Valid email is required'),
    body('subject').notEmpty().trim().withMessage('Subject is required'),
    body('body').notEmpty().withMessage('Body is required'),
  ],
  notificationController.sendEmail
);

// ==================== TEMPLATE ROUTES ====================

// Create template
router.post(
  '/templates',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().withMessage('Code is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('body').notEmpty().withMessage('Body is required'),
  ],
  notificationController.createTemplate
);

// Get templates
router.get('/templates', notificationController.getTemplates);

// Seed default templates
router.post('/templates/seed', notificationController.seedTemplates);

// Update template
router.put('/templates/:id', notificationController.updateTemplate);

// Delete template
router.delete('/templates/:id', notificationController.deleteTemplate);

// ==================== BILLING EMAIL ROUTES ====================

// Send payment success email
router.post(
  '/billing/payment-success',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('tenantName').notEmpty().withMessage('Tenant name is required'),
    body('planName').notEmpty().withMessage('Plan name is required'),
    body('amount').isNumeric().withMessage('Amount is required'),
  ],
  billingNotificationController.sendPaymentSuccess
);

// Send payment failed email
router.post(
  '/billing/payment-failed',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('tenantName').notEmpty().withMessage('Tenant name is required'),
    body('planName').notEmpty().withMessage('Plan name is required'),
    body('amount').isNumeric().withMessage('Amount is required'),
  ],
  billingNotificationController.sendPaymentFailed
);

// Send invoice generated email
router.post(
  '/billing/invoice-generated',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('tenantName').notEmpty().withMessage('Tenant name is required'),
    body('planName').notEmpty().withMessage('Plan name is required'),
    body('amount').isNumeric().withMessage('Amount is required'),
    body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
  ],
  billingNotificationController.sendInvoiceGenerated
);

// Send subscription activated email
router.post(
  '/billing/subscription-activated',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('tenantName').notEmpty().withMessage('Tenant name is required'),
    body('planName').notEmpty().withMessage('Plan name is required'),
    body('amount').isNumeric().withMessage('Amount is required'),
  ],
  billingNotificationController.sendSubscriptionActivated
);

// Send plan expiring email
router.post(
  '/billing/plan-expiring',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('tenantName').notEmpty().withMessage('Tenant name is required'),
    body('planName').notEmpty().withMessage('Plan name is required'),
    body('daysUntilExpiry').isNumeric().withMessage('Days until expiry is required'),
  ],
  billingNotificationController.sendPlanExpiring
);

// Send plan expired email
router.post(
  '/billing/plan-expired',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('tenantName').notEmpty().withMessage('Tenant name is required'),
    body('planName').notEmpty().withMessage('Plan name is required'),
  ],
  billingNotificationController.sendPlanExpired
);

// Send subscription cancelled email
router.post(
  '/billing/subscription-cancelled',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('tenantName').notEmpty().withMessage('Tenant name is required'),
    body('planName').notEmpty().withMessage('Plan name is required'),
  ],
  billingNotificationController.sendSubscriptionCancelled
);

export default router;
