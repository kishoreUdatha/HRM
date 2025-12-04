import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaveType extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  defaultDays: number;
  maxDays: number;
  carryForward: boolean;
  maxCarryForwardDays: number;
  isPaid: boolean;
  requiresApproval: boolean;
  minDaysNotice: number;
  allowHalfDay: boolean;
  allowNegativeBalance: boolean;
  applicableGender?: 'male' | 'female' | 'all';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const leaveTypeSchema = new Schema<ILeaveType>(
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
    defaultDays: {
      type: Number,
      required: true,
      default: 0,
    },
    maxDays: {
      type: Number,
      required: true,
      default: 30,
    },
    carryForward: {
      type: Boolean,
      default: false,
    },
    maxCarryForwardDays: {
      type: Number,
      default: 0,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    minDaysNotice: {
      type: Number,
      default: 1,
    },
    allowHalfDay: {
      type: Boolean,
      default: true,
    },
    allowNegativeBalance: {
      type: Boolean,
      default: false,
    },
    applicableGender: {
      type: String,
      enum: ['male', 'female', 'all'],
      default: 'all',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

leaveTypeSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<ILeaveType>('LeaveType', leaveTypeSchema);
