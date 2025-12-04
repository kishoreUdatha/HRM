import mongoose, { Schema, Document } from 'mongoose';

export interface IOvertimePolicy extends Document {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  rates: {
    regularOvertime: number; // multiplier e.g., 1.5
    weekendOvertime: number;
    holidayOvertime: number;
    nightShiftOvertime: number;
  };
  eligibility: {
    minHoursPerDay: number;
    maxOvertimeHoursPerDay: number;
    maxOvertimeHoursPerMonth: number;
    excludedDesignations?: string[];
    excludedDepartments?: string[];
  };
  approvalRequired: boolean;
  approvalLevels: number;
  calculationBasis: 'basic' | 'gross' | 'fixed_hourly';
  fixedHourlyRate?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IShiftAllowance extends Document {
  tenantId: string;
  name: string;
  code: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'rotational' | 'split';
  timing: {
    startTime: string; // HH:mm format
    endTime: string;
  };
  allowanceType: 'fixed' | 'percentage_of_basic' | 'per_hour';
  allowanceValue: number;
  taxable: boolean;
  eligibleDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOvertimeEntry extends Document {
  tenantId: string;
  employeeId: string;
  date: Date;
  shiftId?: string;
  regularHours: number;
  overtimeHours: number;
  overtimeType: 'regular' | 'weekend' | 'holiday' | 'night';
  rate: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  remarks?: string;
  payrollId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IShiftAssignment extends Document {
  tenantId: string;
  employeeId: string;
  shiftAllowanceId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OvertimePolicySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: String,
  rates: {
    regularOvertime: { type: Number, default: 1.5 },
    weekendOvertime: { type: Number, default: 2 },
    holidayOvertime: { type: Number, default: 2.5 },
    nightShiftOvertime: { type: Number, default: 1.75 }
  },
  eligibility: {
    minHoursPerDay: { type: Number, default: 8 },
    maxOvertimeHoursPerDay: { type: Number, default: 4 },
    maxOvertimeHoursPerMonth: { type: Number, default: 50 },
    excludedDesignations: [String],
    excludedDepartments: [String]
  },
  approvalRequired: { type: Boolean, default: true },
  approvalLevels: { type: Number, default: 1 },
  calculationBasis: {
    type: String,
    enum: ['basic', 'gross', 'fixed_hourly'],
    default: 'basic'
  },
  fixedHourlyRate: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

OvertimePolicySchema.index({ tenantId: 1, code: 1 }, { unique: true });

const ShiftAllowanceSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  shiftType: {
    type: String,
    enum: ['morning', 'afternoon', 'night', 'rotational', 'split'],
    required: true
  },
  timing: {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  allowanceType: {
    type: String,
    enum: ['fixed', 'percentage_of_basic', 'per_hour'],
    default: 'fixed'
  },
  allowanceValue: { type: Number, required: true },
  taxable: { type: Boolean, default: true },
  eligibleDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ShiftAllowanceSchema.index({ tenantId: 1, code: 1 }, { unique: true });

const OvertimeEntrySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  shiftId: String,
  regularHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, required: true },
  overtimeType: {
    type: String,
    enum: ['regular', 'weekend', 'holiday', 'night'],
    default: 'regular'
  },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  approvedBy: String,
  approvedAt: Date,
  rejectionReason: String,
  remarks: String,
  payrollId: String
}, { timestamps: true });

OvertimeEntrySchema.index({ tenantId: 1, employeeId: 1, date: 1 });
OvertimeEntrySchema.index({ tenantId: 1, status: 1 });

const ShiftAssignmentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  shiftAllowanceId: { type: String, required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ShiftAssignmentSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 });

export const OvertimePolicy = mongoose.model<IOvertimePolicy>('OvertimePolicy', OvertimePolicySchema);
export const ShiftAllowance = mongoose.model<IShiftAllowance>('ShiftAllowance', ShiftAllowanceSchema);
export const OvertimeEntry = mongoose.model<IOvertimeEntry>('OvertimeEntry', OvertimeEntrySchema);
export const ShiftAssignment = mongoose.model<IShiftAssignment>('ShiftAssignment', ShiftAssignmentSchema);
