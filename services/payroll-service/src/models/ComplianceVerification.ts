import mongoose, { Schema, Document } from 'mongoose';

/**
 * Compliance Verification Model
 * Tracks verification status of tax declarations, PF, ESI, and other compliance items
 */

export interface IVerificationItem {
  field: string;
  declaredValue: any;
  verifiedValue?: any;
  status: 'pending' | 'verified' | 'discrepancy' | 'rejected';
  remarks?: string;
  verifiedAt?: Date;
}

export interface IVerificationDocument {
  documentType: string;
  documentName: string;
  documentUrl?: string;
  uploadedAt: Date;
  verified: boolean;
  verificationRemarks?: string;
}

export interface IComplianceVerification extends Document {
  tenantId: string;
  employeeId?: string;  // Optional - some verifications are tenant-level
  employeeName?: string;

  // Verification type
  verificationType:
    | 'tax_declaration'
    | 'advance_tax'
    | 'pf_contribution'
    | 'esi_contribution'
    | 'professional_tax'
    | 'tds_deduction'
    | 'form16'
    | 'form24q'
    | 'pf_return'
    | 'esi_return'
    | 'annual_return';

  // Reference to the source document
  sourceDocumentId: string;  // ID of TaxDeclaration, PayrollRecord, etc.
  sourceDocumentType: string;

  // Financial period
  financialYear: string;
  month?: number;  // For monthly verifications
  quarter?: number;  // For quarterly verifications

  // Verification details
  verificationItems: IVerificationItem[];

  // Supporting documents
  documents: IVerificationDocument[];

  // Overall status
  status: 'pending' | 'in_review' | 'verified' | 'partially_verified' | 'rejected' | 'needs_correction';

  // Summary
  summary: {
    totalItems: number;
    verifiedItems: number;
    pendingItems: number;
    discrepancyItems: number;
    rejectedItems: number;
  };

  // Assignment
  assignedTo?: string;  // Auditor/CA ID
  assignedToName?: string;
  assignedAt?: Date;
  assignedBy?: string;

  // Verification workflow
  submittedAt?: Date;
  submittedBy?: string;
  reviewStartedAt?: Date;
  completedAt?: Date;
  completedBy?: string;

  // Remarks and notes
  overallRemarks?: string;
  internalNotes?: string;  // For auditor use

  // Priority
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Due date for verification
  dueDate?: Date;

  // SLA tracking
  slaBreached: boolean;

  // Revision history
  revisionHistory: {
    revisedAt: Date;
    revisedBy: string;
    action: string;
    previousStatus: string;
    newStatus: string;
    remarks?: string;
  }[];

  // Corrections requested
  correctionsRequested?: {
    requestedAt: Date;
    requestedBy: string;
    items: {
      field: string;
      currentValue: any;
      expectedValue?: any;
      reason: string;
    }[];
    correctionDeadline?: Date;
    correctionStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  };

  createdAt: Date;
  updatedAt: Date;
}

const VerificationItemSchema = new Schema({
  field: { type: String, required: true },
  declaredValue: Schema.Types.Mixed,
  verifiedValue: Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending', 'verified', 'discrepancy', 'rejected'],
    default: 'pending'
  },
  remarks: String,
  verifiedAt: Date
}, { _id: false });

const VerificationDocumentSchema = new Schema({
  documentType: { type: String, required: true },
  documentName: { type: String, required: true },
  documentUrl: String,
  uploadedAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  verificationRemarks: String
}, { _id: false });

const ComplianceVerificationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, index: true },
  employeeName: String,

  verificationType: {
    type: String,
    enum: [
      'tax_declaration', 'advance_tax', 'pf_contribution', 'esi_contribution',
      'professional_tax', 'tds_deduction', 'form16', 'form24q',
      'pf_return', 'esi_return', 'annual_return'
    ],
    required: true
  },

  sourceDocumentId: { type: String, required: true },
  sourceDocumentType: { type: String, required: true },

  financialYear: { type: String, required: true },
  month: Number,
  quarter: Number,

  verificationItems: [VerificationItemSchema],
  documents: [VerificationDocumentSchema],

  status: {
    type: String,
    enum: ['pending', 'in_review', 'verified', 'partially_verified', 'rejected', 'needs_correction'],
    default: 'pending'
  },

  summary: {
    totalItems: { type: Number, default: 0 },
    verifiedItems: { type: Number, default: 0 },
    pendingItems: { type: Number, default: 0 },
    discrepancyItems: { type: Number, default: 0 },
    rejectedItems: { type: Number, default: 0 }
  },

  assignedTo: String,
  assignedToName: String,
  assignedAt: Date,
  assignedBy: String,

  submittedAt: Date,
  submittedBy: String,
  reviewStartedAt: Date,
  completedAt: Date,
  completedBy: String,

  overallRemarks: String,
  internalNotes: String,

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  dueDate: Date,
  slaBreached: { type: Boolean, default: false },

  revisionHistory: [{
    revisedAt: { type: Date, default: Date.now },
    revisedBy: String,
    action: String,
    previousStatus: String,
    newStatus: String,
    remarks: String
  }],

  correctionsRequested: {
    requestedAt: Date,
    requestedBy: String,
    items: [{
      field: String,
      currentValue: Schema.Types.Mixed,
      expectedValue: Schema.Types.Mixed,
      reason: String
    }],
    correctionDeadline: Date,
    correctionStatus: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending'
    }
  }
}, { timestamps: true });

// Indexes
ComplianceVerificationSchema.index({ tenantId: 1, financialYear: 1, verificationType: 1 });
ComplianceVerificationSchema.index({ tenantId: 1, employeeId: 1, financialYear: 1 });
ComplianceVerificationSchema.index({ assignedTo: 1, status: 1 });
ComplianceVerificationSchema.index({ status: 1, dueDate: 1 });
ComplianceVerificationSchema.index({ sourceDocumentId: 1, sourceDocumentType: 1 });

// Pre-save hook to update summary
ComplianceVerificationSchema.pre('save', function() {
  if (this.verificationItems && this.verificationItems.length > 0) {
    this.summary = {
      totalItems: this.verificationItems.length,
      verifiedItems: this.verificationItems.filter(i => i.status === 'verified').length,
      pendingItems: this.verificationItems.filter(i => i.status === 'pending').length,
      discrepancyItems: this.verificationItems.filter(i => i.status === 'discrepancy').length,
      rejectedItems: this.verificationItems.filter(i => i.status === 'rejected').length
    };
  }
});

export default mongoose.model<IComplianceVerification>('ComplianceVerification', ComplianceVerificationSchema);
