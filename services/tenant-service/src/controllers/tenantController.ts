import { Request, Response, NextFunction } from 'express';
import Tenant from '../models/Tenant';

// Create new tenant (organization signup)
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, slug, domain, settings, subscription, billing } = req.body;

    // Check if slug already exists
    const existingTenant = await Tenant.findOne({
      $or: [{ slug }, ...(domain ? [{ domain }] : [])],
    });

    if (existingTenant) {
      res.status(400).json({
        success: false,
        message: existingTenant.slug === slug
          ? 'Organization slug already taken'
          : 'Domain already registered',
      });
      return;
    }

    const tenant = await Tenant.create({
      name,
      slug,
      domain,
      settings,
      subscription,
      billing,
    });

    res.status(201).json({
      success: true,
      data: tenant,
      message: 'Organization created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get tenant by ID
export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// Get tenant by slug (for subdomain resolution)
export const getTenantBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const tenant = await Tenant.findOne({ slug, status: { $ne: 'suspended' } });
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// Update tenant
export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const updates = req.body;

    // Prevent changing slug after creation
    delete updates.slug;

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    res.json({
      success: true,
      data: tenant,
      message: 'Organization updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update tenant settings
export const updateTenantSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { settings } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: { settings } },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    res.json({
      success: true,
      data: tenant.settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get current tenant (from auth context)
export const getCurrentTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// Get all tenants (super admin only)
export const getAllTenants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, plan, search } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (plan) filter['subscription.plan'] = plan;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Tenant.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tenants,
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

// Upgrade/change subscription
export const updateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { plan, billingCycle } = req.body;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    tenant.subscription.plan = plan;
    if (billingCycle) tenant.subscription.billingCycle = billingCycle;

    // Update subscription dates
    tenant.subscription.startDate = new Date();
    const durationDays = billingCycle === 'yearly' ? 365 : 30;
    tenant.subscription.endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Clear trial status
    if (tenant.status === 'trial') {
      tenant.status = 'active';
      tenant.trialEndsAt = undefined;
    }

    await tenant.save();

    res.json({
      success: true,
      data: tenant,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Check slug availability
export const checkSlugAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const existingTenant = await Tenant.findOne({ slug });

    res.json({
      success: true,
      data: {
        available: !existingTenant,
        slug,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update tenant status (super admin)
export const updateTenantStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'inactive', 'suspended', 'trial'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
      return;
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    tenant.status = status;
    if (reason) {
      tenant.set('statusReason', reason);
    }

    await tenant.save();

    res.json({
      success: true,
      data: tenant,
      message: `Organization ${status === 'suspended' ? 'suspended' : status === 'active' ? 'activated' : 'updated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// Get tenant statistics (super admin)
export const getTenantStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalTenants,
      byStatus,
      byPlan,
      recentTenants,
      trialExpiringSoon,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Tenant.aggregate([
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
      ]),
      Tenant.find()
        .select('name slug status subscription.plan createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Tenant.countDocuments({
        status: 'trial',
        trialEndsAt: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalTenants,
        byStatus: Object.fromEntries(byStatus.map((s: { _id: string; count: number }) => [s._id, s.count])),
        byPlan: Object.fromEntries(byPlan.map((p: { _id: string; count: number }) => [p._id, p.count])),
        recentTenants,
        trialExpiringSoon,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete tenant (super admin - soft delete)
export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    tenant.status = 'inactive';
    tenant.slug = `deleted_${Date.now()}_${tenant.slug}`;
    await tenant.save();

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Extend trial period (super admin)
export const extendTrial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { days = 14 } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    if (tenant.status !== 'trial') {
      res.status(400).json({
        success: false,
        message: 'Organization is not on trial',
      });
      return;
    }

    tenant.trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await tenant.save();

    res.json({
      success: true,
      data: tenant,
      message: `Trial extended by ${days} days`,
    });
  } catch (error) {
    next(error);
  }
};
