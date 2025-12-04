import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  workingHours: number;
  color?: string;
  isNightShift: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakDuration: { type: Number, default: 60 },
    workingHours: { type: Number, required: true },
    color: String,
    isNightShift: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shiftSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<IShift>('Shift', shiftSchema);
