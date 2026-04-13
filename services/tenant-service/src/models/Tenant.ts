import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  // Company address fields for payslips
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
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
      // Late attendance notification settings
      lateNotificationThreshold: number; // Minutes late before notifying admin (default: 30)
      enableLateNotifications: boolean; // Enable/disable late notifications to admin
      // Checkout reminder settings
      checkoutReminderThreshold: number; // Minutes after shift end to remind employee (default: 30)
      enableCheckoutReminder: boolean; // Enable/disable checkout reminders
    };
    geofencing: {
      enabled: boolean;
      locations: Array<{
        _id?: string;
        name: string;
        latitude: number;
        longitude: number;
        address?: string;
        radius: number;
      }>;
      defaultRadius: number;
      strictMode: boolean;
    };
    // Default roster-based salary settings (applies to all employees unless overridden)
    rosterSettings: {
      enabled: boolean;  // If true, roster-based salary is default for new employees
      defaultMaxRostersPerMonth: number;  // Default max shifts per month
      defaultShiftHours: number;  // Default hours per shift
      defaultCalculationType: 'hourly' | 'per_shift' | 'monthly';
    };
    // Default week off configuration (applies to all employees unless overridden)
    defaultWeekOffConfig: {
      weekOffDays: number[];  // Week off days [0=Sunday, 1=Monday, etc.]
      maxWeekOffsPerWeek: number;  // Max week offs per week (e.g., 1 or 2)
    };
    // Payroll calculation settings (tenant-wide configuration)
    payrollSettings: {
      calculationMode: 'hourly' | 'daily';  // Primary mode for salary calculation
      // Hourly mode settings
      hourlyModeSettings: {
        trackOvertimeAutomatically: boolean;  // Auto-detect overtime from attendance
        overtimeMultiplier: number;  // e.g., 1.5x for overtime pay
        requireOvertimeApproval: boolean;  // Require HR/Admin approval for overtime
        holdPayrollForPendingOvertime: boolean;  // Put payroll on hold if overtime pending
        calculateShortfall: boolean;  // Deduct for hours not worked
      };
      // Daily mode settings
      dailyModeSettings: {
        countHalfDays: boolean;  // Whether to track half days
        halfDayThresholdHours: number;  // Hours worked to count as half day (e.g., 4)
        fullDayThresholdHours: number;  // Hours worked to count as full day (e.g., 8)
        deductForAbsence: boolean;  // Deduct salary for absent days
        deductForHalfDay: boolean;  // Deduct half salary for half days
      };
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
  status: 'active' | 'inactive' | 'suspended';
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
      lowercase: true,
      // Note: unique+sparse not supported properly in Cosmos DB
      // Domain uniqueness should be validated in application code
    },
    logo: {
      type: String,
    },
    // Company address fields for payslips
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
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
        // Late attendance notification settings
        lateNotificationThreshold: { type: Number, default: 30 }, // Minutes
        enableLateNotifications: { type: Boolean, default: true },
        // Checkout reminder settings
        checkoutReminderThreshold: { type: Number, default: 30 }, // Minutes after shift end
        enableCheckoutReminder: { type: Boolean, default: true },
      },
      geofencing: {
        enabled: { type: Boolean, default: false },
        locations: [{
          name: { type: String, required: true },
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
          address: { type: String },
          radius: { type: Number, default: 100 },
        }],
        defaultRadius: { type: Number, default: 100 },
        strictMode: { type: Boolean, default: true },
      },
      // Default roster-based salary settings
      rosterSettings: {
        enabled: { type: Boolean, default: false },  // Monthly salary by default
        defaultMaxRostersPerMonth: { type: Number, default: 4 },  // 4 shifts per month
        defaultShiftHours: { type: Number, default: 8 },  // 8 hours per shift
        defaultCalculationType: {
          type: String,
          enum: ['hourly', 'per_shift', 'monthly'],
          default: 'monthly'
        },
      },
      // Default week off configuration for new employees
      defaultWeekOffConfig: {
        weekOffDays: { type: [Number], default: [0] },  // Default: Sunday off (0=Sunday)
        maxWeekOffsPerWeek: { type: Number, default: 1 },  // Default: 1 week off per week
      },
      // Payroll calculation settings
      payrollSettings: {
        calculationMode: {
          type: String,
          enum: ['hourly', 'daily'],
          default: 'daily',  // Default to simpler day-based calculation
        },
        // Hourly mode settings
        hourlyModeSettings: {
          trackOvertimeAutomatically: { type: Boolean, default: true },
          overtimeMultiplier: { type: Number, default: 1.5 },
          requireOvertimeApproval: { type: Boolean, default: true },
          holdPayrollForPendingOvertime: { type: Boolean, default: true },
          calculateShortfall: { type: Boolean, default: true },
        },
        // Daily mode settings
        dailyModeSettings: {
          countHalfDays: { type: Boolean, default: true },
          halfDayThresholdHours: { type: Number, default: 4 },
          fullDayThresholdHours: { type: Number, default: 8 },
          deductForAbsence: { type: Boolean, default: true },
          deductForHalfDay: { type: Boolean, default: true },
        },
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
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
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

  // Set subscription features based on plan
  if (this.isModified('subscription.plan')) {
    const planFeatures: Record<string, string[]> = {
      free: ['employees', 'attendance', 'basic_leaves'],
      starter: ['employees', 'attendance', 'leaves', 'basic_payroll', 'reports'],
      professional: ['employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access'],
      enterprise: [
        'employees', 'attendance', 'leaves', 'payroll', 'recruitment', 'reports', 'api_access',
        'custom_integrations', 'sso', 'audit_logs',
        // Advanced taxation features - Enterprise only
        'taxation', 'tax_declarations', 'advance_tax', 'tax_verification',
        'pf_management', 'esi_management', 'statutory_compliance',
        'auditor_access', 'ca_services', 'compliance_reports'
      ],
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
