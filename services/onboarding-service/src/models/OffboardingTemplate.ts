import mongoose, { Document, Schema } from 'mongoose';

export interface IOffboardingTemplateTask {
  title: string;
  description: string;
  category: 'documentation' | 'asset_return' | 'knowledge_transfer' | 'access_revocation' | 'exit_interview' | 'final_settlement' | 'other';
  assigneeType: 'employee' | 'hr' | 'manager' | 'it' | 'finance' | 'admin';
  daysBeforeLWD: number; // Days before last working date
  isMandatory: boolean;
  order: number;
}

export interface IOffboardingTemplate extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  separationTypes: ('resignation' | 'termination' | 'retirement' | 'contract_end' | 'layoff')[];
  tasks: IOffboardingTemplateTask[];
  requiredClearances: string[];
  documentsToGenerate: ('experience_letter' | 'relieving_letter' | 'noc' | 'fnf_statement')[];
  exitInterviewRequired: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const offboardingTemplateTaskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: ['documentation', 'asset_return', 'knowledge_transfer', 'access_revocation', 'exit_interview', 'final_settlement', 'other'],
    },
    assigneeType: {
      type: String,
      enum: ['employee', 'hr', 'manager', 'it', 'finance', 'admin'],
    },
    daysBeforeLWD: { type: Number, default: 0 },
    isMandatory: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const offboardingTemplateSchema = new Schema<IOffboardingTemplate>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    separationTypes: [{
      type: String,
      enum: ['resignation', 'termination', 'retirement', 'contract_end', 'layoff'],
    }],
    tasks: [offboardingTemplateTaskSchema],
    requiredClearances: [String],
    documentsToGenerate: [{
      type: String,
      enum: ['experience_letter', 'relieving_letter', 'noc', 'fnf_statement'],
    }],
    exitInterviewRequired: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

offboardingTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<IOffboardingTemplate>('OffboardingTemplate', offboardingTemplateSchema);
