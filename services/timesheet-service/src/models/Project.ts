import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  clientId?: mongoose.Types.ObjectId;
  clientName?: string;
  managerId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  budget?: {
    hours: number;
    amount: number;
    currency: string;
  };
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  billingType: 'fixed' | 'hourly' | 'non_billable';
  hourlyRate?: number;
  members: {
    employeeId: mongoose.Types.ObjectId;
    role: string;
    allocation: number; // percentage
    startDate: Date;
    endDate?: Date;
    hourlyRate?: number;
  }[];
  tasks: {
    name: string;
    description?: string;
    estimatedHours?: number;
    status: 'todo' | 'in_progress' | 'completed';
    assigneeId?: mongoose.Types.ObjectId;
  }[];
  totalHoursLogged: number;
  totalBillableHours: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
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
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    description: String,
    clientId: Schema.Types.ObjectId,
    clientName: String,
    managerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    budget: {
      hours: Number,
      amount: Number,
      currency: { type: String, default: 'USD' },
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    billingType: {
      type: String,
      enum: ['fixed', 'hourly', 'non_billable'],
      default: 'non_billable',
    },
    hourlyRate: Number,
    members: [{
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
      },
      role: String,
      allocation: { type: Number, default: 100 },
      startDate: Date,
      endDate: Date,
      hourlyRate: Number,
    }],
    tasks: [{
      name: { type: String, required: true },
      description: String,
      estimatedHours: Number,
      status: {
        type: String,
        enum: ['todo', 'in_progress', 'completed'],
        default: 'todo',
      },
      assigneeId: Schema.Types.ObjectId,
    }],
    totalHoursLogged: { type: Number, default: 0 },
    totalBillableHours: { type: Number, default: 0 },
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

projectSchema.index({ tenantId: 1, code: 1 }, { unique: true });
projectSchema.index({ tenantId: 1, status: 1 });
projectSchema.index({ tenantId: 1, 'members.employeeId': 1 });

export default mongoose.model<IProject>('Project', projectSchema);
