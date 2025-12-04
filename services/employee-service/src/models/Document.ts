import mongoose, { Document as MongoDocument, Schema } from 'mongoose';

export interface IDocument extends MongoDocument {
  tenantId: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category: 'personal' | 'employment' | 'policy' | 'training' | 'performance' | 'payroll' | 'legal' | 'other';
  type: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  tags?: string[];
  isConfidential: boolean;
  accessLevel: 'public' | 'department' | 'manager' | 'hr_only' | 'employee_only';
  departmentIds?: mongoose.Types.ObjectId[];
  expiryDate?: Date;
  version: number;
  previousVersions?: {
    fileUrl: string;
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
  }[];
  uploadedBy: mongoose.Types.ObjectId;
  acknowledgements?: {
    employeeId: mongoose.Types.ObjectId;
    acknowledgedAt: Date;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['personal', 'employment', 'policy', 'training', 'performance', 'payroll', 'legal', 'other'],
      default: 'other',
    },
    type: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    tags: [String],
    isConfidential: {
      type: Boolean,
      default: false,
    },
    accessLevel: {
      type: String,
      enum: ['public', 'department', 'manager', 'hr_only', 'employee_only'],
      default: 'hr_only',
    },
    departmentIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    expiryDate: Date,
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [{
      fileUrl: String,
      uploadedAt: Date,
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    }],
    uploadedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    acknowledgements: [{
      employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
      acknowledgedAt: Date,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ tenantId: 1, employeeId: 1 });
documentSchema.index({ tenantId: 1, category: 1 });
documentSchema.index({ tenantId: 1, tags: 1 });
documentSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IDocument>('Document', documentSchema);
