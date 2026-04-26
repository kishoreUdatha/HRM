import mongoose, { Document, Schema } from 'mongoose';

export interface IPayrollComponent {
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  amount: number;
  isTaxable: boolean;
}

export interface IEmployeeSnapshot {
  firstName: string;
  lastName: string;
  employeeCode: string;
  email?: string;
  department?: string;
}

export interface IPayroll extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employee?: IEmployeeSnapshot;
  month: number;
  year: number;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  baseSalary: number;
  earnings: IPayrollComponent[];
  deductions: IPayrollComponent[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  taxableIncome: number;
  incomeTax: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  // Shift-based calculation fields
  shiftName?: string;
  shiftHours: number;
  expectedHours: number;
  actualWorkedHours: number;
  regularHours: number;
  shortfallHours: number;
  hourlyRate: number;
  regularEarnings: number;
  shortfallDeduction: number;
  // Overtime fields
  overtimeHours: number;
  overtimePay: number;
  pendingOvertimeHours?: number; // Overtime not yet approved
  // Calculation mode used for this payroll
  calculationMode: 'hourly' | 'daily';
  // Payroll hold status
  status: 'draft' | 'processing' | 'processed' | 'paid' | 'cancelled' | 'on_hold';
  holdReason?: 'pending_overtime' | 'pending_leave' | 'manual_hold';
  holdRemarks?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  paidAt?: Date;
  paymentReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollComponentSchema = new Schema<IPayrollComponent>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    type: { type: String, enum: ['earning', 'deduction'], required: true },
    amount: { type: Number, required: true },
    isTaxable: { type: Boolean, default: true },
  },
  { _id: false }
);

const employeeSnapshotSchema = new Schema({
  firstName: String,
  lastName: String,
  employeeCode: String,
  email: String,
  department: String,
}, { _id: false });

const payrollSchema = new Schema<IPayroll>(
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
    employee: employeeSnapshotSchema,
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    payPeriodStart: {
      type: Date,
      required: true,
    },
    payPeriodEnd: {
      type: Date,
      required: true,
    },
    baseSalary: {
      type: Number,
      required: true,
    },
    earnings: [payrollComponentSchema],
    deductions: [payrollComponentSchema],
    grossSalary: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    taxableIncome: {
      type: Number,
      default: 0,
    },
    incomeTax: {
      type: Number,
      default: 0,
    },
    workingDays: {
      type: Number,
      default: 0,
    },
    presentDays: {
      type: Number,
      default: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    lopDays: {
      type: Number,
      default: 0,
    },
    // Shift-based calculation fields
    shiftName: {
      type: String,
    },
    shiftHours: {
      type: Number,
      default: 8,
    },
    expectedHours: {
      type: Number,
      default: 0,
    },
    actualWorkedHours: {
      type: Number,
      default: 0,
    },
    regularHours: {
      type: Number,
      default: 0,
    },
    shortfallHours: {
      type: Number,
      default: 0,
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    regularEarnings: {
      type: Number,
      default: 0,
    },
    shortfallDeduction: {
      type: Number,
      default: 0,
    },
    // Overtime fields
    overtimeHours: {
      type: Number,
      default: 0,
    },
    overtimePay: {
      type: Number,
      default: 0,
    },
    pendingOvertimeHours: {
      type: Number,
      default: 0,
    },
    // Calculation mode used for this payroll
    calculationMode: {
      type: String,
      enum: ['hourly', 'daily'],
      default: 'daily',
    },
    status: {
      type: String,
      enum: ['draft', 'processing', 'processed', 'paid', 'cancelled', 'on_hold'],
      default: 'draft',
    },
    holdReason: {
      type: String,
      enum: ['pending_overtime', 'pending_leave', 'manual_hold'],
    },
    holdRemarks: {
      type: String,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: Date,
    paidAt: Date,
    paymentReference: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

payrollSchema.index({ tenantId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ tenantId: 1, month: 1, year: 1 });
payrollSchema.index({ tenantId: 1, status: 1 });

// Calculate totals before saving
payrollSchema.pre('save', function (next) {
  // For shift-based calculation:
  // - baseSalary is now calculated based on regular hours worked
  // - shortfallDeduction is already accounted for in the prorated baseSalary
  // - overtimePay only includes approved overtime
  const earningsTotal = this.earnings.reduce((sum, e) => sum + e.amount, 0);
  this.grossSalary = this.baseSalary + earningsTotal + this.overtimePay;
  this.totalDeductions = this.deductions.reduce((sum, d) => sum + d.amount, 0) + this.incomeTax;
  this.netSalary = this.grossSalary - this.totalDeductions;
  this.taxableIncome = this.baseSalary + this.earnings.filter(e => e.isTaxable).reduce((sum, e) => sum + e.amount, 0);
  next();
});

export default mongoose.model<IPayroll>('Payroll', payrollSchema);
