import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IFCMToken {
  token: string;
  platform: 'android' | 'ios';
  deviceId: string;
  lastUpdated: Date;
  isActive: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;  // Optional for super_admin
  email: string;
  password: string;
  mobileNumber?: string;
  pin?: string;  // 4-digit PIN for mobile login
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'tenant_admin' | 'hr' | 'manager' | 'employee' | 'auditor' | 'ca';
  permissions: string[];
  avatar?: string;
  employeeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended';
  isEmailVerified: boolean;
  lastLogin?: Date;
  refreshTokens: string[];
  fcmTokens: IFCMToken[];  // FCM tokens for push notifications
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  comparePin(candidatePin: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: [function(this: IUser) {
        // tenantId is not required for super_admin, auditor, or ca (they can work across tenants)
        return !['super_admin', 'auditor', 'ca'].includes(this.role);
      }, 'Tenant ID is required'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    mobileNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit mobile number'],
    },
    pin: {
      type: String,
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    role: {
      type: String,
      enum: ['super_admin', 'tenant_admin', 'hr', 'manager', 'employee', 'auditor', 'ca'],
      default: 'employee',
    },
    permissions: [{
      type: String,
    }],
    avatar: {
      type: String,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    refreshTokens: [{
      type: String,
    }],
    fcmTokens: [{
      token: { type: String, required: true },
      platform: { type: String, enum: ['android', 'ios'], required: true },
      deviceId: { type: String, required: true },
      lastUpdated: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true },
    }],
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for tenant + email uniqueness (only for non-super_admin users)
userSchema.index(
  { tenantId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { tenantId: { $exists: true } }
  }
);

// Separate unique index for super_admin emails (global uniqueness)
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'super_admin' }
  }
);

// Index for mobile number lookup (tenant + mobileNumber)
userSchema.index(
  { tenantId: 1, mobileNumber: 1 },
  {
    sparse: true,
    partialFilterExpression: { mobileNumber: { $exists: true, $ne: null } }
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Hash PIN before saving
userSchema.pre('save', async function () {
  if (!this.isModified('pin') || !this.pin) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Compare PIN method
userSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
  if (!this.pin) return false;
  return bcrypt.compare(candidatePin, this.pin);
};

// Set default permissions based on role
userSchema.pre('save', function () {
  if (this.isModified('role') || this.isNew) {
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['*'],
      tenant_admin: [
        'users:read', 'users:write', 'users:delete',
        'employees:read', 'employees:write', 'employees:delete',
        'attendance:read', 'attendance:write',
        'leaves:read', 'leaves:write', 'leaves:approve',
        'payroll:read', 'payroll:write',
        'reports:read', 'settings:write',
      ],
      hr: [
        'users:read', 'users:write',
        'employees:read', 'employees:write',
        'attendance:read', 'attendance:write',
        'leaves:read', 'leaves:write', 'leaves:approve',
        'payroll:read',
        'reports:read',
      ],
      manager: [
        'employees:read',
        'attendance:read',
        'leaves:read', 'leaves:approve',
        'reports:read',
      ],
      employee: [
        'profile:read', 'profile:write',
        'attendance:read',
        'leaves:read', 'leaves:write',
      ],
      // Auditor role - Read access to compliance and taxation data
      auditor: [
        'employees:read',
        'payroll:read',
        'tax_declarations:read', 'tax_declarations:verify',
        'pf_compliance:read', 'pf_compliance:verify',
        'esi_compliance:read', 'esi_compliance:verify',
        'statutory_compliance:read', 'statutory_compliance:verify',
        'compliance_reports:read', 'compliance_reports:export',
        'audit_logs:read',
      ],
      // CA (Chartered Accountant) role - Full taxation management
      ca: [
        'employees:read',
        'payroll:read', 'payroll:verify',
        'tax_declarations:read', 'tax_declarations:write', 'tax_declarations:verify', 'tax_declarations:approve',
        'advance_tax:read', 'advance_tax:write', 'advance_tax:verify',
        'pf_compliance:read', 'pf_compliance:write', 'pf_compliance:verify', 'pf_compliance:approve',
        'esi_compliance:read', 'esi_compliance:write', 'esi_compliance:verify', 'esi_compliance:approve',
        'statutory_compliance:read', 'statutory_compliance:write', 'statutory_compliance:verify', 'statutory_compliance:approve',
        'compliance_reports:read', 'compliance_reports:write', 'compliance_reports:export',
        'form16:read', 'form16:generate', 'form16:verify',
        'audit_logs:read',
      ],
    };

    if (!this.permissions || this.permissions.length === 0) {
      this.permissions = rolePermissions[this.role] || rolePermissions.employee;
    }
  }
});

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.pin;
  delete user.refreshTokens;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
