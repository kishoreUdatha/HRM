import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Payout from '../models/Payout';
import PayoutAuditLog from '../models/PayoutAuditLog';
import { retryPayout } from '../services/payoutProcessingService';
import razorpayPayoutService from '../services/razorpayPayoutService';

/**
 * List payouts with filters
 */
export const listPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const {
      page = 1,
      limit = 20,
      status,
      batchId,
      employeeId,
      startDate,
      endDate,
      search,
    } = req.query;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const query: any = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (status) query.status = status;
    if (batchId) query.batchId = new mongoose.Types.ObjectId(batchId as string);
    if (employeeId) query.employeeId = new mongoose.Types.ObjectId(employeeId as string);

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    if (search) {
      query.$or = [
        { 'employee.firstName': { $regex: search, $options: 'i' } },
        { 'employee.lastName': { $regex: search, $options: 'i' } },
        { 'employee.employeeCode': { $regex: search, $options: 'i' } },
        { utr: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payout.countDocuments(query),
    ]);

    // Convert amounts from paise to INR
    const formattedPayouts = payouts.map((p) => ({
      ...p.toObject(),
      amount: p.amount / 100,
    }));

    res.json({
      success: true,
      data: {
        payouts: formattedPayouts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error listing payouts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get payout by ID
 */
export const getPayoutById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const id = String(req.params.id || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const payout = await Payout.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!payout) {
      res.status(404).json({ success: false, message: 'Payout not found' });
      return;
    }

    // Get audit logs for this payout
    const auditLogs = await PayoutAuditLog.find({ payoutId: payout._id })
      .sort({ performedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: {
        payout: {
          ...payout.toObject(),
          amount: payout.amount / 100,
        },
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching payout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retry failed payout
 */
export const retryPayoutHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    await retryPayout(tenantId, id, new mongoose.Types.ObjectId(userId));

    res.json({
      success: true,
      message: 'Payout retry initiated',
    });
  } catch (error: any) {
    console.error('Error retrying payout:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Cancel queued payout
 */
export const cancelPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id || '');
    const { reason } = req.body;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const payout = await Payout.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!payout) {
      res.status(404).json({ success: false, message: 'Payout not found' });
      return;
    }

    if (!['pending', 'initiated'].includes(payout.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot cancel payout with status: ${payout.status}`,
      });
      return;
    }

    // If already initiated with Razorpay, try to cancel there
    if (payout.razorpayPayoutId && payout.razorpayStatus === 'queued') {
      try {
        await razorpayPayoutService.cancelPayout(tenantId, payout.razorpayPayoutId);
      } catch (error) {
        console.error('Failed to cancel in Razorpay:', error);
        // Continue with local cancellation anyway
      }
    }

    const previousStatus = payout.status;
    payout.status = 'cancelled';
    payout.failureReason = reason || 'Manually cancelled';
    await payout.save();

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      payoutId: payout._id,
      batchId: payout.batchId,
      action: 'payout_cancelled',
      performedBy: new mongoose.Types.ObjectId(userId),
      previousStatus,
      newStatus: 'cancelled',
      details: { reason },
    });

    res.json({
      success: true,
      message: 'Payout cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling payout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get employee's payout history
 */
export const getEmployeePayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const employeeId = String(req.params.employeeId || '');
    const { page = 1, limit = 20 } = req.query;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const query = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payout.countDocuments(query),
    ]);

    // Convert amounts from paise to INR
    const formattedPayouts = payouts.map((p) => ({
      ...p.toObject(),
      amount: p.amount / 100,
    }));

    res.json({
      success: true,
      data: {
        payouts: formattedPayouts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching employee payouts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get payout statistics
 */
export const getPayoutStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const { month, year } = req.query;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const matchQuery: any = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0);
      matchQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    const stats = await Payout.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const totalPayouts = await Payout.countDocuments(matchQuery);
    const totalAmount = await Payout.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalPayouts,
        totalAmount: (totalAmount[0]?.total || 0) / 100,
        byStatus: stats.map((s) => ({
          status: s._id,
          count: s.count,
          amount: s.totalAmount / 100,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching payout stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Sync payout status from Razorpay
 */
export const syncPayoutStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const id = String(req.params.id || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const payout = await Payout.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!payout) {
      res.status(404).json({ success: false, message: 'Payout not found' });
      return;
    }

    if (!payout.razorpayPayoutId) {
      res.status(400).json({ success: false, message: 'Payout not yet initiated with Razorpay' });
      return;
    }

    // Fetch current status from Razorpay
    const razorpayPayout = await razorpayPayoutService.getPayoutStatus(
      tenantId,
      payout.razorpayPayoutId
    );

    // Update local status
    payout.razorpayStatus = razorpayPayout.status as any;

    if (razorpayPayout.utr) {
      payout.utr = razorpayPayout.utr;
    }

    // Map status
    switch (razorpayPayout.status) {
      case 'processed':
        payout.status = 'completed';
        payout.processedAt = new Date(razorpayPayout.created_at * 1000);
        break;
      case 'reversed':
        payout.status = 'reversed';
        break;
      case 'rejected':
      case 'cancelled':
        payout.status = 'failed';
        payout.failureReason = razorpayPayout.failure_reason || `Payout ${razorpayPayout.status}`;
        break;
      case 'processing':
      case 'pending':
        payout.status = 'processing';
        break;
    }

    await payout.save();

    res.json({
      success: true,
      message: 'Payout status synced',
      data: {
        status: payout.status,
        razorpayStatus: payout.razorpayStatus,
        utr: payout.utr,
      },
    });
  } catch (error: any) {
    console.error('Error syncing payout status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
