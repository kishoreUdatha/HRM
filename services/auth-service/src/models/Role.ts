import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      enum: ['tenant_admin', 'hr', 'manager', 'employee'],
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    permissions: [{
      type: String,
    }],
    isSystem: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for tenant + role name uniqueness
roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// Default role configurations
export const DEFAULT_ROLE_PERMISSIONS: Record<string, { displayName: string; description: string; permissions: string[] }> = {
  tenant_admin: {
    displayName: 'Administrator',
    description: 'Full access to all features and settings',
    permissions: ['*'],
  },
  hr: {
    displayName: 'HR Manager',
    description: 'Manage employees, recruitment, attendance, and leaves',
    permissions: [
      'employees:read', 'employees:write', 'employees:delete',
      'attendance:read', 'attendance:write',
      'leaves:read', 'leaves:write', 'leaves:approve',
      'payroll:read', 'payroll:write',
      'recruitment:read', 'recruitment:write',
      'reports:read', 'reports:export',
      'users:read',
    ],
  },
  manager: {
    displayName: 'Manager',
    description: 'Manage team members, approve leaves, view reports',
    permissions: [
      'employees:read',
      'attendance:read', 'attendance:write',
      'leaves:read', 'leaves:approve',
      'reports:read',
    ],
  },
  employee: {
    displayName: 'Employee',
    description: 'Basic access to personal information and self-service features',
    permissions: [
      'attendance:read', 'attendance:checkin',
      'leaves:read', 'leaves:write',
    ],
  },
};

const Role = mongoose.model<IRole>('Role', roleSchema);

export default Role;
