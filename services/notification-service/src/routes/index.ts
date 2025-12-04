import { Router } from 'express';
import { body, query } from 'express-validator';
import * as notificationController from '../controllers/notificationController';

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

// Create notification
router.post(
  '/',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('category').notEmpty().withMessage('Category is required'),
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

export default router;
