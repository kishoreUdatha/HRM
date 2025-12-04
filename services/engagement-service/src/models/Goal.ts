import mongoose, { Schema, Document } from 'mongoose';

export interface IKeyResult {
  id: string;
  title: string;
  description?: string;
  metricType: 'number' | 'percentage' | 'currency' | 'boolean';
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit?: string;
  weight: number;
  status: 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';
  updates: Array<{
    value: number;
    note?: string;
    updatedBy: string;
    updatedAt: Date;
  }>;
}

export interface IGoal extends Document {
  tenantId: string;
  employeeId: string;
  type: 'okr' | 'goal' | 'kpi';
  level: 'company' | 'department' | 'team' | 'individual';
  parentGoalId?: string;
  alignedGoalIds?: string[];
  title: string;
  description: string;
  category?: string;
  keyResults: IKeyResult[];
  period: {
    type: 'quarterly' | 'annual' | 'custom';
    year: number;
    quarter?: number;
    startDate: Date;
    endDate: Date;
  };
  progress: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'deferred';
  priority: 'low' | 'medium' | 'high' | 'critical';
  visibility: 'public' | 'team' | 'private';
  collaborators: Array<{
    employeeId: string;
    role: 'owner' | 'contributor' | 'viewer';
  }>;
  checkIns: Array<{
    date: Date;
    status: string;
    notes: string;
    blockers?: string;
    nextSteps?: string;
    updatedBy: string;
  }>;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const KeyResultSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  metricType: { type: String, enum: ['number', 'percentage', 'currency', 'boolean'], default: 'number' },
  startValue: { type: Number, default: 0 },
  targetValue: { type: Number, required: true },
  currentValue: { type: Number, default: 0 },
  unit: String,
  weight: { type: Number, default: 1 },
  status: { type: String, enum: ['not_started', 'on_track', 'at_risk', 'behind', 'completed'], default: 'not_started' },
  updates: [{
    value: Number,
    note: String,
    updatedBy: String,
    updatedAt: { type: Date, default: Date.now }
  }]
}, { _id: false });

const GoalSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  type: { type: String, enum: ['okr', 'goal', 'kpi'], default: 'okr' },
  level: { type: String, enum: ['company', 'department', 'team', 'individual'], default: 'individual' },
  parentGoalId: { type: Schema.Types.ObjectId, ref: 'Goal' },
  alignedGoalIds: [{ type: Schema.Types.ObjectId, ref: 'Goal' }],
  title: { type: String, required: true },
  description: String,
  category: String,
  keyResults: [KeyResultSchema],
  period: {
    type: { type: String, enum: ['quarterly', 'annual', 'custom'], default: 'quarterly' },
    year: { type: Number, required: true },
    quarter: Number,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled', 'deferred'], default: 'draft' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  visibility: { type: String, enum: ['public', 'team', 'private'], default: 'public' },
  collaborators: [{
    employeeId: String,
    role: { type: String, enum: ['owner', 'contributor', 'viewer'], default: 'contributor' }
  }],
  checkIns: [{
    date: { type: Date, default: Date.now },
    status: String,
    notes: String,
    blockers: String,
    nextSteps: String,
    updatedBy: String
  }],
  tags: [String],
  createdBy: { type: String, required: true }
}, { timestamps: true });

GoalSchema.index({ tenantId: 1, employeeId: 1, 'period.year': 1, 'period.quarter': 1 });
GoalSchema.index({ tenantId: 1, level: 1, status: 1 });
GoalSchema.index({ parentGoalId: 1 });

export default mongoose.model<IGoal>('Goal', GoalSchema);
