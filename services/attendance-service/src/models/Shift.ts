import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  startTime: string; // HH:mm format
  endTime: string;
  breakDuration: number; // in minutes
  graceMinutes: number;
  workingDays: number[]; // 0=Sunday, 1=Monday, etc.
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
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
    startTime: {
      type: String,
      required: true,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    breakDuration: {
      type: Number,
      default: 60, // 1 hour default break
    },
    graceMinutes: {
      type: Number,
      default: 15,
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5], // Monday to Friday
    },
    isDefault: {
      type: Boolean,
      default: false,
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

shiftSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<IShift>('Shift', shiftSchema);
