import mongoose, { Document, Schema } from 'mongoose';

export interface IOnboardingTaskProgress {
  taskId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  assigneeType: string;
  assigneeId?: mongoose.Types.ObjectId;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue';
  isMandatory: boolean;
  notes?: string;
  attachments?: string[];
  formData?: Record<string, unknown>;
}

export interface IOnboarding extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  startDate: Date;
  expectedEndDate: Date;
  actualEndDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  currentPhase: 'pre_boarding' | 'day_one' | 'first_week' | 'first_month' | 'probation' | 'completed';
  tasks: IOnboardingTaskProgress[];
  buddyId?: mongoose.Types.ObjectId;
  mentorId?: mongoose.Types.ObjectId;
  hrContactId?: mongoose.Types.ObjectId;
  welcomeKitSent: boolean;
  welcomeKitItems?: string[];
  documentsCollected: {
    name: string;
    status: 'pending' | 'received' | 'verified';
    url?: string;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
  }[];
  checkpointFeedback: {
    day: number;
    name: string;
    feedback: string;
    rating?: number;
    completedAt: Date;
    conductedBy: mongoose.Types.ObjectId;
  }[];
  overallProgress: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const onboardingTaskProgressSchema = new Schema<IOnboardingTaskProgress>(
  {
    taskId: Schema.Types.ObjectId,
    title: { type: String, required: true },
    description: String,
    category: String,
    assigneeType: String,
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: { type: Date, required: true },
    completedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'overdue'],
      default: 'pending',
    },
    isMandatory: { type: Boolean, default: true },
    notes: String,
    attachments: [String],
    formData: Schema.Types.Mixed,
  },
  { _id: true }
);

const onboardingSchema = new Schema<IOnboarding>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'OnboardingTemplate',
    },
    startDate: {
      type: Date,
      required: true,
    },
    expectedEndDate: {
      type: Date,
      required: true,
    },
    actualEndDate: Date,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'],
      default: 'not_started',
    },
    currentPhase: {
      type: String,
      enum: ['pre_boarding', 'day_one', 'first_week', 'first_month', 'probation', 'completed'],
      default: 'pre_boarding',
    },
    tasks: [onboardingTaskProgressSchema],
    buddyId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    hrContactId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    welcomeKitSent: { type: Boolean, default: false },
    welcomeKitItems: [String],
    documentsCollected: [{
      name: String,
      status: {
        type: String,
        enum: ['pending', 'received', 'verified'],
        default: 'pending',
      },
      url: String,
      verifiedBy: Schema.Types.ObjectId,
      verifiedAt: Date,
    }],
    checkpointFeedback: [{
      day: Number,
      name: String,
      feedback: String,
      rating: { type: Number, min: 1, max: 5 },
      completedAt: Date,
      conductedBy: Schema.Types.ObjectId,
    }],
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    notes: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

onboardingSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
onboardingSchema.index({ tenantId: 1, status: 1 });
onboardingSchema.index({ tenantId: 1, startDate: 1 });

// Calculate overall progress before saving
onboardingSchema.pre('save', function (next) {
  if (this.tasks && this.tasks.length > 0) {
    const completedTasks = this.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
    this.overallProgress = Math.round((completedTasks / this.tasks.length) * 100);
  }
  next();
});

export default mongoose.model<IOnboarding>('Onboarding', onboardingSchema);
