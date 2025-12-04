import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  settings: {
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
    workingDays: number[];
    workingHours: { start: string; end: string };
    leavePolicy: {
      casualLeaves: number;
      sickLeaves: number;
      annualLeaves: number;
      maternityLeaves: number;
      paternityLeaves: number;
      carryForward: boolean;
      maxCarryForward: number;
    };
    attendanceSettings: {
      allowRemoteCheckIn: boolean;
      requireGeolocation: boolean;
      allowFlexibleHours: boolean;
      graceTimeMins: number;
      halfDayHours: number;
      fullDayHours: number;
    };
  };
  subscription: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    maxEmployees: number;
    maxAdmins: number;
    features: string[];
    startDate: Date;
    endDate: Date;
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    currency: string;
  };
  billing: {
    companyName: string;
    address: string;
    taxId?: string;
    email: string;
    phone?: string;
  };
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    domain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },
    logo: {
      type: String,
    },
    settings: {
      timezone: { type: String, default: 'UTC' },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      currency: { type: String, default: 'USD' },
      language: { type: String, default: 'en' },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      leavePolicy: {
        casualLeaves: { type: Number, default: 12 },
        sickLeaves: { type: Number, default: 12 },
        annualLeaves: { type: Number, default: 15 },
        maternityLeaves: { type: Number, default: 90 },
        paternityLeaves: { type: Number, default: 10 },
        carryForward: { type: Boolean, default: true },
        maxCarryForward: { type: Number, default: 5 },
      },
      attendanceSettings: {
        allowRemoteCheckIn: { type: Boolean, default: true },
        requireGeolocation: { type: Boolean, default: false },
        allowFlexibleHours: { type: Boolean, default: false },
        graceTimeMins: { type: Number, default: 15 },
        halfDayHours: { type: Number, default: 4 },
        fullDayHours: { type: Number, default: 8 },
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        default: 'free',
      },
      maxEmployees: { type: Number, default: 10 },
      maxAdmins: { type: Number, default: 1 },
      features: { type: [String], default: ['basic'] },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly',
      },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    billing: {
      companyName: { type: String, default: '' },
      address: { type: String, default: '' },
      taxId: { type: String },
      email: { type: String, default: '' },
      phone: { type: String },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial',
    },
    trialEndsAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from name
tenantSchema.pre('save', function () {
  if (this.isNew && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Set trial end date for new tenants
  if (this.isNew && this.status === 'trial' && !this.trialEndsAt) {
    this.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
  }

  // Set subscription features based on plan
  if (this.isModified('subscription.plan')) {
    const planFeatures: Record<string, string[]> = {
      free: ['employees', 'attendance', 'basic_leaves'],
      starter: ['employees', 'attendance', 'leaves', 'basic_payroll', 'reports'],
      professional: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
      enterprise: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access', 'custom_integrations', 'sso', 'audit_logs'],
    };

    const planLimits: Record<string, { maxEmployees: number; maxAdmins: number }> = {
      free: { maxEmployees: 10, maxAdmins: 1 },
      starter: { maxEmployees: 50, maxAdmins: 3 },
      professional: { maxEmployees: 200, maxAdmins: 10 },
      enterprise: { maxEmployees: 10000, maxAdmins: 100 },
    };

    this.subscription.features = planFeatures[this.subscription.plan] || planFeatures.free;
    this.subscription.maxEmployees = planLimits[this.subscription.plan]?.maxEmployees || 10;
    this.subscription.maxAdmins = planLimits[this.subscription.plan]?.maxAdmins || 1;
  }
});

// Indexes
tenantSchema.index({ slug: 1 });
tenantSchema.index({ domain: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'subscription.plan': 1 });

const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);

export default Tenant;
