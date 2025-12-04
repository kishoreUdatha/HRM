import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeEntry extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  timesheetId?: mongoose.Types.ObjectId;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  duration: number; // in minutes
  hours: number;
  description: string;
  isBillable: boolean;
  isOvertime: boolean;
  overtimeMultiplier?: number;
  status: 'running' | 'stopped' | 'manual';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>(
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
    projectId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
    },
    taskId: Schema.Types.ObjectId,
    timesheetId: {
      type: Schema.Types.ObjectId,
      ref: 'Timesheet',
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: Date,
    endTime: Date,
    duration: { type: Number, default: 0 }, // in minutes
    hours: { type: Number, default: 0 },
    description: {
      type: String,
      required: true,
    },
    isBillable: { type: Boolean, default: false },
    isOvertime: { type: Boolean, default: false },
    overtimeMultiplier: { type: Number, default: 1.5 },
    status: {
      type: String,
      enum: ['running', 'stopped', 'manual'],
      default: 'manual',
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

timeEntrySchema.index({ tenantId: 1, employeeId: 1, date: 1 });
timeEntrySchema.index({ tenantId: 1, projectId: 1 });

// Calculate hours from duration
timeEntrySchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    this.duration = (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60);
  }
  this.hours = this.duration / 60;
  next();
});

export default mongoose.model<ITimeEntry>('TimeEntry', timeEntrySchema);
