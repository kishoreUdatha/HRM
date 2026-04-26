import mongoose from 'mongoose';
import PayoutConfig from '../models/PayoutConfig';
import PayoutBatch from '../models/PayoutBatch';
import Payout from '../models/Payout';
import EmployeeFundAccount from '../models/EmployeeFundAccount';
import PayoutAuditLog from '../models/PayoutAuditLog';
import razorpayPayoutService from './razorpayPayoutService';
import { publishEvent } from './rabbitmqService';
import { generateReferenceId } from '../utils/encryption';
import axios from 'axios';

interface PayrollData {
  _id: string;
  employeeId: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    email: string;
  };
  netSalary: number;
  month: number;
  year: number;
}

interface AutomaticPayoutParams {
  tenantId: string;
  payrollBatchId: string;
  month: number;
  year: number;
  payrollIds: string[];
}

/**
 * Process automatic payout when payroll batch is processed
 */
export const processAutomaticPayout = async (params: AutomaticPayoutParams): Promise<void> => {
  const { tenantId, payrollBatchId, month, year, payrollIds } = params;

  try {
    // Check if automatic payout is enabled for this tenant
    const config = await PayoutConfig.findOne({ tenantId, isActive: true });

    if (!config || config.payoutMode !== 'automatic') {
      console.log(`Automatic payout not enabled for tenant: ${tenantId}`);
      return;
    }

    console.log(`Initiating automatic payout for tenant: ${tenantId}, batch: ${payrollBatchId}`);

    // Fetch payroll data from payroll service
    const payrollServiceUrl = process.env.PAYROLL_SERVICE_URL || 'http://localhost:3006';
    const payrollResponse = await axios.get(`${payrollServiceUrl}/api/payroll/batch/${payrollBatchId}`, {
      headers: { 'x-tenant-id': tenantId },
    });

    const payrolls: PayrollData[] = payrollResponse.data.data?.payrolls || [];

    if (payrolls.length === 0) {
      console.log('No payrolls found for batch:', payrollBatchId);
      return;
    }

    // Create payout batch
    const batch = await createPayoutBatch({
      tenantId,
      payrollBatchId,
      month,
      year,
      payrolls,
      initiatedBy: new mongoose.Types.ObjectId(), // System initiated
    });

    // If approval is required, stop here
    if (config.requireApproval) {
      console.log(`Payout batch ${batch.batchNumber} created and pending approval`);

      // Notify approvers
      await publishEvent('payout.batch.pending_approval', {
        tenantId,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        totalAmount: batch.totalAmount,
        totalEmployees: batch.totalEmployees,
      });

      return;
    }

    // Process payouts immediately if no approval required
    await processPayoutBatch(tenantId, batch._id.toString(), new mongoose.Types.ObjectId());

  } catch (error) {
    console.error('Error processing automatic payout:', error);
    throw error;
  }
};

/**
 * Create a payout batch from processed payrolls
 */
export const createPayoutBatch = async (params: {
  tenantId: string;
  payrollBatchId?: string;
  month: number;
  year: number;
  payrolls: PayrollData[];
  initiatedBy: mongoose.Types.ObjectId;
}): Promise<typeof PayoutBatch.prototype> => {
  const { tenantId, payrollBatchId, month, year, payrolls, initiatedBy } = params;

  const config = await PayoutConfig.findOne({ tenantId, isActive: true });
  if (!config) {
    throw new Error('Payout configuration not found');
  }

  // Calculate total amount (convert to paise)
  const totalAmount = payrolls.reduce((sum, p) => sum + (p.netSalary * 100), 0);

  // Create batch
  const batch = new PayoutBatch({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    payrollBatchId: payrollBatchId ? new mongoose.Types.ObjectId(payrollBatchId) : undefined,
    month,
    year,
    totalAmount,
    totalEmployees: payrolls.length,
    pendingPayouts: payrolls.length,
    status: config.requireApproval ? 'pending_approval' : 'draft',
    initiatedBy,
  });

  await batch.save();

  // Create individual payout records
  for (const payroll of payrolls) {
    try {
      // Get employee's fund account
      const fundAccount = await EmployeeFundAccount.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        employeeId: new mongoose.Types.ObjectId(payroll.employeeId),
        isActive: true,
        verificationStatus: 'verified',
      });

      if (!fundAccount) {
        batch.errors.push({
          employeeId: payroll.employeeId,
          employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          error: 'No verified fund account found',
          timestamp: new Date(),
        });
        batch.failedPayouts += 1;
        batch.pendingPayouts -= 1;
        continue;
      }

      const amount = payroll.netSalary * 100; // Convert to paise
      const payoutMethod = razorpayPayoutService.determinePayoutMethod(amount, config);

      const payout = new Payout({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        batchId: batch._id,
        payrollId: new mongoose.Types.ObjectId(payroll._id),
        employeeId: new mongoose.Types.ObjectId(payroll.employeeId),
        fundAccountId: fundAccount._id,
        employee: {
          firstName: payroll.employee.firstName,
          lastName: payroll.employee.lastName,
          employeeCode: payroll.employee.employeeCode,
          email: payroll.employee.email,
        },
        bankDetails: {
          bankName: fundAccount.bankName,
          accountNumber: fundAccount.accountNumber,
          ifscCode: fundAccount.ifscCode,
          accountHolderName: fundAccount.accountHolderName,
        },
        amount,
        currency: 'INR',
        payoutMethod,
        purpose: 'salary',
        narration: `Salary ${month}/${year}`,
        status: 'pending',
      });

      await payout.save();

    } catch (error: any) {
      batch.errors.push({
        employeeId: payroll.employeeId,
        employeeName: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        error: error.message || 'Failed to create payout record',
        timestamp: new Date(),
      });
      batch.failedPayouts += 1;
      batch.pendingPayouts -= 1;
    }
  }

  await batch.save();

  // Create audit log
  await PayoutAuditLog.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    batchId: batch._id,
    action: 'batch_created',
    performedBy: initiatedBy,
    newStatus: batch.status,
    details: {
      totalEmployees: batch.totalEmployees,
      totalAmount: batch.totalAmount,
      failedToCreate: batch.failedPayouts,
    },
  });

  return batch;
};

