import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  createAdvanceTaxSchedule,
  getAdvanceTaxSchedule,
  getEmployeeSchedules,
  updateScheduleEstimates,
  initiateAdvanceTaxPayment,
  verifyAdvanceTaxPayment,
  recordManualPayment,
  getPaymentHistory,
  reconcileAdvanceTax,
  calculateInterest234C,
  updateReminderSettings,
  getUpcomingDueDates,
  getDueAdvanceTaxes
} from '../services/advanceTaxService';
import AdvanceTaxSchedule from '../models/AdvanceTaxSchedule';
import AdvanceTaxPayment from '../models/AdvanceTaxPayment';
import { IIncomeBreakdown, IDeductionsBreakdown } from '../models/AdvanceTaxSchedule';

// ================= Schedule Management =================

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const {
      financialYear,
      incomeBreakdown,
      deductionsBreakdown,
      regime = 'new',
      estimatedTDSByEmployer = 0,
      createdBy = 'system'
    } = req.body;

    // Build income breakdown with defaults
    const income: IIncomeBreakdown = {
      salary: incomeBreakdown?.salary || 0,
      houseProperty: incomeBreakdown?.houseProperty || 0,
      capitalGains: {
        shortTerm: incomeBreakdown?.capitalGains?.shortTerm || 0,
        longTerm: incomeBreakdown?.capitalGains?.longTerm || 0
      },
      businessIncome: incomeBreakdown?.businessIncome || 0,
      otherSources: incomeBreakdown?.otherSources || 0
    };

    // Build deductions breakdown with defaults
    const deductions: IDeductionsBreakdown = {
      section80C: deductionsBreakdown?.section80C || 0,
      section80D: deductionsBreakdown?.section80D || 0,
      section80CCD: deductionsBreakdown?.section80CCD || 0,
      section80E: deductionsBreakdown?.section80E || 0,
      section80G: deductionsBreakdown?.section80G || 0,
      section80TTA_TTB: deductionsBreakdown?.section80TTA_TTB || 0,
      section24: deductionsBreakdown?.section24 || 0,
      standardDeduction: deductionsBreakdown?.standardDeduction || 50000,
      other: deductionsBreakdown?.other || 0
    };

    const schedule = await createAdvanceTaxSchedule(
      tenantId,
      employeeId,
      financialYear,
      income,
      deductions,
      regime,
      estimatedTDSByEmployer,
      createdBy
    );

    res.status(201).json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create advance tax schedule', error: error.message });
  }
};

export const getSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await getAdvanceTaxSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch schedule', error: error.message });
  }
};

export const getEmployeeSchedulesList = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { financialYear } = req.query;

    const schedules = await getEmployeeSchedules(tenantId, employeeId, financialYear as string);
    res.json({ success: true, data: schedules });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch schedules', error: error.message });
  }
};

export const updateEstimates = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const {
      incomeBreakdown,
      deductionsBreakdown,
      regime,
      estimatedTDSByEmployer,
      updatedBy = 'system'
    } = req.body;

    const schedule = await updateScheduleEstimates(
      scheduleId,
      incomeBreakdown,
      deductionsBreakdown,
      regime,
      estimatedTDSByEmployer,
      updatedBy
    );
    res.json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update estimates', error: error.message });
  }
};

// ================= Payment Management =================

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { scheduleId, quarter } = req.params;
    const { amount, paymentMethod = 'razorpay' } = req.body;

    const payment = await initiateAdvanceTaxPayment(
      scheduleId,
      parseInt(quarter) as 1 | 2 | 3 | 4,
      amount,
      paymentMethod
    );

    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to initiate payment', error: error.message });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const payment = await verifyAdvanceTaxPayment(
      paymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
};

export const recordManualPaymentEntry = async (req: Request, res: Response) => {
  try {
    const { scheduleId, quarter } = req.params;
    const {
      amount,
      challanNumber,
      bsrCode,
      depositDate,
      acknowledgementNumber,
      acknowledgementDate,
      createdBy = 'system'
    } = req.body;

    const payment = await recordManualPayment(
      scheduleId,
      parseInt(quarter) as 1 | 2 | 3 | 4,
      amount,
      {
        challanNumber,
        bsrCode,
        depositDate: depositDate ? new Date(depositDate) : undefined
      },
      acknowledgementNumber ? {
        number: acknowledgementNumber,
        date: acknowledgementDate ? new Date(acknowledgementDate) : new Date()
      } : undefined,
      createdBy
    );

    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to record manual payment', error: error.message });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { quarter } = req.query;

    const payments = await getPaymentHistory(
      scheduleId,
      quarter ? parseInt(quarter as string) as 1 | 2 | 3 | 4 : undefined
    );

    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments', error: error.message });
  }
};

