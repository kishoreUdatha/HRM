import mongoose, { Document, Schema } from 'mongoose';

export interface IDocumentTemplate extends Document {
  tenantId: string;
  name: string;
  description: string;
  category: string;
  type: 'offer_letter' | 'contract' | 'policy' | 'certificate' | 'form' | 'letter' | 'custom';
  content: string; // HTML or Markdown with placeholders
  placeholders: {
    key: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'select' | 'employee_field' | 'company_field';
    required: boolean;
    defaultValue?: string;
    options?: string[]; // For select type
    employeeField?: string; // e.g., 'firstName', 'salary', etc.
    companyField?: string; // e.g., 'companyName', 'address', etc.
  }[];
  styling: {
    fontFamily?: string;
    fontSize?: number;
    headerLogo?: string;
    footerText?: string;
    margins?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    paperSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
  };
  signatureConfig?: {
    requiredSignatures: number;
    signaturePositions: {
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      role: string;
      label: string;
    }[];
  };
  workflow?: {
    requiresApproval: boolean;
    approvers: {
      role: string;
      order: number;
    }[];
  };
  isActive: boolean;
  version: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentTemplateSchema = new Schema<IDocumentTemplate>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['offer_letter', 'contract', 'policy', 'certificate', 'form', 'letter', 'custom'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    placeholders: [{
      key: { type: String, required: true },
      label: { type: String, required: true },
      type: {
        type: String,
        enum: ['text', 'date', 'number', 'select', 'employee_field', 'company_field'],
        required: true,
      },
      required: { type: Boolean, default: false },
      defaultValue: String,
      options: [String],
      employeeField: String,
      companyField: String,
    }],
    styling: {
      fontFamily: { type: String, default: 'Arial' },
      fontSize: { type: Number, default: 12 },
      headerLogo: String,
      footerText: String,
      margins: {
        top: { type: Number, default: 72 },
        right: { type: Number, default: 72 },
        bottom: { type: Number, default: 72 },
        left: { type: Number, default: 72 },
      },
      paperSize: { type: String, default: 'A4' },
      orientation: { type: String, default: 'portrait' },
    },
    signatureConfig: {
      requiredSignatures: Number,
      signaturePositions: [{
        page: Number,
        x: Number,
        y: Number,
        width: Number,
        height: Number,
        role: String,
        label: String,
      }],
    },
    workflow: {
      requiresApproval: { type: Boolean, default: false },
      approvers: [{
        role: String,
        order: Number,
      }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DocumentTemplateSchema.index({ tenantId: 1, type: 1 });
DocumentTemplateSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IDocumentTemplate>('DocumentTemplate', DocumentTemplateSchema);
