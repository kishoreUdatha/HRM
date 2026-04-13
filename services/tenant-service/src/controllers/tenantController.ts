import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import Tenant from '../models/Tenant';

// Create new tenant (organization signup) - also creates admin user if credentials provided
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, slug, domain, settings, subscription, billing, status, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

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
      status: status || 'active',
    });

    // If admin credentials provided, create admin user via auth service
    let adminUser = null;
    let tokens = null;
    if (adminEmail && adminPassword && adminFirstName && adminLastName) {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
      try {
        const fetch = (await import('node-fetch')).default;
        const authResponse = await fetch(`${authServiceUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
            tenantId: tenant._id.toString(),
            role: 'tenant_admin',
          }),
        });
        const authData = await authResponse.json() as { success: boolean; user?: unknown; accessToken?: string; refreshToken?: string; message?: string };
        if (authData.success) {
          adminUser = authData.user;
          tokens = { accessToken: authData.accessToken, refreshToken: authData.refreshToken };
        }
      } catch (authError) {
        console.error('[Tenant Service] Error creating admin user:', authError);
      }
    }

    res.status(201).json({
      success: true,
      data: tenant,
      user: adminUser,
      ...(tokens && { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
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

    // Note: Removed .sort() for Cosmos DB compatibility
    const [tenants, total] = await Promise.all([
      Tenant.find(filter).skip(skip).limit(limitNum).lean(),
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

    if (!['active', 'inactive', 'suspended'].includes(status)) {
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
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Tenant.aggregate([
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
      ]),
      // Note: Removed .sort() for Cosmos DB compatibility
      Tenant.find()
        .select('name slug status subscription.plan createdAt')
        .limit(10)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        totalTenants,
        byStatus: Object.fromEntries(byStatus.map((s: { _id: string; count: number }) => [s._id, s.count])),
        byPlan: Object.fromEntries(byPlan.map((p: { _id: string; count: number }) => [p._id, p.count])),
        recentTenants,
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

    // Note: Removed dynamic .sort() for Cosmos DB compatibility
    // sortField and sortOrder parameters are ignored

    const [tenants, total] = await Promise.all([
      Tenant.find(filter)
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
      plan = 'starter',
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

    // Create tenant
    const tenantData: Record<string, unknown> = {
      name,
      slug: tenantSlug,
      status: 'active',
      subscription: {
        plan: plan,
        maxEmployees: planLimits[plan]?.maxEmployees || 10,
        maxAdmins: planLimits[plan]?.maxAdmins || 1,
        features: planFeatures[plan] || planFeatures.free,
        startDate: new Date(),
        billingCycle: 'monthly',
        amount: 0,
        currency: 'INR',
      },
    };

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

    // Get the uploaded file path - use full API path for proper access via gateway
    const logoUrl = `/api/tenants/uploads/logos/${req.file.filename}`;

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

// Update billing information
export const updateBilling = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { companyName, email, address, taxId, phone } = req.body;

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
          'billing.companyName': companyName || '',
          'billing.email': email || '',
          'billing.address': address || '',
          'billing.taxId': taxId || '',
          'billing.phone': phone || '',
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
      data: tenant.billing,
      message: 'Billing information updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get geo-fencing configuration
export const getGeofencing = async (
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

    const tenant = await Tenant.findById(tenantId).select('settings.geofencing');
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Return default geofencing config if not set
    const geofencing = tenant.settings?.geofencing || {
      enabled: false,
      locations: [],
      defaultRadius: 100,
      strictMode: true,
    };

    res.json({
      success: true,
      data: geofencing,
    });
  } catch (error) {
    next(error);
  }
};

// Update geo-fencing configuration
export const updateGeofencing = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { enabled, defaultRadius, strictMode, locations } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (typeof enabled === 'boolean') {
      updateData['settings.geofencing.enabled'] = enabled;
    }
    if (typeof defaultRadius === 'number') {
      updateData['settings.geofencing.defaultRadius'] = defaultRadius;
    }
    if (typeof strictMode === 'boolean') {
      updateData['settings.geofencing.strictMode'] = strictMode;
    }
    if (Array.isArray(locations)) {
      updateData['settings.geofencing.locations'] = locations;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateData },
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
      data: tenant.settings?.geofencing,
      message: 'Geo-fencing settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Add a new geo-fence location
export const addGeofenceLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { name, latitude, longitude, address, radius } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Name, latitude, and longitude are required',
      });
      return;
    }

    const newLocation = {
      name,
      latitude,
      longitude,
      address: address || '',
      radius: radius || 100,
    };

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $push: { 'settings.geofencing.locations': newLocation } },
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
      data: tenant.settings?.geofencing,
      message: 'Location added successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update a geo-fence location
export const updateGeofenceLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { locationId } = req.params;
    const { name, latitude, longitude, address, radius } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    const updateFields: Record<string, unknown> = {};
    if (name) updateFields['settings.geofencing.locations.$.name'] = name;
    if (typeof latitude === 'number') updateFields['settings.geofencing.locations.$.latitude'] = latitude;
    if (typeof longitude === 'number') updateFields['settings.geofencing.locations.$.longitude'] = longitude;
    if (address !== undefined) updateFields['settings.geofencing.locations.$.address'] = address;
    if (typeof radius === 'number') updateFields['settings.geofencing.locations.$.radius'] = radius;

    const tenant = await Tenant.findOneAndUpdate(
      { _id: tenantId, 'settings.geofencing.locations._id': locationId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization or location not found',
      });
      return;
    }

    res.json({
      success: true,
      data: tenant.settings?.geofencing,
      message: 'Location updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete a geo-fence location
export const deleteGeofenceLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { locationId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $pull: { 'settings.geofencing.locations': { _id: locationId } } },
      { new: true }
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
      data: tenant.settings?.geofencing,
      message: 'Location deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get notification settings (for tenant admin)
export const getNotificationSettings = async (
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

    const tenant = await Tenant.findById(tenantId).select('settings.attendanceSettings');
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Return notification-related settings with defaults
    const attendanceSettings = tenant.settings?.attendanceSettings || {};
    const notificationSettings = {
      lateNotificationThreshold: attendanceSettings.lateNotificationThreshold ?? 30,
      enableLateNotifications: attendanceSettings.enableLateNotifications ?? true,
      checkoutReminderThreshold: attendanceSettings.checkoutReminderThreshold ?? 30,
      enableCheckoutReminder: attendanceSettings.enableCheckoutReminder ?? true,
    };

    res.json({
      success: true,
      data: notificationSettings,
    });
  } catch (error) {
    next(error);
  }
};

// Update notification settings (for tenant admin)
export const updateNotificationSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const {
      lateNotificationThreshold,
      enableLateNotifications,
      checkoutReminderThreshold,
      enableCheckoutReminder,
    } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (typeof lateNotificationThreshold === 'number') {
      updateData['settings.attendanceSettings.lateNotificationThreshold'] = lateNotificationThreshold;
    }
    if (typeof enableLateNotifications === 'boolean') {
      updateData['settings.attendanceSettings.enableLateNotifications'] = enableLateNotifications;
    }
    if (typeof checkoutReminderThreshold === 'number') {
      updateData['settings.attendanceSettings.checkoutReminderThreshold'] = checkoutReminderThreshold;
    }
    if (typeof enableCheckoutReminder === 'boolean') {
      updateData['settings.attendanceSettings.enableCheckoutReminder'] = enableCheckoutReminder;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    const attendanceSettings = tenant.settings?.attendanceSettings || {};
    const notificationSettings = {
      lateNotificationThreshold: attendanceSettings.lateNotificationThreshold ?? 30,
      enableLateNotifications: attendanceSettings.enableLateNotifications ?? true,
      checkoutReminderThreshold: attendanceSettings.checkoutReminderThreshold ?? 30,
      enableCheckoutReminder: attendanceSettings.enableCheckoutReminder ?? true,
    };

    res.json({
      success: true,
      data: notificationSettings,
      message: 'Notification settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Internal API: Get notification settings by tenant ID (called by other services)
export const getNotificationSettingsInternal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
      return;
    }

    const tenant = await Tenant.findById(tenantId).select('settings.attendanceSettings');
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Return notification-related settings with defaults
    const attendanceSettings = tenant.settings?.attendanceSettings || {};
    const notificationSettings = {
      lateNotificationThreshold: attendanceSettings.lateNotificationThreshold ?? 30,
      enableLateNotifications: attendanceSettings.enableLateNotifications ?? true,
      checkoutReminderThreshold: attendanceSettings.checkoutReminderThreshold ?? 30,
      enableCheckoutReminder: attendanceSettings.enableCheckoutReminder ?? true,
    };

    res.json({
      success: true,
      data: notificationSettings,
    });
  } catch (error) {
    next(error);
  }
};

// Get payroll settings (for tenant admin)
export const getPayrollSettings = async (
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

    const tenant = await Tenant.findById(tenantId).select('settings.payrollSettings');
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Return payroll settings with defaults
    const payrollSettings = tenant.settings?.payrollSettings || {};
    const hourlyModeSettings = (payrollSettings as any).hourlyModeSettings || {};
    const dailyModeSettings = (payrollSettings as any).dailyModeSettings || {};

    const settings = {
      calculationMode: (payrollSettings as any).calculationMode ?? 'daily',
      hourlyModeSettings: {
        trackOvertimeAutomatically: hourlyModeSettings.trackOvertimeAutomatically ?? true,
        overtimeMultiplier: hourlyModeSettings.overtimeMultiplier ?? 1.5,
        requireOvertimeApproval: hourlyModeSettings.requireOvertimeApproval ?? true,
        holdPayrollForPendingOvertime: hourlyModeSettings.holdPayrollForPendingOvertime ?? true,
        calculateShortfall: hourlyModeSettings.calculateShortfall ?? true,
      },
      dailyModeSettings: {
        countHalfDays: dailyModeSettings.countHalfDays ?? true,
        halfDayThresholdHours: dailyModeSettings.halfDayThresholdHours ?? 4,
        fullDayThresholdHours: dailyModeSettings.fullDayThresholdHours ?? 8,
        deductForAbsence: dailyModeSettings.deductForAbsence ?? true,
        deductForHalfDay: dailyModeSettings.deductForHalfDay ?? true,
      },
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// Update payroll settings (for tenant admin)
export const updatePayrollSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { calculationMode, hourlyModeSettings, dailyModeSettings } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    // Validate calculation mode
    if (calculationMode && !['hourly', 'daily'].includes(calculationMode)) {
      res.status(400).json({
        success: false,
        message: 'Invalid calculation mode. Must be "hourly" or "daily"',
      });
      return;
    }

    const updateData: Record<string, unknown> = {};

    // Update calculation mode
    if (calculationMode) {
      updateData['settings.payrollSettings.calculationMode'] = calculationMode;
    }

    // Update hourly mode settings
    if (hourlyModeSettings) {
      if (typeof hourlyModeSettings.trackOvertimeAutomatically === 'boolean') {
        updateData['settings.payrollSettings.hourlyModeSettings.trackOvertimeAutomatically'] = hourlyModeSettings.trackOvertimeAutomatically;
      }
      if (typeof hourlyModeSettings.overtimeMultiplier === 'number') {
        updateData['settings.payrollSettings.hourlyModeSettings.overtimeMultiplier'] = hourlyModeSettings.overtimeMultiplier;
      }
      if (typeof hourlyModeSettings.requireOvertimeApproval === 'boolean') {
        updateData['settings.payrollSettings.hourlyModeSettings.requireOvertimeApproval'] = hourlyModeSettings.requireOvertimeApproval;
      }
      if (typeof hourlyModeSettings.holdPayrollForPendingOvertime === 'boolean') {
        updateData['settings.payrollSettings.hourlyModeSettings.holdPayrollForPendingOvertime'] = hourlyModeSettings.holdPayrollForPendingOvertime;
      }
      if (typeof hourlyModeSettings.calculateShortfall === 'boolean') {
        updateData['settings.payrollSettings.hourlyModeSettings.calculateShortfall'] = hourlyModeSettings.calculateShortfall;
      }
    }

    // Update daily mode settings
    if (dailyModeSettings) {
      if (typeof dailyModeSettings.countHalfDays === 'boolean') {
        updateData['settings.payrollSettings.dailyModeSettings.countHalfDays'] = dailyModeSettings.countHalfDays;
      }
      if (typeof dailyModeSettings.halfDayThresholdHours === 'number') {
        updateData['settings.payrollSettings.dailyModeSettings.halfDayThresholdHours'] = dailyModeSettings.halfDayThresholdHours;
      }
      if (typeof dailyModeSettings.fullDayThresholdHours === 'number') {
        updateData['settings.payrollSettings.dailyModeSettings.fullDayThresholdHours'] = dailyModeSettings.fullDayThresholdHours;
      }
      if (typeof dailyModeSettings.deductForAbsence === 'boolean') {
        updateData['settings.payrollSettings.dailyModeSettings.deductForAbsence'] = dailyModeSettings.deductForAbsence;
      }
      if (typeof dailyModeSettings.deductForHalfDay === 'boolean') {
        updateData['settings.payrollSettings.dailyModeSettings.deductForHalfDay'] = dailyModeSettings.deductForHalfDay;
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Return updated settings
    const payrollSettings = tenant.settings?.payrollSettings || {};
    const updatedHourlyModeSettings = (payrollSettings as any).hourlyModeSettings || {};
    const updatedDailyModeSettings = (payrollSettings as any).dailyModeSettings || {};

    const settings = {
      calculationMode: (payrollSettings as any).calculationMode ?? 'daily',
      hourlyModeSettings: {
        trackOvertimeAutomatically: updatedHourlyModeSettings.trackOvertimeAutomatically ?? true,
        overtimeMultiplier: updatedHourlyModeSettings.overtimeMultiplier ?? 1.5,
        requireOvertimeApproval: updatedHourlyModeSettings.requireOvertimeApproval ?? true,
        holdPayrollForPendingOvertime: updatedHourlyModeSettings.holdPayrollForPendingOvertime ?? true,
        calculateShortfall: updatedHourlyModeSettings.calculateShortfall ?? true,
      },
      dailyModeSettings: {
        countHalfDays: updatedDailyModeSettings.countHalfDays ?? true,
        halfDayThresholdHours: updatedDailyModeSettings.halfDayThresholdHours ?? 4,
        fullDayThresholdHours: updatedDailyModeSettings.fullDayThresholdHours ?? 8,
        deductForAbsence: updatedDailyModeSettings.deductForAbsence ?? true,
        deductForHalfDay: updatedDailyModeSettings.deductForHalfDay ?? true,
      },
    };

    res.json({
      success: true,
      data: settings,
      message: 'Payroll settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get default week off configuration (for tenant admin)
export const getDefaultWeekOffConfig = async (
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

    const tenant = await Tenant.findById(tenantId).select('settings.defaultWeekOffConfig');
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Return week off config with defaults
    const defaultWeekOffConfig = tenant.settings?.defaultWeekOffConfig || {};

    const config = {
      weekOffDays: (defaultWeekOffConfig as any).weekOffDays ?? [0], // Default: Sunday off
      maxWeekOffsPerWeek: (defaultWeekOffConfig as any).maxWeekOffsPerWeek ?? 1,
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// Update default week off configuration (for tenant admin)
export const updateDefaultWeekOffConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { weekOffDays, maxWeekOffsPerWeek } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context not found',
      });
      return;
    }

    // Validate weekOffDays
    if (weekOffDays !== undefined) {
      if (!Array.isArray(weekOffDays)) {
        res.status(400).json({
          success: false,
          message: 'weekOffDays must be an array',
        });
        return;
      }
      // Validate each day is 0-6
      for (const day of weekOffDays) {
        if (typeof day !== 'number' || day < 0 || day > 6) {
          res.status(400).json({
            success: false,
            message: 'weekOffDays must contain numbers between 0 (Sunday) and 6 (Saturday)',
          });
          return;
        }
      }
    }

    // Validate maxWeekOffsPerWeek
    if (maxWeekOffsPerWeek !== undefined) {
      if (typeof maxWeekOffsPerWeek !== 'number' || maxWeekOffsPerWeek < 0 || maxWeekOffsPerWeek > 7) {
        res.status(400).json({
          success: false,
          message: 'maxWeekOffsPerWeek must be a number between 0 and 7',
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};

    if (weekOffDays !== undefined) {
      updateData['settings.defaultWeekOffConfig.weekOffDays'] = weekOffDays;
    }
    if (maxWeekOffsPerWeek !== undefined) {
      updateData['settings.defaultWeekOffConfig.maxWeekOffsPerWeek'] = maxWeekOffsPerWeek;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // Return updated config
    const defaultWeekOffConfig = tenant.settings?.defaultWeekOffConfig || {};

    const config = {
      weekOffDays: (defaultWeekOffConfig as any).weekOffDays ?? [0],
      maxWeekOffsPerWeek: (defaultWeekOffConfig as any).maxWeekOffsPerWeek ?? 1,
    };

    res.json({
      success: true,
      data: config,
      message: 'Default week off configuration updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
