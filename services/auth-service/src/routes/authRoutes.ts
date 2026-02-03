import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  loginWithMobile,
  logout,
  refreshToken,
  getCurrentUser,
  changePassword,
  setMobileCredentials,
  getUsersByTenant,
  registerDeviceToken,
  removeDeviceToken,
  getUsersWithFCMTokens,
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
import * as superAdminController from '../controllers/superAdminController';
import * as roleManagementController from '../controllers/roleManagementController';
import { requireAdmin, requireHROrAdmin, requireSuperAdmin } from '../middleware/authorize';

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

const mobileLoginValidation = [
  body('mobileNumber').matches(/^\d{10}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const setMobileCredentialsValidation = [
  body('mobileNumber').optional().matches(/^\d{10}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('pin').optional().matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
];

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/login/mobile', mobileLoginValidation, validate, loginWithMobile);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

// Protected routes (auth verified by gateway)
router.get('/me', getCurrentUser);
router.get('/profile', getCurrentUser); // Alias for /me
router.post('/change-password', changePasswordValidation, validate, changePassword);
router.post('/set-mobile-credentials', setMobileCredentialsValidation, validate, setMobileCredentials);
router.get('/users', getUsersByTenant);

// FCM Device Token routes (for push notifications)
router.post('/device-token', registerDeviceToken);
router.delete('/device-token', removeDeviceToken);

// Internal API for notification service to get users with FCM tokens
router.post('/internal/users-with-fcm-tokens', getUsersWithFCMTokens);

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

// ==================== ROLE MANAGEMENT ROUTES ====================
router.get('/admin/roles', requireAdmin, roleManagementController.getRoles);
router.get('/admin/roles/:roleName', requireAdmin, roleManagementController.getRoleByName);
router.put('/admin/roles/:roleName/permissions', requireAdmin, roleManagementController.updateRolePermissions);
router.post('/admin/roles/:roleName/reset', requireAdmin, roleManagementController.resetRoleToDefault);

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

// ==================== SUPER ADMIN ROUTES ====================
// Public super admin routes
router.post('/super-admin/login', loginValidation, validate, superAdminController.superAdminLogin);
router.post('/super-admin/setup', superAdminController.createSuperAdmin);
router.post('/super-admin/refresh', superAdminController.refreshSuperAdminToken);

// Protected super admin routes (requires super_admin role)
router.get('/super-admin/me', requireSuperAdmin, superAdminController.getSuperAdminProfile);
router.get('/super-admin/list', requireSuperAdmin, superAdminController.listSuperAdmins);
router.post('/super-admin/add', requireSuperAdmin, superAdminController.addSuperAdmin);
router.put('/super-admin/:id/status', requireSuperAdmin, superAdminController.updateSuperAdminStatus);
router.get('/super-admin/platform-stats', requireSuperAdmin, superAdminController.getPlatformUserStats);

export default router;