// ================= Razorpay Webhook =================

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return res.status(500).json({ success: false, message: 'Webhook not configured' });
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const razorpayPaymentId = payload.payment.entity.id;
      const razorpayOrderId = payload.payment.entity.order_id;

      // Find the payment by Razorpay order ID
      const payment = await AdvanceTaxPayment.findOne({
        'razorpay.orderId': razorpayOrderId
      });

      if (payment && payment.status !== 'completed') {
        payment.razorpay = {
          ...payment.razorpay,
          orderId: payment.razorpay?.orderId || razorpayOrderId,
          paymentId: razorpayPaymentId,
          status: 'paid'
        };
        payment.status = 'completed';
        await payment.save();

        // Update the schedule
        const schedule = await AdvanceTaxSchedule.findById(payment.scheduleId);
        if (schedule) {
          const installment = schedule.installments.find(i => i.quarter === payment.quarter);
          if (installment) {
            installment.paidAmount += payment.amount;
            installment.paymentIds.push(payment._id.toString());
            installment.status = installment.paidAmount >= installment.estimatedAmount ? 'paid' : 'partially_paid';
          }
          await schedule.save();
        }
      }
    } else if (event === 'payment.failed') {
      const razorpayOrderId = payload.payment.entity.order_id;

      const payment = await AdvanceTaxPayment.findOne({
        'razorpay.orderId': razorpayOrderId
      });

      if (payment) {
        payment.status = 'failed';
        payment.razorpay = {
          ...payment.razorpay,
          orderId: payment.razorpay?.orderId || razorpayOrderId,
          status: 'failed'
        };
        await payment.save();
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error: error.message });
  }
};

// ================= Reconciliation =================

export const reconcile = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { actualTaxLiability, reconciledBy = 'system' } = req.body;

    const schedule = await reconcileAdvanceTax(scheduleId, actualTaxLiability, reconciledBy);
    res.json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reconcile', error: error.message });
  }
};

export const calculateInterest = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;

    const interest = await calculateInterest234C(scheduleId);
    res.json({ success: true, data: interest });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to calculate interest', error: error.message });
  }
};

// ================= Reminders =================

export const configureReminders = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { enabled, daysBefore, notificationChannels } = req.body;

    const schedule = await updateReminderSettings(scheduleId, {
      enabled,
      daysBefore,
      notificationChannels
    });

    res.json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update reminders', error: error.message });
  }
};

export const getUpcomingDues = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { daysAhead } = req.query;

    const upcomingDues = await getUpcomingDueDates(
      tenantId,
      daysAhead ? parseInt(daysAhead as string) : 30
    );

    res.json({ success: true, data: upcomingDues });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming dues', error: error.message });
  }
};

export const getDueTaxes = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const dueTaxes = await getDueAdvanceTaxes(tenantId);
    res.json({ success: true, data: dueTaxes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch due taxes', error: error.message });
  }
};

// ================= Dashboard Stats =================

export const getAdvanceTaxStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { financialYear } = req.query;

    const schedules = await AdvanceTaxSchedule.find({
      tenantId,
      financialYear: financialYear || '2024-2025',
      status: 'active'
    });

    const stats = {
      totalSchedules: schedules.length,
      totalEstimatedTax: schedules.reduce((sum, s) => sum + s.estimatedTotalTax, 0),
      totalPaid: 0,
      pendingAmount: 0,
      overdueCount: 0,
      upcomingCount: 0
    };

    schedules.forEach(schedule => {
      schedule.installments.forEach(installment => {
        stats.totalPaid += installment.paidAmount;
        if (installment.status === 'overdue') {
          stats.overdueCount++;
          stats.pendingAmount += installment.estimatedAmount - installment.paidAmount;
        } else if (installment.status === 'due' || installment.status === 'upcoming') {
          stats.upcomingCount++;
          stats.pendingAmount += installment.estimatedAmount - installment.paidAmount;
        }
      });
    });

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
};

export default {
  createSchedule,
  getSchedule,
  getEmployeeSchedulesList,
  updateEstimates,
  initiatePayment,
  verifyPayment,
  recordManualPaymentEntry,
  getPayments,
  handleRazorpayWebhook,
  reconcile,
  calculateInterest,
  configureReminders,
  getUpcomingDues,
  getDueTaxes,
  getAdvanceTaxStats
};
