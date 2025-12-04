import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaveBalance extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjusted: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const leaveBalanceSchema = new Schema<ILeaveBalance>(
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
    leaveTypeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'LeaveType',
    },
    year: {
      type: Number,
      required: true,
    },
    entitled: {
      type: Number,
      default: 0,
    },
    used: {
      type: Number,
      default: 0,
    },
    pending: {
      type: Number,
      default: 0,
    },
    carriedForward: {
      type: Number,
      default: 0,
    },
    adjusted: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

leaveBalanceSchema.index({ tenantId: 1, employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

// Calculate balance before saving
leaveBalanceSchema.pre('save', function (next) {
  this.balance = this.entitled + this.carriedForward + this.adjusted - this.used - this.pending;
  next();
});

export default mongoose.model<ILeaveBalance>('LeaveBalance', leaveBalanceSchema);
