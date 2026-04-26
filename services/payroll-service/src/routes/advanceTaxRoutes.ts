import { Router } from 'express';
import * as advanceTaxController from '../controllers/advanceTaxController';

const router = Router();

// ==================== SCHEDULE MANAGEMENT ====================

// Create advance tax schedule for employee
router.post('/:tenantId/employees/:employeeId/schedule', advanceTaxController.createSchedule);

// Get all schedules for employee
router.get('/:tenantId/employees/:employeeId/schedules', advanceTaxController.getEmployeeSchedulesList);

// Get specific schedule
router.get('/schedule/:scheduleId', advanceTaxController.getSchedule);

// Update schedule estimates
router.put('/schedule/:scheduleId/estimates', advanceTaxController.updateEstimates);

// ==================== PAYMENT MANAGEMENT ====================

// Initiate payment for quarter
router.post('/schedule/:scheduleId/pay/:quarter', advanceTaxController.initiatePayment);

// Verify Razorpay payment
router.post('/payment/:paymentId/verify', advanceTaxController.verifyPayment);

// Record manual payment
router.post('/schedule/:scheduleId/manual-payment/:quarter', advanceTaxController.recordManualPaymentEntry);

// Get payment history
router.get('/schedule/:scheduleId/payments', advanceTaxController.getPayments);

// ==================== RAZORPAY WEBHOOK ====================

// Razorpay webhook handler
router.post('/webhook/razorpay', advanceTaxController.handleRazorpayWebhook);

// ==================== RECONCILIATION ====================

// Reconcile advance tax with actual liability
router.post('/schedule/:scheduleId/reconcile', advanceTaxController.reconcile);

// Calculate interest under Section 234C
router.get('/schedule/:scheduleId/interest', advanceTaxController.calculateInterest);

// ==================== REMINDERS ====================

// Configure reminders for schedule
router.put('/schedule/:scheduleId/reminders', advanceTaxController.configureReminders);

// Get upcoming due dates for tenant
router.get('/:tenantId/upcoming-dues', advanceTaxController.getUpcomingDues);

// Get due/overdue advance taxes
router.get('/:tenantId/due-taxes', advanceTaxController.getDueTaxes);

// ==================== DASHBOARD STATS ====================

// Get advance tax statistics for tenant
router.get('/:tenantId/stats', advanceTaxController.getAdvanceTaxStats);

export default router;
