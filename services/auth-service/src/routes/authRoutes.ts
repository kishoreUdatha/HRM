import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  changePassword,
  getUsersByTenant,
} from '../controllers/authController';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  getUserStats,
  bulkUpdateUsers,
} from '../controllers/userManagementController';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  getUserActivity,
  exportAuditLogs,
} from '../controllers/auditController';
import * as securityController from '../controllers/securityController';
import { requireAdmin, requireHROrAdmin } from '../middleware/authorize';

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
const registerValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('tenantId').notEmpty().withMessage('Tenant ID is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

// Protected routes (auth verified by gateway)
router.get('/me', getCurrentUser);
router.post('/change-password', changePasswordValidation, validate, changePassword);
router.get('/users', getUsersByTenant);

// ==================== ADMIN USER MANAGEMENT ROUTES ====================
const createUserValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['tenant_admin', 'hr', 'manager', 'employee']).withMessage('Invalid role'),
];

// User management (admin only)
router.get('/admin/users', requireAdmin, getUsers);
router.get('/admin/users/stats', requireAdmin, getUserStats);
router.get('/admin/users/:id', requireAdmin, getUserById);
router.post('/admin/users', requireAdmin, createUserValidation, validate, createUser);
router.put('/admin/users/:id', requireAdmin, updateUser);
router.put('/admin/users/:id/role', requireAdmin, updateUserRole);
router.put('/admin/users/:id/status', requireAdmin, updateUserStatus);
router.post('/admin/users/:id/reset-password', requireAdmin, resetUserPassword);
router.delete('/admin/users/:id', requireAdmin, deleteUser);
router.post('/admin/users/bulk', requireAdmin, bulkUpdateUsers);

// ==================== AUDIT LOG ROUTES ====================
router.get('/admin/audit-logs', requireAdmin, getAuditLogs);
router.get('/admin/audit-logs/stats', requireAdmin, getAuditStats);
router.get('/admin/audit-logs/export', requireAdmin, exportAuditLogs);
router.get('/admin/audit-logs/:id', requireAdmin, getAuditLogById);
router.get('/admin/audit-logs/user/:userId', requireAdmin, getUserActivity);

// ==================== 2FA ROUTES ====================
router.post('/2fa/setup', securityController.setup2FA);
router.post('/2fa/verify', securityController.verify2FA);
router.post('/2fa/disable', securityController.disable2FA);
router.get('/2fa/status', securityController.get2FAStatus);

// ==================== SSO CONFIGURATION ROUTES ====================
router.post('/admin/sso', requireAdmin, securityController.createSSOConfiguration);
router.get('/admin/sso', requireAdmin, securityController.getSSOConfigurations);
router.put('/admin/sso/:ssoId', requireAdmin, securityController.updateSSOConfiguration);
router.delete('/admin/sso/:ssoId', requireAdmin, securityController.deleteSSOConfiguration);

// ==================== SECURITY SETTINGS ROUTES ====================
router.get('/admin/security-settings', requireAdmin, securityController.getSecuritySettings);
router.put('/admin/security-settings', requireAdmin, securityController.updateSecuritySettings);
router.post('/security/check-ip', securityController.checkIPAccess);

// ==================== GDPR ROUTES ====================
router.post('/gdpr/request', securityController.createGDPRRequest);
router.get('/gdpr/requests', requireAdmin, securityController.getGDPRRequests);
router.post('/gdpr/requests/:requestId/process', requireAdmin, securityController.processGDPRRequest);
router.get('/gdpr/export', securityController.exportUserData);

export default router;
