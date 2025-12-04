import mongoose, { Document, Schema } from 'mongoose';

export interface ITimesheetEntry {
  date: Date;
  projectId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  taskName?: string;
  hours: number;
  description?: string;
  isBillable: boolean;
  billableHours?: number;
  overtime: boolean;
  overtimeType?: 'regular' | 'weekend' | 'holiday';
}

export interface ITimesheet extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  periodType: 'weekly' | 'bi-weekly' | 'monthly';
  entries: ITimesheetEntry[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  billableHours: number;
  nonBillableHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';
  submittedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  comments?: {
    by: mongoose.Types.ObjectId;
    text: string;
    at: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const timesheetEntrySchema = new Schema<ITimesheetEntry>(
  {
    date: {
      type: Date,
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Project',
    },
    taskId: Schema.Types.ObjectId,
    taskName: String,
    hours: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },
    description: String,
    isBillable: { type: Boolean, default: false },
    billableHours: Number,
    overtime: { type: Boolean, default: false },
    overtimeType: {
      type: String,
      enum: ['regular', 'weekend', 'holiday'],
    },
  },
  { _id: true }
);

const timesheetSchema = new Schema<ITimesheet>(
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
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    periodType: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly'],
      default: 'weekly',
    },
    entries: [timesheetEntrySchema],
    totalHours: { type: Number, default: 0 },
    regularHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    billableHours: { type: Number, default: 0 },
    nonBillableHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'locked'],
      default: 'draft',
    },
    submittedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    comments: [{
      by: Schema.Types.ObjectId,
      text: String,
      at: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  }
);

timesheetSchema.index({ tenantId: 1, employeeId: 1, weekStartDate: 1 }, { unique: true });
timesheetSchema.index({ tenantId: 1, status: 1 });
timesheetSchema.index({ tenantId: 1, weekStartDate: 1 });

// Calculate totals before saving
timesheetSchema.pre('save', function (next) {
  this.totalHours = this.entries.reduce((sum, e) => sum + e.hours, 0);
  this.billableHours = this.entries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.billableHours || e.hours), 0);
  this.nonBillableHours = this.totalHours - this.billableHours;
  this.overtimeHours = this.entries.filter(e => e.overtime).reduce((sum, e) => sum + e.hours, 0);
  this.regularHours = this.totalHours - this.overtimeHours;
  next();
});

export default mongoose.model<ITimesheet>('Timesheet', timesheetSchema);
