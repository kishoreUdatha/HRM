import { Request, Response, NextFunction } from 'express';
import Tenant from '../models/Tenant';
import PlatformNotification from '../models/PlatformNotification';
import SystemSettings from '../models/SystemSettings';

// Get platform revenue analytics
export const getRevenueAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { period = '12' } = req.query;
    const months = parseInt(period as string, 10);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get tenants with paid subscriptions
    const paidTenants = await Tenant.find({
      status: 'active',
      'subscription.plan': { $in: ['starter', 'professional', 'enterprise'] },
    }).lean();

    // Calculate MRR (Monthly Recurring Revenue)
    const planPrices: Record<string, number> = {
      free: 0,
      starter: 29,
      professional: 79,
      enterprise: 199,
    };

    let mrr = 0;
    const revenueByPlan: Record<string, number> = {
      starter: 0,
      professional: 0,
      enterprise: 0,
    };

    paidTenants.forEach((tenant) => {
      const plan = tenant.subscription?.plan || 'free';
      const price = planPrices[plan] || 0;
      mrr += price;
      if (revenueByPlan[plan] !== undefined) {
        revenueByPlan[plan] += price;
      }
    });

    const arr = mrr * 12;

    // Get growth data (monthly tenant signups)
    const growthData = await Tenant.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          revenue: { $sum: 1 }, // Will calculate based on plan
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Calculate trial conversion rate
    const [totalTrials, convertedTrials] = await Promise.all([
      Tenant.countDocuments({
        createdAt: { $gte: startDate },
      }),
      Tenant.countDocuments({
        createdAt: { $gte: startDate },
        status: 'active',
        'subscription.plan': { $ne: 'free' },
      }),
    ]);

    const conversionRate = totalTrials > 0
      ? Math.round((convertedTrials / totalTrials) * 100)
      : 0;

    // Get churn data (cancelled subscriptions)
    const churned = await Tenant.countDocuments({
      status: 'inactive',
      updatedAt: { $gte: startDate },
    });
    const churnRate = paidTenants.length > 0
      ? Math.round((churned / (paidTenants.length + churned)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        mrr,
        arr,
        revenueByPlan,
        totalPaidTenants: paidTenants.length,
        averageRevenuePerTenant: paidTenants.length > 0 ? Math.round(mrr / paidTenants.length) : 0,
        growthData: growthData.map((item) => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          signups: item.count,
        })),
        conversionRate,
        churnRate,
        churned,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get platform growth analytics
export const getGrowthAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalTenants,
      activeTenants,
      newThisMonth,
      newLastMonth,
      trialTenants,
      dailySignups,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Tenant.countDocuments({
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
      }),
      Tenant.countDocuments({ status: 'trial' }),
      Tenant.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
    ]);

    const growthRate = newLastMonth > 0
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        trialTenants,
        newThisMonth,
        newLastMonth,
        growthRate,
        dailySignups: dailySignups.map((d) => ({
          date: d._id,
          count: d.count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create platform notification
export const createNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const {
      title,
      message,
      type,
      targetAudience,
      targetPlans,
      targetTenants,
      scheduledAt,
      expiresAt,
      priority,
      dismissible,
      actionUrl,
      actionLabel,
    } = req.body;

    const notification = await PlatformNotification.create({
      title,
      message,
      type: type || 'info',
      targetAudience: targetAudience || 'all',
      targetPlans,
      targetTenants,
      scheduledAt,
      expiresAt,
      priority: priority || 'normal',
      dismissible: dismissible !== false,
      actionUrl,
      actionLabel,
      status: scheduledAt ? 'scheduled' : 'draft',
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Send notification immediately
export const sendNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await PlatformNotification.findById(id);
    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();

    // TODO: Actually send notifications via WebSocket/Push

    res.json({
      success: true,
      data: notification,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get all platform notifications
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [notifications, total] = await Promise.all([
      PlatformNotification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PlatformNotification.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update notification
export const updateNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Cannot update sent notifications
    const existing = await PlatformNotification.findById(id);
    if (existing?.status === 'sent') {
      res.status(400).json({
        success: false,
        message: 'Cannot update sent notification',
      });
      return;
    }

    const notification = await PlatformNotification.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await PlatformNotification.findByIdAndDelete(id);
    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get system settings
export const getSystemSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await (SystemSettings as any).getSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// Update system settings
export const updateSystemSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const updates = req.body;

    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await (SystemSettings as any).getSettings();
    }

    if (settings) {
      Object.keys(updates).forEach((key) => {
        if (key !== '_id' && key !== 'createdAt') {
          (settings as any)[key] = updates[key];
        }
      });

      settings.updatedBy = userId as any;
      await settings.save();
    }

    res.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Toggle maintenance mode
export const toggleMaintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { enabled, message } = req.body;
    const userId = req.headers['x-user-id'] as string;

    const settings = await (SystemSettings as any).getSettings();
    settings.maintenanceMode = enabled;
    if (message) {
      settings.maintenanceMessage = message;
    }
    settings.updatedBy = userId;
    await settings.save();

    res.json({
      success: true,
      data: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    next(error);
  }
};

// Get platform health status
export const getPlatformHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const services = [
      { name: 'mongodb', status: 'healthy' },
      { name: 'redis', status: 'healthy' },
      { name: 'rabbitmq', status: 'healthy' },
    ];

    // Check MongoDB connection
    const mongoStatus = await Tenant.db.db?.admin()?.ping();
    if (!mongoStatus) {
      services[0].status = 'unhealthy';
    }

    const settings = await (SystemSettings as any).getSettings();

    res.json({
      success: true,
      data: {
        status: services.every((s) => s.status === 'healthy') ? 'healthy' : 'degraded',
        services,
        maintenanceMode: settings.maintenanceMode,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get notifications for a tenant (public endpoint for tenants)
export const getTenantNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    // Get tenant to determine their plan
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
      return;
    }

    const notifications = await PlatformNotification.find({
      status: 'sent',
      $and: [
        {
          $or: [
            { targetAudience: 'all' },
            { targetAudience: 'plan_specific', targetPlans: tenant.subscription?.plan },
            { targetAudience: 'tenant_specific', targetTenants: tenantId },
          ],
        },
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
          ],
        },
      ],
    })
      .sort({ sentAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};
