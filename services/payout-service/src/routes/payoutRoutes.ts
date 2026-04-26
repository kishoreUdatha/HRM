import { Router } from 'express';
import * as configController from '../controllers/configController';
import * as fundAccountController from '../controllers/fundAccountController';
import * as payoutBatchController from '../controllers/payoutBatchController';
import * as payoutController from '../controllers/payoutController';
import * as webhookController from '../controllers/webhookController';

const router = Router();

// Configuration routes
router.get('/config', configController.getConfig);
router.post('/config', configController.upsertConfig);
router.patch('/config/credentials', configController.updateCredentials);
router.patch('/config/workflow', configController.updateWorkflow);
router.post('/config/test-connection', configController.testConnection);

// Fund Account routes
router.post('/fund-accounts', fundAccountController.createFundAccount);
router.get('/fund-accounts', fundAccountController.listFundAccounts);
router.get('/fund-accounts/:employeeId', fundAccountController.getFundAccountByEmployee);
router.post('/fund-accounts/:id/verify', fundAccountController.verifyFundAccount);
router.delete('/fund-accounts/:id', fundAccountController.deactivateFundAccount);
router.post('/fund-accounts/sync', fundAccountController.syncFromEmployees);

// Payout Batch routes
router.post('/batches', payoutBatchController.createBatch);
router.get('/batches', payoutBatchController.listBatches);
router.get('/batches/:id', payoutBatchController.getBatchDetails);
router.get('/batches/:id/summary', payoutBatchController.getBatchSummary);
router.post('/batches/:id/approve', payoutBatchController.approveBatch);
router.post('/batches/:id/reject', payoutBatchController.rejectBatch);
router.post('/batches/:id/process', payoutBatchController.processBatch);
router.post('/batches/:id/cancel', payoutBatchController.cancelBatch);

// Individual Payout routes
router.get('/', payoutController.listPayouts);
router.get('/stats', payoutController.getPayoutStats);
router.get('/employee/:employeeId', payoutController.getEmployeePayouts);
router.get('/:id', payoutController.getPayoutById);
router.post('/:id/retry', payoutController.retryPayoutHandler);
router.post('/:id/cancel', payoutController.cancelPayout);
router.post('/:id/sync-status', payoutController.syncPayoutStatus);

// Webhook routes (no auth required, signature verified internally)
router.post('/webhooks/razorpay', webhookController.handleWebhook);

export default router;
