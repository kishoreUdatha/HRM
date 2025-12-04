import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'tenant_admin' | 'hr' | 'manager' | 'employee';
  permissions: string[];
  avatar?: string;
  employeeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended';
  isEmailVerified: boolean;
  lastLogin?: Date;
  refreshTokens: string[];
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Tenant ID is required'],
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
      enum: ['super_admin', 'tenant_admin', 'hr', 'manager', 'employee'],
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

// Compound index for tenant + email uniqueness
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
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
  delete user.refreshTokens;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