/**
 * Process all payouts in a batch
 */
export const processPayoutBatch = async (
  tenantId: string,
  batchId: string,
  processedBy: mongoose.Types.ObjectId
): Promise<void> => {
  const batch = await PayoutBatch.findOne({
    _id: batchId,
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!batch) {
    throw new Error('Payout batch not found');
  }

  if (!['draft', 'approved'].includes(batch.status)) {
    throw new Error(`Cannot process batch with status: ${batch.status}`);
  }

  // Update batch status
  const previousStatus = batch.status;
  batch.status = 'processing';
  batch.initiatedAt = new Date();
  await batch.save();

  // Create audit log
  await PayoutAuditLog.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    batchId: batch._id,
    action: 'batch_processing',
    performedBy: processedBy,
    previousStatus,
    newStatus: 'processing',
  });

  // Get all pending payouts for this batch
  const payouts = await Payout.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    batchId: batch._id,
    status: 'pending',
  });

  console.log(`Processing ${payouts.length} payouts for batch ${batch.batchNumber}`);

  // Process each payout
  for (const payout of payouts) {
    try {
      await processSinglePayout(tenantId, payout, processedBy);
    } catch (error: any) {
      console.error(`Failed to process payout for employee ${payout.employee.employeeCode}:`, error);

      payout.status = 'failed';
      payout.failedAt = new Date();
      payout.failureReason = error.message || 'Unknown error';
      await payout.save();

      batch.failedPayouts += 1;
      batch.pendingPayouts -= 1;
      batch.errors.push({
        employeeId: payout.employeeId.toString(),
        employeeName: `${payout.employee.firstName} ${payout.employee.lastName}`,
        error: error.message || 'Payout processing failed',
        timestamp: new Date(),
      });
    }
  }

  // Update batch status based on results
  await updateBatchStatus(batch);
};

/**
 * Process a single payout
 */
export const processSinglePayout = async (
  tenantId: string,
  payout: typeof Payout.prototype,
  processedBy: mongoose.Types.ObjectId
): Promise<void> => {
  // Get fund account
  const fundAccount = await EmployeeFundAccount.findById(payout.fundAccountId);
  if (!fundAccount) {
    throw new Error('Fund account not found');
  }

  // Generate reference ID
  const referenceId = generateReferenceId('SAL');

  // Create payout via Razorpay
  const razorpayPayout = await razorpayPayoutService.createPayout(tenantId, {
    fundAccountId: fundAccount.razorpayFundAccountId,
    amount: payout.amount,
    currency: payout.currency,
    mode: payout.payoutMethod,
    purpose: payout.purpose,
    referenceId,
    narration: payout.narration,
    notes: {
      employeeId: payout.employeeId.toString(),
      payrollId: payout.payrollId.toString(),
      payoutId: payout._id.toString(),
    },
  });

  // Update payout record
  payout.razorpayPayoutId = razorpayPayout.id;
  payout.razorpayStatus = razorpayPayout.status as any;
  payout.status = 'initiated';
  payout.initiatedAt = new Date();

  if (razorpayPayout.utr) {
    payout.utr = razorpayPayout.utr;
  }

  await payout.save();

  // Create audit log
  await PayoutAuditLog.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    payoutId: payout._id,
    batchId: payout.batchId,
    action: 'payout_initiated',
    performedBy: processedBy,
    previousStatus: 'pending',
    newStatus: 'initiated',
    details: {
      razorpayPayoutId: razorpayPayout.id,
      amount: payout.amount,
      mode: payout.payoutMethod,
    },
  });
};

