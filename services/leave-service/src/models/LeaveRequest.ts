import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaveRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  days: number;
  isHalfDay: boolean;
  halfDayType?: 'first_half' | 'second_half';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 0.5,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDayType: {
      type: String,
      enum: ['first_half', 'second_half'],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    attachments: [String],
  },
  {
    timestamps: true,
  }
);

leaveRequestSchema.index({ tenantId: 1, employeeId: 1 });
leaveRequestSchema.index({ tenantId: 1, status: 1 });
leaveRequestSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });

export default mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
