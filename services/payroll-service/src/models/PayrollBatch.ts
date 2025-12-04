import mongoose, { Document, Schema } from 'mongoose';

export interface IPayrollBatch extends Document {
  tenantId: string;
  batchNumber: string;
  month: number;
  year: number;
  status: 'draft' | 'processing' | 'processed' | 'approved' | 'paid' | 'cancelled';
  totalEmployees: number;
  processedEmployees: number;
  failedEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  totalEmployerContributions: number;
  payrollIds: mongoose.Types.ObjectId[];
  bankFileGenerated: boolean;
  bankFileName?: string;
  bankFileUrl?: string;
  payslipsGenerated: boolean;
  createdBy: mongoose.Types.ObjectId;
  processedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
  errors: { employeeId: string; error: string; timestamp: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const PayrollBatchSchema = new Schema<IPayrollBatch>({
  tenantId: { type: String, required: true, index: true },
  batchNumber: { type: String, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'processing', 'processed', 'approved', 'paid', 'cancelled'], default: 'draft' },
  totalEmployees: { type: Number, default: 0 },
  processedEmployees: { type: Number, default: 0 },
  failedEmployees: { type: Number, default: 0 },
  totalGrossSalary: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  totalNetSalary: { type: Number, default: 0 },
  totalEmployerContributions: { type: Number, default: 0 },
  payrollIds: [{ type: Schema.Types.ObjectId, ref: 'Payroll' }],
  bankFileGenerated: { type: Boolean, default: false },
  bankFileName: String,
  bankFileUrl: String,
  payslipsGenerated: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  processedBy: Schema.Types.ObjectId,
  approvedBy: Schema.Types.ObjectId,
  processedAt: Date,
  approvedAt: Date,
  paidAt: Date,
  errors: [{ employeeId: String, error: String, timestamp: Date }]
}, { timestamps: true });

PayrollBatchSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model<IPayrollBatch>('PayrollBatch', PayrollBatchSchema);
