import mongoose, { Document, Schema } from 'mongoose';

export interface IShiftAssignment extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;
  date: Date;
  originalShiftId?: mongoose.Types.ObjectId;
  isSwapped: boolean;
  swapRequestId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const shiftAssignmentSchema = new Schema<IShiftAssignment>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    shiftId: { type: Schema.Types.ObjectId, required: true, ref: 'Shift' },
    date: { type: Date, required: true },
    originalShiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
    isSwapped: { type: Boolean, default: false },
    swapRequestId: { type: Schema.Types.ObjectId, ref: 'ShiftSwapRequest' },
    notes: String,
  },
  { timestamps: true }
);

shiftAssignmentSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
shiftAssignmentSchema.index({ tenantId: 1, date: 1 });

export default mongoose.model<IShiftAssignment>('ShiftAssignment', shiftAssignmentSchema);
