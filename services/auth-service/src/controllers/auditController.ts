import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';
import mongoose from 'mongoose';

// Create audit log entry
export const createAuditLog = async (
  tenantId: string,
  userId: string,
  userEmail: string,
  userName: string,
  action: string,
  category: string,
  resource: string,
  details: Record<string, unknown> = {},
  options: {
    resourceId?: string;
    changes?: { field: string; oldValue: unknown; newValue: unknown }[];
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure';
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> => {
  try {
    await AuditLog.create({
      tenantId,
      userId,
      userEmail,
      userName,
      action,
      category,
      resource,
      details,
      ...options,
    });
  } catch (error) {
    console.error('[Auth Service] Failed to create audit log:', error);
  }
};

// Get audit logs with filtering
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const {
      userId,
      category,
      action,
      resource,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (action) query.action = { $regex: action, $options: 'i' };
    if (resource) query.resource = { $regex: resource, $options: 'i' };
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Auth Service] Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

// Get audit log by ID
export const getAuditLogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const log = await AuditLog.findOne({ _id: id, tenantId }).lean();

    if (!log) {
      res.status(404).json({ success: false, message: 'Audit log not found' });
      return;
    }

    res.status(200).json({ success: true, data: { log } });
  } catch (error) {
    console.error('[Auth Service] Get audit log error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
  }
};

// Get audit log statistics
export const getAuditStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const [
      totalLogs,
      byCategory,
      byStatus,
      byUser,
      recentActivity,
      dailyActivity,
    ] = await Promise.all([
      AuditLog.countDocuments({ tenantId, createdAt: { $gte: startDate } }),
      AuditLog.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: startDate } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: startDate } } },
        { $group: { _id: { userId: '$userId', userName: '$userName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('action category userName createdAt status')
        .lean(),
      AuditLog.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        byCategory: Object.fromEntries(byCategory.map(c => [c._id, c.count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        topUsers: byUser.map(u => ({ userId: u._id.userId, userName: u._id.userName, count: u.count })),
        recentActivity,
        dailyActivity: dailyActivity.map(d => ({ date: d._id, count: d.count })),
      },
    });
  } catch (error) {
    console.error('[Auth Service] Get audit stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit statistics' });
  }
};

// Get user activity
export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find({ tenantId, userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments({ tenantId, userId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Auth Service] Get user activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user activity' });
  }
};

// Export audit logs
export const exportAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate, category, format = 'json' } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
    }
    if (category) query.category = category;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(10000) // Max 10k records per export
      .lean();

    if (format === 'csv') {
      const csvHeaders = 'Timestamp,User,Action,Category,Resource,Status\n';
      const csvRows = logs.map(log =>
        `"${log.createdAt}","${log.userName}","${log.action}","${log.category}","${log.resource}","${log.status}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      res.send(csvHeaders + csvRows);
    } else {
      res.status(200).json({
        success: true,
        data: { logs },
      });
    }
  } catch (error) {
    console.error('[Auth Service] Export audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to export audit logs' });
  }
};
