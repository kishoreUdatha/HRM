import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import Tenant from '../models/Tenant';

// Create new tenant (organization signup)
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, slug, domain, settings, subscription, billing, status } = req.body;

    // Generate slug from name if not provided
    const tenantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existingTenant = await Tenant.findOne({
      $or: [{ slug: tenantSlug }, ...(domain ? [{ domain }] : [])],
    });

    if (existingTenant) {
      res.status(400).json({
        success: false,
        message: existingTenant.slug === tenantSlug
          ? 'Organization slug already taken'
          : 'Domain already registered',
      });
      return;
    }

    const tenant = await Tenant.create({
      name,
      slug: tenantSlug,
      domain,
      settings,
      subscription,
      billing,
      status: status || 'trial',
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
    tenant.slug = `deleted-${Date.now()}-${tenant.slug}`;
    await tenant.save();

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update tenant by admin (super admin)
export const updateTenantByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, status, domain, settings } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Update allowed fields
    if (name) tenant.name = name;
    if (status) tenant.status = status;
    if (domain !== undefined) tenant.domain = domain;
    if (settings) {
      tenant.settings = { ...tenant.settings, ...settings };
    }

    await tenant.save();

    res.json({
      success: true,
      data: tenant,
      message: 'Organization updated successfully',
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

    // Extend from current trial end date or from now if already expired
    const currentTrialEnd = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : new Date();
    const baseDate = currentTrialEnd > new Date() ? currentTrialEnd : new Date();
    tenant.trialEndsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
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

// Start trial period for a tenant (super admin)
export const startTrial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { days = 14, plan = 'professional' } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Set trial status and end date
    tenant.status = 'trial';
    tenant.trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Upgrade to trial plan features
    const trialPlanLimits: Record<string, { maxEmployees: number; maxAdmins: number }> = {
      starter: { maxEmployees: 50, maxAdmins: 3 },
      professional: { maxEmployees: 200, maxAdmins: 10 },
      enterprise: { maxEmployees: 10000, maxAdmins: 100 },
    };

    const trialPlanFeatures: Record<string, string[]> = {
      starter: ['employees', 'attendance', 'leaves', 'basic_payroll', 'reports'],
      professional: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
      enterprise: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access', 'custom_integrations', 'sso', 'audit_logs'],
    };

    const selectedPlan = trialPlanLimits[plan] ? plan : 'professional';

    tenant.subscription.plan = selectedPlan as 'free' | 'starter' | 'professional' | 'enterprise';
    tenant.subscription.maxEmployees = trialPlanLimits[selectedPlan].maxEmployees;
    tenant.subscription.maxAdmins = trialPlanLimits[selectedPlan].maxAdmins;
    tenant.subscription.features = trialPlanFeatures[selectedPlan];
    tenant.subscription.startDate = new Date();
    tenant.subscription.endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await tenant.save();

    res.json({
      success: true,
      data: tenant,
      message: `${days}-day trial started with ${selectedPlan} plan features`,
    });
  } catch (error) {
    next(error);
  }
};

// End trial and convert to free plan (super admin)
export const endTrial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { convertToPlan = 'free' } = req.body;

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

    // Convert to specified plan
    const planLimits: Record<string, { maxEmployees: number; maxAdmins: number }> = {
      free: { maxEmployees: 10, maxAdmins: 1 },
      starter: { maxEmployees: 50, maxAdmins: 3 },
      professional: { maxEmployees: 200, maxAdmins: 10 },
      enterprise: { maxEmployees: 10000, maxAdmins: 100 },
    };

    const planFeatures: Record<string, string[]> = {
      free: ['employees', 'attendance', 'basic_leaves'],
      starter: ['employees', 'attendance', 'leaves', 'basic_payroll', 'reports'],
      professional: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
      enterprise: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access', 'custom_integrations', 'sso', 'audit_logs'],
    };

    tenant.status = 'active';
    tenant.trialEndsAt = undefined;
    tenant.subscription.plan = convertToPlan as 'free' | 'starter' | 'professional' | 'enterprise';
    tenant.subscription.maxEmployees = planLimits[convertToPlan]?.maxEmployees || 10;
    tenant.subscription.maxAdmins = planLimits[convertToPlan]?.maxAdmins || 1;
    tenant.subscription.features = planFeatures[convertToPlan] || planFeatures.free;

    await tenant.save();

    res.json({
      success: true,
      data: tenant,
      message: `Trial ended. Converted to ${convertToPlan} plan`,
    });
  } catch (error) {
    next(error);
  }
};

