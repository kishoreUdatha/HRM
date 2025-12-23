import mongoose, { Document, Schema } from 'mongoose';

interface PlanConfig {
  name: string;
  displayName: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  maxEmployees: number;
  maxAdmins: number;
  features: string[];
  isActive: boolean;
}

export interface ISystemSettings extends Document {
  platformName: string;
  platformLogo?: string;
  supportEmail: string;
  supportPhone?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowNewRegistrations: boolean;
  defaultTrialDays: number;
  requireEmailVerification: boolean;
  plans: PlanConfig[];
  emailSettings: {
    fromName: string;
    fromEmail: string;
    smtpHost?: string;
    smtpPort?: number;
  };
  securitySettings: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumber: boolean;
    passwordRequireSpecial: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    require2FA: boolean;
  };
  billingSettings: {
    currency: string;
    taxRate: number;
    invoicePrefix: string;
    paymentGateway: string;
  };
  integrations: {
    stripeEnabled: boolean;
    stripePublishableKey?: string;
    googleAuthEnabled: boolean;
    microsoftAuthEnabled: boolean;
  };
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    platformName: {
      type: String,
      required: true,
      default: 'HRM Platform',
    },
    platformLogo: {
      type: String,
    },
    supportEmail: {
      type: String,
      required: true,
      default: 'support@hrm-platform.com',
    },
    supportPhone: {
      type: String,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: 'We are currently performing scheduled maintenance. Please check back soon.',
    },
    allowNewRegistrations: {
      type: Boolean,
      default: true,
    },
    defaultTrialDays: {
      type: Number,
      default: 14,
      min: 0,
      max: 90,
    },
    requireEmailVerification: {
      type: Boolean,
      default: false,
    },
    plans: [{
      name: { type: String, required: true },
      displayName: { type: String, required: true },
      price: {
        monthly: { type: Number, required: true },
        yearly: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
      },
      maxEmployees: { type: Number, required: true },
      maxAdmins: { type: Number, required: true },
      features: [{ type: String }],
      isActive: { type: Boolean, default: true },
    }],
    emailSettings: {
      fromName: { type: String, default: 'HRM Platform' },
      fromEmail: { type: String, default: 'noreply@hrm-platform.com' },
      smtpHost: { type: String },
      smtpPort: { type: Number },
    },
    securitySettings: {
      passwordMinLength: { type: Number, default: 8 },
      passwordRequireUppercase: { type: Boolean, default: true },
      passwordRequireNumber: { type: Boolean, default: true },
      passwordRequireSpecial: { type: Boolean, default: false },
      sessionTimeout: { type: Number, default: 480 }, // minutes
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDuration: { type: Number, default: 30 }, // minutes
      require2FA: { type: Boolean, default: false },
    },
    billingSettings: {
      currency: { type: String, default: 'USD' },
      taxRate: { type: Number, default: 0 },
      invoicePrefix: { type: String, default: 'INV' },
      paymentGateway: { type: String, default: 'stripe' },
    },
    integrations: {
      stripeEnabled: { type: Boolean, default: false },
      stripePublishableKey: { type: String },
      googleAuthEnabled: { type: Boolean, default: false },
      microsoftAuthEnabled: { type: Boolean, default: false },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
SystemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      platformName: 'HRM Platform',
      supportEmail: 'support@hrm-platform.com',
      plans: [
        {
          name: 'free',
          displayName: 'Free',
          price: { monthly: 0, yearly: 0, currency: 'USD' },
          maxEmployees: 10,
          maxAdmins: 1,
          features: ['employees', 'attendance', 'basic_leaves'],
          isActive: true,
        },
        {
          name: 'starter',
          displayName: 'Starter',
          price: { monthly: 29, yearly: 290, currency: 'USD' },
          maxEmployees: 50,
          maxAdmins: 3,
          features: ['employees', 'attendance', 'leaves', 'basic_payroll', 'reports'],
          isActive: true,
        },
        {
          name: 'professional',
          displayName: 'Professional',
          price: { monthly: 79, yearly: 790, currency: 'USD' },
          maxEmployees: 200,
          maxAdmins: 10,
          features: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
          isActive: true,
        },
        {
          name: 'enterprise',
          displayName: 'Enterprise',
          price: { monthly: 199, yearly: 1990, currency: 'USD' },
          maxEmployees: 10000,
          maxAdmins: 100,
          features: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access', 'custom_integrations', 'sso', 'audit_logs', 'priority_support'],
          isActive: true,
        },
      ],
    });
  }
  return settings;
};

export default mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
