import mongoose, { Document, Schema } from 'mongoose';

export interface IOffboardingTask {
  taskId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: 'documentation' | 'asset_return' | 'knowledge_transfer' | 'access_revocation' | 'exit_interview' | 'final_settlement' | 'other';
  assigneeType: 'employee' | 'hr' | 'manager' | 'it' | 'finance' | 'admin';
  assigneeId?: mongoose.Types.ObjectId;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
  isMandatory: boolean;
  notes?: string;
  attachments?: string[];
}

export interface IOffboarding extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  separationType: 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'layoff' | 'death' | 'absconding';
  resignationDate?: Date;
  lastWorkingDate: Date;
  noticePeriodDays: number;
  noticePeriodServed: number;
  noticePeriodWaived: boolean;
  noticePeriodBuyout?: number;
  status: 'initiated' | 'in_progress' | 'exit_interview' | 'clearance' | 'settlement' | 'completed' | 'cancelled';
  tasks: IOffboardingTask[];
  exitInterview?: {
    scheduledDate?: Date;
    conductedDate?: Date;
    conductedBy?: mongoose.Types.ObjectId;
    reasonForLeaving: string;
    feedback: string;
    wouldRecommend: boolean;
    wouldRejoin: boolean;
    suggestions?: string;
    rating: {
      workEnvironment: number;
      management: number;
      compensation: number;
      growthOpportunities: number;
      workLifeBalance: number;
    };
  };
  assetReturn: {
    assetId: mongoose.Types.ObjectId;
    assetName: string;
    assetType: string;
    returnStatus: 'pending' | 'returned' | 'damaged' | 'lost' | 'waived';
    returnDate?: Date;
    condition?: string;
    remarks?: string;
  }[];
  accessRevocation: {
    system: string;
    status: 'active' | 'revoked';
    revokedAt?: Date;
    revokedBy?: mongoose.Types.ObjectId;
  }[];
  knowledgeTransfer: {
    topic: string;
    transferTo: mongoose.Types.ObjectId;
    status: 'pending' | 'in_progress' | 'completed';
    documents?: string[];
    completedAt?: Date;
  }[];
  clearance: {
    department: string;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    status: 'pending' | 'approved' | 'rejected';
    remarks?: string;
  }[];
  finalSettlement: {
    basicSalary: number;
    leaveEncashment: number;
    bonus: number;
    gratuity: number;
    otherEarnings: number;
    deductions: number;
    recoveries: number;
    netPayable: number;
    status: 'pending' | 'calculated' | 'approved' | 'processed' | 'paid';
    processedAt?: Date;
    paymentReference?: string;
  };
  documents: {
    type: 'resignation_letter' | 'acceptance_letter' | 'experience_letter' | 'relieving_letter' | 'noc' | 'fnf_statement' | 'other';
    name: string;
    url?: string;
    generatedAt?: Date;
    status: 'pending' | 'generated' | 'issued';
  }[];
  rehireEligibility: boolean;
  rehireRemarks?: string;
  overallProgress: number;
  initiatedBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const offboardingTaskSchema = new Schema(
  {
    taskId: Schema.Types.ObjectId,
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
    assigneeId: Schema.Types.ObjectId,
    dueDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'blocked'],
      default: 'pending',
    },
    isMandatory: { type: Boolean, default: true },
    notes: String,
    attachments: [String],
  },
  { _id: true }
);

const offboardingSchema = new Schema<IOffboarding>(
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
    separationType: {
      type: String,
      enum: ['resignation', 'termination', 'retirement', 'contract_end', 'layoff', 'death', 'absconding'],
      required: true,
    },
    resignationDate: Date,
    lastWorkingDate: {
      type: Date,
      required: true,
    },
    noticePeriodDays: { type: Number, default: 0 },
    noticePeriodServed: { type: Number, default: 0 },
    noticePeriodWaived: { type: Boolean, default: false },
    noticePeriodBuyout: Number,
    status: {
      type: String,
      enum: ['initiated', 'in_progress', 'exit_interview', 'clearance', 'settlement', 'completed', 'cancelled'],
      default: 'initiated',
    },
    tasks: [offboardingTaskSchema],
    exitInterview: {
      scheduledDate: Date,
      conductedDate: Date,
      conductedBy: Schema.Types.ObjectId,
      reasonForLeaving: String,
      feedback: String,
      wouldRecommend: Boolean,
      wouldRejoin: Boolean,
      suggestions: String,
      rating: {
        workEnvironment: { type: Number, min: 1, max: 5 },
        management: { type: Number, min: 1, max: 5 },
        compensation: { type: Number, min: 1, max: 5 },
        growthOpportunities: { type: Number, min: 1, max: 5 },
        workLifeBalance: { type: Number, min: 1, max: 5 },
      },
    },
    assetReturn: [{
      assetId: Schema.Types.ObjectId,
      assetName: String,
      assetType: String,
      returnStatus: {
        type: String,
        enum: ['pending', 'returned', 'damaged', 'lost', 'waived'],
        default: 'pending',
      },
      returnDate: Date,
      condition: String,
      remarks: String,
    }],
    accessRevocation: [{
      system: String,
      status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active',
      },
      revokedAt: Date,
      revokedBy: Schema.Types.ObjectId,
    }],
    knowledgeTransfer: [{
      topic: String,
      transferTo: Schema.Types.ObjectId,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending',
      },
      documents: [String],
      completedAt: Date,
    }],
    clearance: [{
      department: String,
      approvedBy: Schema.Types.ObjectId,
      approvedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      remarks: String,
    }],
    finalSettlement: {
      basicSalary: { type: Number, default: 0 },
      leaveEncashment: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      gratuity: { type: Number, default: 0 },
      otherEarnings: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      recoveries: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['pending', 'calculated', 'approved', 'processed', 'paid'],
        default: 'pending',
      },
      processedAt: Date,
      paymentReference: String,
    },
    documents: [{
      type: {
        type: String,
        enum: ['resignation_letter', 'acceptance_letter', 'experience_letter', 'relieving_letter', 'noc', 'fnf_statement', 'other'],
      },
      name: String,
      url: String,
      generatedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'generated', 'issued'],
        default: 'pending',
      },
    }],
    rehireEligibility: { type: Boolean, default: true },
    rehireRemarks: String,
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

offboardingSchema.index({ tenantId: 1, employeeId: 1 });
offboardingSchema.index({ tenantId: 1, status: 1 });
offboardingSchema.index({ tenantId: 1, lastWorkingDate: 1 });

// Calculate overall progress
offboardingSchema.pre('save', function (next) {
  const completedTasks = this.tasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
  const totalTasks = this.tasks.length || 1;
  this.overallProgress = Math.round((completedTasks / totalTasks) * 100);
  next();
});

export default mongoose.model<IOffboarding>('Offboarding', offboardingSchema);
