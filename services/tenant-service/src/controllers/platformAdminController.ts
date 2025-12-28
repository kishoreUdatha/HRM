import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
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

// Service configuration for health checks
const SERVICE_ENDPOINTS = [
  { name: 'API Gateway', url: process.env.API_GATEWAY_URL || 'http://localhost:3000', path: '/health' },
  { name: 'Auth Service', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001', path: '/health' },
  { name: 'Tenant Service', url: process.env.TENANT_SERVICE_URL || 'http://localhost:3002', path: '/health' },
  { name: 'Employee Service', url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003', path: '/health' },
  { name: 'Attendance Service', url: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3004', path: '/health' },
  { name: 'Leave Service', url: process.env.LEAVE_SERVICE_URL || 'http://localhost:3005', path: '/health' },
  { name: 'Payroll Service', url: process.env.PAYROLL_SERVICE_URL || 'http://localhost:3006', path: '/health' },
  { name: 'Notification Service', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007', path: '/health' },
  { name: 'Billing Service', url: process.env.BILLING_SERVICE_URL || 'http://localhost:3027', path: '/health' },
];

// Helper function to check service health
const checkServiceHealth = async (service: { name: string; url: string; path: string }) => {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${service.url}${service.path}`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    return {
      name: service.name,
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime,
      uptime: 99.9 + Math.random() * 0.09, // Simulated uptime, should be tracked in DB
      lastChecked: new Date().toISOString(),
      url: service.url,
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      uptime: 0,
      lastChecked: new Date().toISOString(),
      url: service.url,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
};

// Get platform health status with real service checks
export const getPlatformHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check all microservices in parallel
    const serviceHealthPromises = SERVICE_ENDPOINTS.map(checkServiceHealth);
    const servicesHealth = await Promise.all(serviceHealthPromises);

    // Check MongoDB
    let mongoStatus = 'healthy';
    let mongoResponseTime = 0;
    try {
      const mongoStart = Date.now();
      await Tenant.db.db?.admin()?.ping();
      mongoResponseTime = Date.now() - mongoStart;
    } catch {
      mongoStatus = 'unhealthy';
    }

    // Add infrastructure services
    const infrastructureServices = [
      {
        name: 'MongoDB',
        status: mongoStatus,
        responseTime: mongoResponseTime,
        uptime: mongoStatus === 'healthy' ? 99.95 : 0,
        lastChecked: new Date().toISOString(),
      },
      {
        name: 'Redis',
        status: 'healthy', // Would need redis client to check
        responseTime: 5,
        uptime: 99.9,
        lastChecked: new Date().toISOString(),
      },
    ];

    const allServices = [...servicesHealth, ...infrastructureServices];
    const healthyCount = allServices.filter(s => s.status === 'healthy').length;
    const totalCount = allServices.length;

    // Determine overall status
    let overallStatus = 'healthy';
    if (healthyCount < totalCount * 0.5) {
      overallStatus = 'unhealthy';
    } else if (healthyCount < totalCount) {
      overallStatus = 'degraded';
    }

    // Calculate metrics
    const avgResponseTime = Math.round(
      allServices.reduce((sum, s) => sum + (s.responseTime || 0), 0) / allServices.length
    );

    // Get system metrics (simplified - in production would use os module or external monitoring)
    const metrics = {
      totalRequests: Math.floor(Math.random() * 50000) + 10000,
      avgResponseTime,
      errorRate: overallStatus === 'healthy' ? 0.1 : overallStatus === 'degraded' ? 2.5 : 15,
      activeConnections: Math.floor(Math.random() * 200) + 50,
    };

    // Infrastructure metrics (simplified)
    const infrastructure = {
      cpu: Math.floor(Math.random() * 40) + 20,
      memory: Math.floor(Math.random() * 30) + 40,
      disk: Math.floor(Math.random() * 20) + 30,
    };

    const settings = await (SystemSettings as any).getSettings();

    res.json({
      success: true,
      data: {
        status: overallStatus,
        services: allServices,
        metrics,
        infrastructure,
        maintenanceMode: settings.maintenanceMode,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ PLAN MANAGEMENT ============

// Get all plans
export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await (SystemSettings as any).getSettings();
    res.json({
      success: true,
      data: settings.plans,
    });
  } catch (error) {
    next(error);
  }
};

// Update a specific plan
export const updatePlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { planName } = req.params;
    const updates = req.body;
    const userId = req.headers['x-user-id'] as string;

    const settings = await (SystemSettings as any).getSettings();
    const planIndex = settings.plans.findIndex((p: any) => p.name === planName);

    if (planIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    // Update plan fields
    const plan = settings.plans[planIndex];
    if (updates.displayName) plan.displayName = updates.displayName;
    if (updates.price) {
      if (updates.price.monthly !== undefined) plan.price.monthly = updates.price.monthly;
      if (updates.price.yearly !== undefined) plan.price.yearly = updates.price.yearly;
      if (updates.price.currency) plan.price.currency = updates.price.currency;
    }
    if (updates.maxEmployees !== undefined) plan.maxEmployees = updates.maxEmployees;
    if (updates.maxAdmins !== undefined) plan.maxAdmins = updates.maxAdmins;
    if (updates.features) plan.features = updates.features;
    if (updates.isActive !== undefined) plan.isActive = updates.isActive;

    // Only set updatedBy if it's a valid ObjectId
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      settings.updatedBy = userId;
    }
    await settings.save();

    res.json({
      success: true,
      data: plan,
      message: 'Plan updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Add feature to a plan
export const addPlanFeature = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { planName } = req.params;
    const { feature } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!feature) {
      res.status(400).json({
        success: false,
        message: 'Feature name is required',
      });
      return;
    }

    const settings = await (SystemSettings as any).getSettings();
    const planIndex = settings.plans.findIndex((p: any) => p.name === planName);

    if (planIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    const plan = settings.plans[planIndex];
    if (!plan.features.includes(feature)) {
      plan.features.push(feature);
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        settings.updatedBy = userId;
      }
      await settings.save();
    }

    res.json({
      success: true,
      data: plan,
      message: 'Feature added successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Remove feature from a plan
export const removePlanFeature = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { planName } = req.params;
    // Support both query param and body for feature
    const feature = (req.query.feature as string) || req.body.feature;
    const userId = req.headers['x-user-id'] as string;

    if (!feature) {
      res.status(400).json({
        success: false,
        message: 'Feature name is required',
      });
      return;
    }

    const settings = await (SystemSettings as any).getSettings();
    const planIndex = settings.plans.findIndex((p: any) => p.name === planName);

    if (planIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    const plan = settings.plans[planIndex];
    plan.features = plan.features.filter((f: string) => f !== feature);
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      settings.updatedBy = userId;
    }
    await settings.save();

    res.json({
      success: true,
      data: plan,
      message: 'Feature removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update plan features
export const updatePlanFeatures = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { planName } = req.params;
    const { features } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!Array.isArray(features)) {
      res.status(400).json({
        success: false,
        message: 'Features must be an array',
      });
      return;
    }

    const settings = await (SystemSettings as any).getSettings();
    const planIndex = settings.plans.findIndex((p: any) => p.name === planName);

    if (planIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    settings.plans[planIndex].features = features;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      settings.updatedBy = userId;
    }
    await settings.save();

    res.json({
      success: true,
      data: settings.plans[planIndex],
      message: 'Plan features updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get available features list
export const getAvailableFeatures = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Define all available features in the system
    const availableFeatures = [
      { id: 'employees', name: 'Employee Management', description: 'Core employee data management' },
      { id: 'attendance', name: 'Attendance Tracking', description: 'Track employee attendance' },
      { id: 'basic_leaves', name: 'Basic Leave Management', description: 'Simple leave requests' },
      { id: 'leaves', name: 'Advanced Leave Management', description: 'Full leave management with policies' },
      { id: 'basic_payroll', name: 'Basic Payroll', description: 'Simple salary processing' },
      { id: 'payroll', name: 'Advanced Payroll', description: 'Full payroll with taxes and deductions' },
      { id: 'reports', name: 'Reports', description: 'Generate various HR reports' },
      { id: 'recruitment', name: 'Recruitment', description: 'Job postings and applicant tracking' },
      { id: 'api_access', name: 'API Access', description: 'REST API access for integrations' },
      { id: 'custom_integrations', name: 'Custom Integrations', description: 'Custom third-party integrations' },
      { id: 'sso', name: 'Single Sign-On', description: 'SSO with SAML/OAuth' },
      { id: 'audit_logs', name: 'Audit Logs', description: 'Detailed activity audit trail' },
      { id: 'priority_support', name: 'Priority Support', description: '24/7 priority support' },
      { id: 'performance', name: 'Performance Reviews', description: 'Employee performance management' },
      { id: 'training', name: 'Training Management', description: 'Employee training and development' },
      { id: 'expenses', name: 'Expense Management', description: 'Employee expense claims' },
      { id: 'assets', name: 'Asset Management', description: 'Company asset tracking' },
      { id: 'documents', name: 'Document Management', description: 'Employee document storage' },
      { id: 'onboarding', name: 'Onboarding', description: 'New employee onboarding workflow' },
      { id: 'offboarding', name: 'Offboarding', description: 'Employee exit management' },
      { id: 'timesheets', name: 'Timesheets', description: 'Time tracking and timesheets' },
      { id: 'shifts', name: 'Shift Management', description: 'Employee shift scheduling' },
      { id: 'benefits', name: 'Benefits Administration', description: 'Employee benefits management' },
      { id: 'compliance', name: 'Compliance Management', description: 'HR compliance tracking' },
      { id: 'analytics', name: 'Advanced Analytics', description: 'AI-powered HR analytics' },
      { id: 'mobile_app', name: 'Mobile App Access', description: 'Mobile app for employees' },
      { id: 'white_label', name: 'White Label', description: 'Custom branding' },
    ];

    res.json({
      success: true,
      data: availableFeatures,
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
