import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveEncashmentPolicy extends Document {
  tenantId: string;
  name: string;
  code: string;
  leaveTypes: string[]; // Leave types eligible for encashment
  encashmentRules: {
    minBalanceRequired: number;
    maxEncashmentDays: number;
    maxEncashmentPerYear: number;
    calculationBasis: 'basic' | 'gross' | 'ctc';
    taxable: boolean;
    taxExemptionLimit?: number;
  };
  eligibility: {
    minServiceMonths: number;
    excludedEmploymentTypes?: string[];
  };
  approvalRequired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveEncashment extends Document {
  tenantId: string;
  employeeId: string;
  encashmentNumber: string;
  leaveType: string;
  daysEncashed: number;
  perDayRate: number;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  calculationBasis: 'basic' | 'gross' | 'ctc';
  basisAmount: number;
  leaveBalanceBefore: number;
  leaveBalanceAfter: number;
  reason: 'voluntary' | 'year_end' | 'separation' | 'policy';
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  paidInPayrollId?: string;
  paidAt?: Date;
  financialYear: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveEncashmentPolicySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  leaveTypes: [{ type: String, required: true }],
  encashmentRules: {
    minBalanceRequired: { type: Number, default: 0 },
    maxEncashmentDays: { type: Number, default: 30 },
    maxEncashmentPerYear: { type: Number, default: 30 },
    calculationBasis: {
      type: String,
      enum: ['basic', 'gross', 'ctc'],
      default: 'basic'
    },
    taxable: { type: Boolean, default: true },
    taxExemptionLimit: Number
  },
  eligibility: {
    minServiceMonths: { type: Number, default: 12 },
    excludedEmploymentTypes: [String]
  },
  approvalRequired: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

LeaveEncashmentPolicySchema.index({ tenantId: 1, code: 1 }, { unique: true });

const LeaveEncashmentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  encashmentNumber: { type: String, required: true, unique: true },
  leaveType: { type: String, required: true },
  daysEncashed: { type: Number, required: true },
  perDayRate: { type: Number, required: true },
  grossAmount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  calculationBasis: {
    type: String,
    enum: ['basic', 'gross', 'ctc'],
    required: true
  },
  basisAmount: { type: Number, required: true },
  leaveBalanceBefore: { type: Number, required: true },
  leaveBalanceAfter: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['voluntary', 'year_end', 'separation', 'policy'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
    default: 'pending'
  },
  appliedAt: { type: Date, default: Date.now },
  approvedBy: String,
  approvedAt: Date,
  rejectionReason: String,
  paidInPayrollId: String,
  paidAt: Date,
  financialYear: { type: String, required: true },
  remarks: String
}, { timestamps: true });

LeaveEncashmentSchema.index({ tenantId: 1, employeeId: 1, financialYear: 1 });
LeaveEncashmentSchema.index({ tenantId: 1, status: 1 });

export const LeaveEncashmentPolicy = mongoose.model<ILeaveEncashmentPolicy>('LeaveEncashmentPolicy', LeaveEncashmentPolicySchema);
export const LeaveEncashment = mongoose.model<ILeaveEncashment>('LeaveEncashment', LeaveEncashmentSchema);
