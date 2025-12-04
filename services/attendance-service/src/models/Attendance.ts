import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'weekend';
  workHours?: number;
  overtimeHours?: number;
  breakDuration?: number;
  notes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  isAutoCheckout?: boolean;
  shiftId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
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
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    checkInLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend'],
      default: 'absent',
    },
    workHours: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    breakDuration: {
      type: Number,
      default: 0,
    },
    notes: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isAutoCheckout: {
      type: Boolean,
      default: false,
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique attendance per employee per day per tenant
attendanceSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, date: 1 });
attendanceSchema.index({ tenantId: 1, employeeId: 1 });

// Calculate work hours before saving
attendanceSchema.pre('save', function (next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut.getTime() - this.checkIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    this.workHours = Math.max(0, diffHours - (this.breakDuration || 0) / 60);

    // Calculate overtime (assuming 8 hours standard)
    const standardHours = 8;
    if (this.workHours > standardHours) {
      this.overtimeHours = this.workHours - standardHours;
    }
  }
  next();
});

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);