// Get all tenants with advanced filtering, sorting, and pagination (super admin)
export const getAdminTenantList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      plan,
      search,
      sortField = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (plan && plan !== 'all') {
      filter['subscription.plan'] = plan;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { 'billing.companyName': { $regex: search, $options: 'i' } },
        { 'billing.email': { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        (filter.createdAt as Record<string, Date>).$lte = new Date((dateTo as string) + 'T23:59:59.999Z');
      }
    }

    // Build sort
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      createdAt: 'createdAt',
      status: 'status',
      plan: 'subscription.plan',
      employeeCount: 'employeeCount',
    };

    const sortKey = sortFieldMap[sortField as string] || 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortKey]: sortDirection };

    const [tenants, total] = await Promise.all([
      Tenant.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Tenant.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tenants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create tenant with admin user (super admin)
export const createTenantWithAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      slug,
      plan = 'trial',
      trialDays = 14,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
    } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Organization name is required',
      });
      return;
    }

    if (!adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      res.status(400).json({
        success: false,
        message: 'Admin user details (email, password, firstName, lastName) are required',
      });
      return;
    }

    if (adminPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    // Generate slug from name if not provided
    const tenantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existingTenant = await Tenant.findOne({ slug: tenantSlug });
    if (existingTenant) {
      res.status(400).json({
        success: false,
        message: 'Organization slug already taken',
      });
      return;
    }

    // Determine plan settings
    const isPaidPlan = ['starter', 'professional', 'enterprise'].includes(plan);
    const planLimits: Record<string, { maxEmployees: number; maxAdmins: number }> = {
      free: { maxEmployees: 10, maxAdmins: 1 },
      trial: { maxEmployees: 200, maxAdmins: 10 },
      starter: { maxEmployees: 50, maxAdmins: 3 },
      professional: { maxEmployees: 200, maxAdmins: 10 },
      enterprise: { maxEmployees: 10000, maxAdmins: 100 },
    };

    const planFeatures: Record<string, string[]> = {
      free: ['employees', 'attendance', 'basic_leaves'],
      trial: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
      starter: ['employees', 'attendance', 'leaves', 'basic_payroll', 'reports'],
      professional: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
      enterprise: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access', 'custom_integrations', 'sso', 'audit_logs'],
    };

    // Create tenant
    const tenantData: Record<string, unknown> = {
      name,
      slug: tenantSlug,
      status: plan === 'trial' ? 'trial' : 'active',
      subscription: {
        plan: plan === 'trial' ? 'professional' : plan,
        maxEmployees: planLimits[plan]?.maxEmployees || 10,
        maxAdmins: planLimits[plan]?.maxAdmins || 1,
        features: planFeatures[plan] || planFeatures.free,
        startDate: new Date(),
        billingCycle: 'monthly',
        amount: 0,
        currency: 'INR',
      },
    };

    // Set trial end date if trial
    if (plan === 'trial') {
      tenantData.trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    }

    const tenant = await Tenant.create(tenantData);

    // Create admin user via auth service
    // In Docker, use service name; locally use localhost
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    let adminUser = null;
    let adminCreationError = null;

    try {
      const fetch = (await import('node-fetch')).default;
      const authResponse = await fetch(`${authServiceUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          firstName: adminFirstName,
          lastName: adminLastName,
          tenantId: tenant._id.toString(),
          role: 'tenant_admin',
        }),
      });

      const authData = await authResponse.json() as { success: boolean; user?: unknown; message?: string };

      if (authData.success) {
        adminUser = authData.user;
      } else {
        adminCreationError = authData.message || 'Failed to create admin user';
      }
    } catch (authError: unknown) {
      console.error('Error creating admin user:', authError);
      adminCreationError = authError instanceof Error ? authError.message : 'Failed to connect to auth service';
    }

    // Return response
    if (adminUser) {
      res.status(201).json({
        success: true,
        data: {
          tenant,
          adminUser,
        },
        message: 'Organization and admin user created successfully',
      });
    } else {
      // Tenant created but admin user failed
      res.status(201).json({
        success: true,
        data: {
          tenant,
          adminUser: null,
        },
        message: `Organization created but admin user creation failed: ${adminCreationError}`,
        warning: adminCreationError,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Upload company logo
export const uploadLogo = async (
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

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
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

    // Delete old logo if exists
    if (tenant.logo) {
      const oldLogoPath = path.join(__dirname, '../../uploads/logos', path.basename(tenant.logo));
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Get the uploaded file path
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update tenant with new logo URL
    tenant.logo = logoUrl;
    await tenant.save();

    res.json({
      success: true,
      data: {
        logo: logoUrl,
      },
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete company logo
export const deleteLogo = async (
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

    // Delete logo file if exists
    if (tenant.logo) {
      const logoPath = path.join(__dirname, '../../uploads/logos', path.basename(tenant.logo));
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
      tenant.logo = undefined;
      await tenant.save();
    }

    res.json({
      success: true,
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update company branding (address fields)
export const updateBranding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { address, city, state, country, pincode } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          address,
          city,
          state,
          country,
          pincode,
        },
      },
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
      data: {
        address: tenant.address,
        city: tenant.city,
        state: tenant.state,
        country: tenant.country,
        pincode: tenant.pincode,
        logo: tenant.logo,
      },
      message: 'Branding updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
