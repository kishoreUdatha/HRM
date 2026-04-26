import mongoose, { Schema, Document } from 'mongoose';

/**
 * Auditor Assignment Model
 * Links auditors/CAs to tenants they can access for compliance verification
 */

export interface IAuditorAssignment extends Document {
  auditorId: string;  // User ID of the auditor/CA
  auditorEmail: string;
  auditorName: string;
  auditorRole: 'auditor' | 'ca';

  tenantId: string;  // Tenant they are assigned to
  tenantName: string;

  // Assignment details
  assignedBy: string;  // User ID who made the assignment
  assignedByName: string;
  assignedAt: Date;

  // Access scope
  accessScope: {
    taxDeclarations: boolean;
    advanceTax: boolean;
    pfCompliance: boolean;
    esiCompliance: boolean;
    form16: boolean;
    statutoryReports: boolean;
    employeeData: boolean;  // Can view employee PAN, salary, etc.
  };

  // Financial year access
  financialYears: string[];  // e.g., ['2023-2024', '2024-2025']

  // Status
  status: 'active' | 'inactive' | 'expired' | 'revoked';

  // Validity
  validFrom: Date;
  validTo?: Date;  // Optional expiry

  // Revocation details
  revokedAt?: Date;
  revokedBy?: string;
  revocationReason?: string;

  // Engagement details
  engagementType: 'internal' | 'external';  // Internal auditor vs external CA firm
  firmName?: string;  // For external CAs
  firmGSTIN?: string;
  firmAddress?: string;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AuditorAssignmentSchema = new Schema({
  auditorId: { type: String, required: true, index: true },
  auditorEmail: { type: String, required: true },
  auditorName: { type: String, required: true },
  auditorRole: { type: String, enum: ['auditor', 'ca'], required: true },

  tenantId: { type: String, required: true, index: true },
  tenantName: { type: String, required: true },

  assignedBy: { type: String, required: true },
  assignedByName: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },

  accessScope: {
    taxDeclarations: { type: Boolean, default: true },
    advanceTax: { type: Boolean, default: true },
    pfCompliance: { type: Boolean, default: true },
    esiCompliance: { type: Boolean, default: true },
    form16: { type: Boolean, default: true },
    statutoryReports: { type: Boolean, default: true },
    employeeData: { type: Boolean, default: false }  // Sensitive - default off
  },

  financialYears: [{ type: String }],

  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'revoked'],
    default: 'active'
  },

  validFrom: { type: Date, default: Date.now },
  validTo: { type: Date },

  revokedAt: { type: Date },
  revokedBy: { type: String },
  revocationReason: { type: String },

  engagementType: {
    type: String,
    enum: ['internal', 'external'],
    default: 'external'
  },
  firmName: { type: String },
  firmGSTIN: { type: String },
  firmAddress: { type: String },

  notes: { type: String }
}, { timestamps: true });

// Compound index for auditor + tenant uniqueness
AuditorAssignmentSchema.index({ auditorId: 1, tenantId: 1 }, { unique: true });

// Index for finding all assignments for an auditor
AuditorAssignmentSchema.index({ auditorId: 1, status: 1 });

// Index for finding all auditors for a tenant
AuditorAssignmentSchema.index({ tenantId: 1, status: 1 });

// Auto-expire assignments
AuditorAssignmentSchema.pre('find', function() {
  // This can be used with TTL index or application-level expiry check
});

export default mongoose.model<IAuditorAssignment>('AuditorAssignment', AuditorAssignmentSchema);
