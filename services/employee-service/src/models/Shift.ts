import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  startTime: string;  // Format: "HH:mm" (24-hour)
  endTime: string;    // Format: "HH:mm" (24-hour)
  breakDuration: number;  // Minutes
  workingHours: number;   // Calculated total working hours
  isNightShift: boolean;
  allowedLateMinutes: number;
  allowedEarlyLeaveMinutes: number;
  overtimeThreshold: number;  // Minutes after which overtime starts
  weeklyOffDays: number[];    // 0 = Sunday, 1 = Monday, etc.
  color: string;              // For UI display
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Shift name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Shift code is required'],
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:mm'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:mm'],
    },
    breakDuration: {
      type: Number,
      default: 60,  // 1 hour lunch break
      min: 0,
    },
    workingHours: {
      type: Number,
      default: 8,
    },
    isNightShift: {
      type: Boolean,
      default: false,
    },
    allowedLateMinutes: {
      type: Number,
      default: 15,
    },
    allowedEarlyLeaveMinutes: {
      type: Number,
      default: 15,
    },
    overtimeThreshold: {
      type: Number,
      default: 30,  // 30 minutes after shift end
    },
    weeklyOffDays: {
      type: [Number],
      default: [0, 6],  // Sunday and Saturday
      validate: {
        validator: (days: number[]) => days.every(d => d >= 0 && d <= 6),
        message: 'Weekly off days must be between 0 (Sunday) and 6 (Saturday)',
      },
    },
    color: {
      type: String,
      default: '#3B82F6',  // Blue
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for tenant + code
shiftSchema.index({ tenantId: 1, code: 1 }, { unique: true });
shiftSchema.index({ tenantId: 1, name: 1 }, { unique: true });
shiftSchema.index({ tenantId: 1, isActive: 1 });

// Calculate working hours before saving
shiftSchema.pre('save', function () {
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);

  let startMinutes = start[0] * 60 + start[1];
  let endMinutes = end[0] * 60 + end[1];

  // Handle night shift (end time is next day)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
    this.isNightShift = true;
  }

  const totalMinutes = endMinutes - startMinutes - this.breakDuration;
  this.workingHours = Math.round((totalMinutes / 60) * 100) / 100;
});

// Ensure only one default shift per tenant
shiftSchema.pre('save', async function () {
  if (this.isDefault && this.isModified('isDefault')) {
    await mongoose.model('Shift').updateMany(
      { tenantId: this.tenantId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
});

const Shift = mongoose.model<IShift>('Shift', shiftSchema);

export default Shift;
