import mongoose, { Document as MongoDoc, Schema } from 'mongoose';

export interface IDocument extends MongoDoc {
  tenantId: string;
  employeeId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  name: string;
  originalName: string;
  description?: string;
  category: 'contract' | 'id_proof' | 'certificate' | 'policy' | 'letter' | 'form' | 'report' | 'other';
  subcategory?: string;
  mimeType: string;
  size: number;
  extension: string;
  storage: {
    provider: 's3' | 'local' | 'azure';
    bucket: string;
    key: string;
    region?: string;
  };
  currentVersion: number;
  versions: {
    version: number;
    key: string;
    size: number;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
    comment?: string;
    checksum: string;
  }[];
  metadata: {
    tags?: string[];
    customFields?: Record<string, any>;
    expiryDate?: Date;
    effectiveDate?: Date;
    isConfidential: boolean;
    retentionPeriod?: number; // in days
  };
  ocr?: {
    isProcessed: boolean;
    extractedText?: string;
    processedAt?: Date;
    language?: string;
    confidence?: number;
  };
  signature?: {
    isSigned: boolean;
    signedBy?: {
      userId: mongoose.Types.ObjectId;
      name: string;
      email: string;
      signedAt: Date;
      ipAddress?: string;
    }[];
    signatureType?: 'electronic' | 'digital';
    certificateId?: string;
    isVerified?: boolean;
  };
  access: {
    visibility: 'private' | 'department' | 'organization' | 'public';
    allowedUsers?: mongoose.Types.ObjectId[];
    allowedRoles?: string[];
    allowedDepartments?: mongoose.Types.ObjectId[];
  };
  workflow?: {
    status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
    reviewers?: {
      userId: mongoose.Types.ObjectId;
      status: 'pending' | 'approved' | 'rejected';
      reviewedAt?: Date;
      comments?: string;
    }[];
    currentStep?: number;
    totalSteps?: number;
  };
  audit: {
    action: 'upload' | 'view' | 'download' | 'edit' | 'delete' | 'share' | 'sign';
    userId: mongoose.Types.ObjectId;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  }[];
  uploadedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['contract', 'id_proof', 'certificate', 'policy', 'letter', 'form', 'report', 'other'],
      required: true,
    },
    subcategory: String,
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    storage: {
      provider: {
        type: String,
        enum: ['s3', 'local', 'azure'],
        default: 's3',
      },
      bucket: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
      region: String,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    versions: [{
      version: { type: Number, required: true },
      key: { type: String, required: true },
      size: { type: Number, required: true },
      uploadedBy: { type: Schema.Types.ObjectId, required: true },
      uploadedAt: { type: Date, default: Date.now },
      comment: String,
      checksum: { type: String, required: true },
    }],
    metadata: {
      tags: [String],
      customFields: Schema.Types.Mixed,
      expiryDate: Date,
      effectiveDate: Date,
      isConfidential: { type: Boolean, default: false },
      retentionPeriod: Number,
    },
    ocr: {
      isProcessed: { type: Boolean, default: false },
      extractedText: String,
      processedAt: Date,
      language: String,
      confidence: Number,
    },
    signature: {
      isSigned: { type: Boolean, default: false },
      signedBy: [{
        userId: Schema.Types.ObjectId,
        name: String,
        email: String,
        signedAt: Date,
        ipAddress: String,
      }],
      signatureType: {
        type: String,
        enum: ['electronic', 'digital'],
      },
      certificateId: String,
      isVerified: Boolean,
    },
    access: {
      visibility: {
        type: String,
        enum: ['private', 'department', 'organization', 'public'],
        default: 'private',
      },
      allowedUsers: [Schema.Types.ObjectId],
      allowedRoles: [String],
      allowedDepartments: [Schema.Types.ObjectId],
    },
    workflow: {
      status: {
        type: String,
        enum: ['draft', 'pending_review', 'approved', 'rejected', 'archived'],
        default: 'draft',
      },
      reviewers: [{
        userId: Schema.Types.ObjectId,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
        },
        reviewedAt: Date,
        comments: String,
      }],
      currentStep: Number,
      totalSteps: Number,
    },
    audit: [{
      action: {
        type: String,
        enum: ['upload', 'view', 'download', 'edit', 'delete', 'share', 'sign'],
        required: true,
      },
      userId: { type: Schema.Types.ObjectId, required: true },
      timestamp: { type: Date, default: Date.now },
      ipAddress: String,
      userAgent: String,
    }],
    uploadedBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: Schema.Types.ObjectId,
  },
  {
    timestamps: true,
  }
);

// Indexes
DocumentSchema.index({ tenantId: 1, category: 1 });
DocumentSchema.index({ tenantId: 1, 'metadata.tags': 1 });
DocumentSchema.index({ tenantId: 1, 'metadata.expiryDate': 1 });
DocumentSchema.index({ tenantId: 1, 'workflow.status': 1 });
DocumentSchema.index({ 'ocr.extractedText': 'text', name: 'text', description: 'text' });

export default mongoose.model<IDocument>('Document', DocumentSchema);
