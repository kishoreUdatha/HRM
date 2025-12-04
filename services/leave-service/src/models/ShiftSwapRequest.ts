import mongoose, { Document, Schema } from 'mongoose';

export interface IShiftSwapRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  requestNumber: string;
  requesterId: mongoose.Types.ObjectId;
  requesterShiftDate: Date;
  requesterShiftId: mongoose.Types.ObjectId;
  targetEmployeeId?: mongoose.Types.ObjectId;
  targetShiftDate?: Date;
  targetShiftId?: mongoose.Types.ObjectId;
  swapType: 'direct' | 'open';
  reason: string;
  status: 'pending_employee' | 'pending_manager' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  targetEmployeeResponse?: {
    accepted: boolean;
    respondedAt: Date;
    comments?: string;
  };
  managerApproval?: {
    approverId: mongoose.Types.ObjectId;
    approved: boolean;
    actionDate: Date;
    comments?: string;
  };
  interestedEmployees?: {
    employeeId: mongoose.Types.ObjectId;
    shiftDate: Date;
    shiftId: mongoose.Types.ObjectId;
    expressedAt: Date;
  }[];
  selectedInterest?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSwapRequestSchema = new Schema<IShiftSwapRequest>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    requestNumber: { type: String, required: true },
    requesterId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    requesterShiftDate: { type: Date, required: true },
    requesterShiftId: { type: Schema.Types.ObjectId, required: true, ref: 'Shift' },
    targetEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    targetShiftDate: Date,
    targetShiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
    swapType: { type: String, enum: ['direct', 'open'], required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending_employee', 'pending_manager', 'approved', 'rejected', 'cancelled', 'expired'],
      default: 'pending_employee',
    },
    targetEmployeeResponse: {
      accepted: Boolean,
      respondedAt: Date,
      comments: String,
    },
    managerApproval: {
      approverId: Schema.Types.ObjectId,
      approved: Boolean,
      actionDate: Date,
      comments: String,
    },
    interestedEmployees: [{
      employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
      shiftDate: Date,
      shiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
      expressedAt: Date,
    }],
    selectedInterest: Schema.Types.ObjectId,
    expiresAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

shiftSwapRequestSchema.index({ tenantId: 1, requestNumber: 1 }, { unique: true });
shiftSwapRequestSchema.index({ tenantId: 1, requesterId: 1 });
shiftSwapRequestSchema.index({ tenantId: 1, targetEmployeeId: 1 });
shiftSwapRequestSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IShiftSwapRequest>('ShiftSwapRequest', shiftSwapRequestSchema);
