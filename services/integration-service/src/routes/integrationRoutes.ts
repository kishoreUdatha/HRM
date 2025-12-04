import { Router } from 'express';
import * as integrationController from '../controllers/integrationController';

const router = Router();

// Webhook routes
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

// API Key routes
router.post('/api-keys', integrationController.createAPIKey);
router.get('/api-keys', integrationController.getAPIKeys);
router.delete('/api-keys/:keyId', integrationController.revokeAPIKey);

// Integration routes
router.post('/integrations', integrationController.createIntegration);
router.get('/integrations', integrationController.getIntegrations);
router.put('/integrations/:integrationId', integrationController.updateIntegration);
router.delete('/integrations/:integrationId', integrationController.deleteIntegration);
router.post('/integrations/:integrationId/test', integrationController.testIntegration);

// SSO routes
router.post('/sso', integrationController.createSSOConfig);
router.get('/sso', integrationController.getSSOConfigs);
router.get('/sso/metadata', integrationController.getSSOMetadata);
router.get('/sso/:configId', integrationController.getSSOConfig);
router.put('/sso/:configId', integrationController.updateSSOConfig);
router.delete('/sso/:configId', integrationController.deleteSSOConfig);
router.post('/sso/:configId/toggle', integrationController.toggleSSOConfig);
router.post('/sso/:configId/set-default', integrationController.setDefaultSSOConfig);

// Calendar sync routes
router.post('/calendar/connect', integrationController.connectCalendar);
router.get('/calendar/employee/:employeeId', integrationController.getCalendarConnections);
router.put('/calendar/:connectionId', integrationController.updateCalendarSettings);
router.delete('/calendar/:connectionId', integrationController.disconnectCalendar);
router.post('/calendar/:connectionId/sync', integrationController.syncCalendar);

export default router;
