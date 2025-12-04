import mongoose, { Document, Schema } from 'mongoose';

export interface IOnboardingTask {
  title: string;
  description: string;
  category: 'documentation' | 'training' | 'it_setup' | 'hr_formalities' | 'team_introduction' | 'asset_allocation' | 'other';
  assigneeType: 'employee' | 'hr' | 'manager' | 'it' | 'admin';
  dueDay: number; // Days from start date
  isMandatory: boolean;
  order: number;
  attachments?: string[];
  formFields?: {
    name: string;
    type: 'text' | 'file' | 'date' | 'select' | 'checkbox';
    required: boolean;
    options?: string[];
  }[];
}

export interface IOnboardingTemplate extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  departmentId?: mongoose.Types.ObjectId;
  designations?: string[];
  employmentTypes?: ('full_time' | 'part_time' | 'contract' | 'intern')[];
  tasks: IOnboardingTask[];
  welcomeMessage?: string;
  buddyRequired: boolean;
  probationDays: number;
  checkpoints: {
    day: number;
    name: string;
    description: string;
  }[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const onboardingTaskSchema = new Schema<IOnboardingTask>(
  {
    title: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: ['documentation', 'training', 'it_setup', 'hr_formalities', 'team_introduction', 'asset_allocation', 'other'],
      default: 'other',
    },
    assigneeType: {
      type: String,
      enum: ['employee', 'hr', 'manager', 'it', 'admin'],
      default: 'employee',
    },
    dueDay: { type: Number, default: 1 },
    isMandatory: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    attachments: [String],
    formFields: [{
      name: String,
      type: { type: String, enum: ['text', 'file', 'date', 'select', 'checkbox'] },
      required: Boolean,
      options: [String],
    }],
  },
  { _id: true }
);

const onboardingTemplateSchema = new Schema<IOnboardingTemplate>(
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
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    designations: [String],
    employmentTypes: [{
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern'],
    }],
    tasks: [onboardingTaskSchema],
    welcomeMessage: String,
    buddyRequired: { type: Boolean, default: false },
    probationDays: { type: Number, default: 90 },
    checkpoints: [{
      day: Number,
      name: String,
      description: String,
    }],
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

onboardingTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });
onboardingTemplateSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IOnboardingTemplate>('OnboardingTemplate', onboardingTemplateSchema);
