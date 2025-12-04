import mongoose, { Document, Schema } from 'mongoose';

export interface IPolicy extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  category: 'hr' | 'it' | 'security' | 'health_safety' | 'code_of_conduct' | 'travel' | 'expense' | 'leave' | 'other';
  description: string;
  content: string;
  version: string;
  effectiveDate: Date;
  expiryDate?: Date;
  status: 'draft' | 'published' | 'archived';
  targetAudience: {
    departments?: mongoose.Types.ObjectId[];
    employmentTypes?: string[];
    locations?: string[];
    allEmployees: boolean;
  };
  acknowledgementRequired: boolean;
  acknowledgementDeadline?: Date;
  reminderDays?: number[];
  documents?: {
    name: string;
    url: string;
    type: string;
  }[];
  revisionHistory: {
    version: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
    changes: string;
  }[];
  totalAcknowledgements: number;
  pendingAcknowledgements: number;
  createdBy: mongoose.Types.ObjectId;
  publishedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const policySchema = new Schema<IPolicy>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true },
    category: {
      type: String,
      enum: ['hr', 'it', 'security', 'health_safety', 'code_of_conduct', 'travel', 'expense', 'leave', 'other'],
      required: true,
    },
    description: String,
    content: { type: String, required: true },
    version: { type: String, default: '1.0' },
    effectiveDate: { type: Date, required: true },
    expiryDate: Date,
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    targetAudience: {
      departments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
      employmentTypes: [String],
      locations: [String],
      allEmployees: { type: Boolean, default: true },
    },
    acknowledgementRequired: { type: Boolean, default: false },
    acknowledgementDeadline: Date,
    reminderDays: [Number],
    documents: [{ name: String, url: String, type: String }],
    revisionHistory: [{
      version: String,
      changedBy: Schema.Types.ObjectId,
      changedAt: Date,
      changes: String,
    }],
    totalAcknowledgements: { type: Number, default: 0 },
    pendingAcknowledgements: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedBy: Schema.Types.ObjectId,
    publishedAt: Date,
  },
  { timestamps: true }
);

policySchema.index({ tenantId: 1, code: 1 }, { unique: true });
policySchema.index({ tenantId: 1, status: 1 });
policySchema.index({ tenantId: 1, category: 1 });

export default mongoose.model<IPolicy>('Policy', policySchema);