/**
 * Update batch status based on payout results
 */
const updateBatchStatus = async (batch: typeof PayoutBatch.prototype): Promise<void> => {
  // Recount statuses from payouts
  const counts = await Payout.aggregate([
    { $match: { batchId: batch._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statusMap: Record<string, number> = {};
  counts.forEach((c) => {
    statusMap[c._id] = c.count;
  });

  batch.successfulPayouts = statusMap['completed'] || 0;
  batch.failedPayouts = statusMap['failed'] || 0;
  batch.pendingPayouts = (statusMap['pending'] || 0) + (statusMap['initiated'] || 0) + (statusMap['processing'] || 0);

  // Determine overall batch status
  if (batch.pendingPayouts === 0) {
    if (batch.failedPayouts === 0) {
      batch.status = 'completed';
    } else if (batch.successfulPayouts === 0) {
      batch.status = 'failed';
    } else {
      batch.status = 'partial';
    }
    batch.completedAt = new Date();
  }

  await batch.save();

  // Publish completion event
  if (['completed', 'partial', 'failed'].includes(batch.status)) {
    await publishEvent('payout.batch.completed', {
      tenantId: batch.tenantId,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      status: batch.status,
      successfulPayouts: batch.successfulPayouts,
      failedPayouts: batch.failedPayouts,
    });
  }
};

/**
 * Retry a failed payout
 */
export const retryPayout = async (
  tenantId: string,
  payoutId: string,
  retriedBy: mongoose.Types.ObjectId
): Promise<void> => {
  const payout = await Payout.findOne({
    _id: payoutId,
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.status !== 'failed') {
    throw new Error('Can only retry failed payouts');
  }

  if (payout.retryCount >= 3) {
    throw new Error('Maximum retry attempts exceeded');
  }

  // Reset status and retry
  payout.status = 'pending';
  payout.failureReason = undefined;
  payout.retryCount += 1;
  payout.lastRetryAt = new Date();
  await payout.save();

  // Create audit log
  await PayoutAuditLog.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    payoutId: payout._id,
    batchId: payout.batchId,
    action: 'payout_retry',
    performedBy: retriedBy,
    previousStatus: 'failed',
    newStatus: 'pending',
    details: {
      retryCount: payout.retryCount,
    },
  });

  // Process the payout
  await processSinglePayout(tenantId, payout, retriedBy);
};

/**
 * Handle webhook payout status update
 */
export const handlePayoutStatusUpdate = async (
  tenantId: string,
  razorpayPayoutId: string,
  status: string,
  utr?: string,
  failureReason?: string
): Promise<void> => {
  const payout = await Payout.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    razorpayPayoutId,
  });

  if (!payout) {
    console.warn(`Payout not found for Razorpay ID: ${razorpayPayoutId}`);
    return;
  }

  const previousStatus = payout.status;
  payout.razorpayStatus = status as any;

  // Map Razorpay status to our status
  switch (status) {
    case 'processed':
      payout.status = 'completed';
      payout.processedAt = new Date();
      if (utr) payout.utr = utr;
      break;

    case 'reversed':
      payout.status = 'reversed';
      break;

    case 'rejected':
    case 'cancelled':
      payout.status = 'failed';
      payout.failedAt = new Date();
      payout.failureReason = failureReason || `Payout ${status}`;
      break;

    case 'processing':
    case 'pending':
      payout.status = 'processing';
      break;

    case 'queued':
      payout.status = 'initiated';
      break;
  }

  await payout.save();

  // Create audit log
  await PayoutAuditLog.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    payoutId: payout._id,
    batchId: payout.batchId,
    action: `payout_${payout.status}` as any,
    performedBy: new mongoose.Types.ObjectId(), // System
    previousStatus,
    newStatus: payout.status,
    details: {
      razorpayStatus: status,
      utr,
      failureReason,
    },
  });

  // Update batch status if payout belongs to a batch
  if (payout.batchId) {
    const batch = await PayoutBatch.findById(payout.batchId);
    if (batch && batch.status === 'processing') {
      await updateBatchStatus(batch);
    }
  }

  // Send notification to employee if completed
  if (payout.status === 'completed') {
    await publishEvent('payout.completed', {
      tenantId,
      payoutId: payout._id,
      employeeId: payout.employeeId,
      amount: payout.amount,
      utr: payout.utr,
    });
  }
};
