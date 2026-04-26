import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PayoutBatch from '../models/PayoutBatch';
import Payout from '../models/Payout';
import PayoutConfig from '../models/PayoutConfig';
import PayoutAuditLog from '../models/PayoutAuditLog';
import { createPayoutBatch, processPayoutBatch } from '../services/payoutProcessingService';
import axios from 'axios';

/**
 * Create payout batch from processed payrolls
 */
export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { month, year, payrollBatchId, payrollIds } = req.body;

    if (!month || !year) {
      res.status(400).json({ success: false, message: 'Month and year are required' });
      return;
    }

    // Fetch payrolls from payroll service
    const payrollServiceUrl = process.env.PAYROLL_SERVICE_URL || 'http://localhost:3006';
    let payrolls;

    if (payrollBatchId) {
      const response = await axios.get(`${payrollServiceUrl}/api/payroll/batch/${payrollBatchId}`, {
        headers: { 'x-tenant-id': tenantId },
      });
      payrolls = response.data.data?.payrolls || [];
    } else if (payrollIds && payrollIds.length > 0) {
      const response = await axios.post(`${payrollServiceUrl}/api/payroll/by-ids`, {
        ids: payrollIds,
      }, {
        headers: { 'x-tenant-id': tenantId },
      });
      payrolls = response.data.data || [];
    } else {
      // Get all processed payrolls for the month
      const response = await axios.get(`${payrollServiceUrl}/api/payroll`, {
        headers: { 'x-tenant-id': tenantId },
        params: { month, year, status: 'processed', limit: 1000 },
      });
      payrolls = response.data.data?.payrolls || [];
    }

    if (payrolls.length === 0) {
      res.status(400).json({ success: false, message: 'No processed payrolls found' });
      return;
    }

    // Check for existing payout batch
    const existingBatch = await PayoutBatch.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      month,
      year,
      status: { $nin: ['cancelled', 'failed'] },
    });

    if (existingBatch) {
      res.status(400).json({
        success: false,
        message: `Payout batch already exists for ${month}/${year}`,
        data: { batchId: existingBatch._id, batchNumber: existingBatch.batchNumber },
      });
      return;
    }

    const batch = await createPayoutBatch({
      tenantId,
      payrollBatchId,
      month,
      year,
      payrolls,
      initiatedBy: new mongoose.Types.ObjectId(userId),
    });

    res.status(201).json({
      success: true,
      message: 'Payout batch created successfully',
      data: {
        _id: batch._id,
        batchNumber: batch.batchNumber,
        status: batch.status,
        totalEmployees: batch.totalEmployees,
        totalAmount: batch.totalAmount / 100, // Convert to INR
        failedToCreate: batch.failedPayouts,
        errors: batch.errors,
      },
    });
  } catch (error: any) {
    console.error('Error creating batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List payout batches
 */
export const listBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const { page = 1, limit = 20, status, month, year } = req.query;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const query: any = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (status) query.status = status;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const skip = (Number(page) - 1) * Number(limit);

    const [batches, total] = await Promise.all([
      PayoutBatch.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PayoutBatch.countDocuments(query),
    ]);

    // Convert amounts from paise to INR
    const formattedBatches = batches.map((b) => ({
      ...b.toObject(),
      totalAmount: b.totalAmount / 100,
    }));

    res.json({
      success: true,
      data: {
        batches: formattedBatches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error listing batches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get batch details
 */
export const getBatchDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const id = String(req.params.id || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const batch = await PayoutBatch.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    // Get payouts for this batch
    const payouts = await Payout.find({ batchId: batch._id }).sort({ 'employee.firstName': 1 });

    // Format payouts
    const formattedPayouts = payouts.map((p) => ({
      ...p.toObject(),
      amount: p.amount / 100, // Convert to INR
    }));

    res.json({
      success: true,
      data: {
        batch: {
          ...batch.toObject(),
          totalAmount: batch.totalAmount / 100,
        },
        payouts: formattedPayouts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve payout batch
 */
export const approveBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const userRole = String(req.headers['x-user-role'] || '');
    const id = String(req.params.id || '');
    const { comment } = req.body;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const batch = await PayoutBatch.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    if (batch.status !== 'pending_approval') {
      res.status(400).json({ success: false, message: 'Batch is not pending approval' });
      return;
    }

    // Check if user already approved
    const alreadyApproved = batch.approvals.some(
      (a) => a.userId.toString() === userId && a.action === 'approved'
    );

    if (alreadyApproved) {
      res.status(400).json({ success: false, message: 'You have already approved this batch' });
      return;
    }

    // Add approval
    batch.approvals.push({
      userId: new mongoose.Types.ObjectId(userId),
      role: userRole,
      action: 'approved',
      comment,
      timestamp: new Date(),
    });

    // Check if we have enough approvals
    const config = await PayoutConfig.findOne({ tenantId, isActive: true });
    const approvalCount = batch.approvals.filter((a) => a.action === 'approved').length;

    if (config && approvalCount >= config.minApprovers) {
      batch.status = 'approved';
    }

    await batch.save();

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      batchId: batch._id,
      action: 'batch_approved',
      performedBy: new mongoose.Types.ObjectId(userId),
      previousStatus: 'pending_approval',
      newStatus: batch.status,
      details: { comment, approvalCount },
    });

    res.json({
      success: true,
      message: batch.status === 'approved' ? 'Batch approved and ready for processing' : 'Approval recorded',
      data: {
        status: batch.status,
        approvalCount,
        minApprovers: config?.minApprovers || 1,
      },
    });
  } catch (error: any) {
    console.error('Error approving batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject payout batch
 */
export const rejectBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const userRole = String(req.headers['x-user-role'] || '');
    const id = String(req.params.id || '');
    const { comment } = req.body;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    if (!comment) {
      res.status(400).json({ success: false, message: 'Rejection reason is required' });
      return;
    }

    const batch = await PayoutBatch.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    if (batch.status !== 'pending_approval') {
      res.status(400).json({ success: false, message: 'Batch is not pending approval' });
      return;
    }

    const previousStatus = batch.status;
    batch.status = 'cancelled';
    batch.approvals.push({
      userId: new mongoose.Types.ObjectId(userId),
      role: userRole,
      action: 'rejected',
      comment,
      timestamp: new Date(),
    });

    await batch.save();

    // Cancel all pending payouts
    await Payout.updateMany(
      { batchId: batch._id, status: 'pending' },
      { status: 'cancelled' }
    );

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      batchId: batch._id,
      action: 'batch_rejected',
      performedBy: new mongoose.Types.ObjectId(userId),
      previousStatus,
      newStatus: 'cancelled',
      details: { comment },
    });

    res.json({
      success: true,
      message: 'Batch rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Process payout batch
 */
export const processBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const batch = await PayoutBatch.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    if (!['draft', 'approved'].includes(batch.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot process batch with status: ${batch.status}`,
      });
      return;
    }

    // Start processing (async)
    processPayoutBatch(tenantId, id, new mongoose.Types.ObjectId(userId))
      .catch((error) => console.error('Error in batch processing:', error));

    res.json({
      success: true,
      message: 'Batch processing started',
      data: {
        batchId: batch._id,
        batchNumber: batch.batchNumber,
      },
    });
  } catch (error: any) {
    console.error('Error processing batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel payout batch
 */
export const cancelBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id || '');
    const { reason } = req.body;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const batch = await PayoutBatch.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    if (!['draft', 'pending_approval', 'approved'].includes(batch.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot cancel batch with status: ${batch.status}`,
      });
      return;
    }

    const previousStatus = batch.status;
    batch.status = 'cancelled';
    await batch.save();

    // Cancel all pending payouts
    await Payout.updateMany(
      { batchId: batch._id, status: 'pending' },
      { status: 'cancelled' }
    );

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      batchId: batch._id,
      action: 'batch_cancelled',
      performedBy: new mongoose.Types.ObjectId(userId),
      previousStatus,
      newStatus: 'cancelled',
      details: { reason },
    });

    res.json({
      success: true,
      message: 'Batch cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get batch summary/report
 */
export const getBatchSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const id = String(req.params.id || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const batch = await PayoutBatch.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }

    // Get payout statistics
    const stats = await Payout.aggregate([
      { $match: { batchId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    // Get by payout method
    const byMethod = await Payout.aggregate([
      { $match: { batchId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$payoutMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        batch: {
          batchNumber: batch.batchNumber,
          month: batch.month,
          year: batch.year,
          status: batch.status,
          totalEmployees: batch.totalEmployees,
          totalAmount: batch.totalAmount / 100,
          successfulPayouts: batch.successfulPayouts,
          failedPayouts: batch.failedPayouts,
          pendingPayouts: batch.pendingPayouts,
          createdAt: batch.createdAt,
          completedAt: batch.completedAt,
        },
        byStatus: stats.map((s) => ({
          status: s._id,
          count: s.count,
          amount: s.totalAmount / 100,
        })),
        byMethod: byMethod.map((m) => ({
          method: m._id,
          count: m.count,
          amount: m.totalAmount / 100,
        })),
        errors: batch.errors,
        approvals: batch.approvals,
      },
    });
  } catch (error: any) {
    console.error('Error fetching batch summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
