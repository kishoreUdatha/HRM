import { Router } from 'express';
import * as integrationController from '../controllers/integrationController';
import * as adminAPIKeyController from '../controllers/adminAPIKeyController';

const router = Router();

// ==================== ADMIN API KEY ROUTES (Super Admin Only) ====================
// These routes are for super admins to manage API keys for any tenant

// API Key management
router.get('/admin/api-keys/scopes', adminAPIKeyController.getAvailableScopes);
router.post('/admin/api-keys', adminAPIKeyController.createAPIKeyForTenant);
router.get('/admin/api-keys', adminAPIKeyController.listAllAPIKeys);
router.get('/admin/api-keys/:keyId', adminAPIKeyController.getAPIKeyDetails);
router.delete('/admin/api-keys/:keyId', adminAPIKeyController.revokeAPIKey);
router.get('/admin/api-keys/:keyId/usage', adminAPIKeyController.getAPIKeyUsage);

// Tenant API Configuration
router.get('/admin/tenant-configs', adminAPIKeyController.listTenantAPIConfigs);
router.get('/admin/tenant-config/:tenantId', adminAPIKeyController.getTenantAPIConfig);
router.put('/admin/tenant-config/:tenantId', adminAPIKeyController.updateTenantAPIConfig);
router.delete('/admin/tenant-config/:tenantId', adminAPIKeyController.deleteTenantAPIConfig);

// ==================== INTERNAL ROUTES (API Gateway Only) ====================
// These routes are for internal use by the API Gateway

router.post('/internal/api-keys/validate', adminAPIKeyController.validateAPIKey);
router.post('/internal/api-keys/log', adminAPIKeyController.logAPIKeyUsage);

// ==================== WEBHOOK ROUTES ====================

router.post('/webhooks', integrationController.createWebhook);
router.get('/webhooks', integrationController.getWebhooks);
router.get('/webhooks/events', integrationController.getWebhookEvents);
router.get('/webhooks/:webhookId', integrationController.getWebhook);
router.put('/webhooks/:webhookId', integrationController.updateWebhook);
router.delete('/webhooks/:webhookId', integrationController.deleteWebhook);
router.post('/webhooks/:webhookId/regenerate-secret', integrationController.regenerateWebhookSecret);
router.post('/webhooks/:webhookId/test', integrationController.testWebhook);
router.get('/webhooks/:webhookId/deliveries', integrationController.getWebhookDeliveries);
router.post('/deliveries/:deliveryId/retry', integrationController.retryDelivery);

// ==================== TENANT API KEY ROUTES ====================
// These routes are for tenant admins to manage their own API keys

router.post('/api-keys', integrationController.createAPIKey);
router.get('/api-keys', integrationController.getAPIKeys);
router.delete('/api-keys/:keyId', integrationController.revokeAPIKey);

// ==================== INTEGRATION ROUTES ====================

router.post('/integrations', integrationController.createIntegration);
router.get('/integrations', integrationController.getIntegrations);
router.put('/integrations/:integrationId', integrationController.updateIntegration);
router.delete('/integrations/:integrationId', integrationController.deleteIntegration);
router.post('/integrations/:integrationId/test', integrationController.testIntegration);

// ==================== SSO ROUTES ====================

router.post('/sso', integrationController.createSSOConfig);
router.get('/sso', integrationController.getSSOConfigs);
router.get('/sso/metadata', integrationController.getSSOMetadata);
router.get('/sso/:configId', integrationController.getSSOConfig);
router.put('/sso/:configId', integrationController.updateSSOConfig);
router.delete('/sso/:configId', integrationController.deleteSSOConfig);
router.post('/sso/:configId/toggle', integrationController.toggleSSOConfig);
router.post('/sso/:configId/set-default', integrationController.setDefaultSSOConfig);

// ==================== CALENDAR SYNC ROUTES ====================

router.post('/calendar/connect', integrationController.connectCalendar);
router.get('/calendar/employee/:employeeId', integrationController.getCalendarConnections);
router.put('/calendar/:connectionId', integrationController.updateCalendarSettings);
router.delete('/calendar/:connectionId', integrationController.disconnectCalendar);
router.post('/calendar/:connectionId/sync', integrationController.syncCalendar);

export default router;
