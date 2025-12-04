import mongoose, { Document, Schema } from 'mongoose';

export interface IGrievance extends Document {
  tenantId: mongoose.Types.ObjectId;
  caseNumber: string;
  reportedBy: mongoose.Types.ObjectId;
  isAnonymous: boolean;
  category: 'harassment' | 'discrimination' | 'workplace_safety' | 'policy_violation' | 'management' | 'compensation' | 'work_environment' | 'interpersonal' | 'ethics' | 'other';
  subcategory?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  description: string;
  involvedParties?: {
    employeeId?: mongoose.Types.ObjectId;
    name: string;
    role: 'accused' | 'witness' | 'victim';
  }[];
  incidentDate?: Date;
  incidentLocation?: string;
  evidence?: { name: string; url: string; type: string; uploadedAt: Date }[];
  status: 'submitted' | 'under_review' | 'investigating' | 'pending_action' | 'resolved' | 'closed' | 'escalated' | 'withdrawn';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  investigation?: {
    startDate: Date;
    endDate?: Date;
    investigator: mongoose.Types.ObjectId;
    findings?: string;
    recommendations?: string;
    interviews?: { employeeId: mongoose.Types.ObjectId; date: Date; notes: string }[];
  };
  resolution?: {
    date: Date;
    description: string;
    actionsTaken: string[];
    resolvedBy: mongoose.Types.ObjectId;
    satisfactionRating?: number;
  };
  timeline: {
    action: string;
    by: mongoose.Types.ObjectId;
    at: Date;
    notes?: string;
  }[];
  escalationHistory?: {
    escalatedTo: mongoose.Types.ObjectId;
    escalatedAt: Date;
    reason: string;
  }[];
  dueDate?: Date;
  slaBreached: boolean;
  confidentialityLevel: 'standard' | 'confidential' | 'highly_confidential';
  createdAt: Date;
  updatedAt: Date;
}

const grievanceSchema = new Schema<IGrievance>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    caseNumber: { type: String, required: true },
    reportedBy: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    isAnonymous: { type: Boolean, default: false },
    category: {
      type: String,
      enum: ['harassment', 'discrimination', 'workplace_safety', 'policy_violation', 'management', 'compensation', 'work_environment', 'interpersonal', 'ethics', 'other'],
      required: true,
    },
    subcategory: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    involvedParties: [{
      employeeId: Schema.Types.ObjectId,
      name: String,
      role: { type: String, enum: ['accused', 'witness', 'victim'] },
    }],
    incidentDate: Date,
    incidentLocation: String,
    evidence: [{ name: String, url: String, type: String, uploadedAt: Date }],
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'investigating', 'pending_action', 'resolved', 'closed', 'escalated', 'withdrawn'],
      default: 'submitted',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    investigation: {
      startDate: Date,
      endDate: Date,
      investigator: Schema.Types.ObjectId,
      findings: String,
      recommendations: String,
      interviews: [{ employeeId: Schema.Types.ObjectId, date: Date, notes: String }],
    },
    resolution: {
      date: Date,
      description: String,
      actionsTaken: [String],
      resolvedBy: Schema.Types.ObjectId,
      satisfactionRating: { type: Number, min: 1, max: 5 },
    },
    timeline: [{
      action: String,
      by: Schema.Types.ObjectId,
      at: { type: Date, default: Date.now },
      notes: String,
    }],
    escalationHistory: [{
      escalatedTo: Schema.Types.ObjectId,
      escalatedAt: Date,
      reason: String,
    }],
    dueDate: Date,
    slaBreached: { type: Boolean, default: false },
    confidentialityLevel: {
      type: String,
      enum: ['standard', 'confidential', 'highly_confidential'],
      default: 'confidential',
    },
  },
  { timestamps: true }
);

grievanceSchema.index({ tenantId: 1, caseNumber: 1 }, { unique: true });
grievanceSchema.index({ tenantId: 1, status: 1 });
grievanceSchema.index({ tenantId: 1, reportedBy: 1 });
grievanceSchema.index({ tenantId: 1, assignedTo: 1 });
grievanceSchema.index({ tenantId: 1, category: 1 });

export default mongoose.model<IGrievance>('Grievance', grievanceSchema);
