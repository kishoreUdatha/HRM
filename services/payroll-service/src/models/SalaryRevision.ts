import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryComponent {
  code: string;
  name: string;
  previousAmount: number;
  newAmount: number;
  changePercentage: number;
}

export interface ISalaryRevision extends Document {
  tenantId: string;
  employeeId: string;
  revisionType: 'increment' | 'promotion' | 'adjustment' | 'correction' | 'annual_review';
  effectiveDate: Date;
  previousSalary: {
    basic: number;
    gross: number;
    ctc: number;
    salaryStructureId?: string;
  };
  newSalary: {
    basic: number;
    gross: number;
    ctc: number;
    salaryStructureId?: string;
  };
  components: ISalaryComponent[];
  incrementPercentage: number;
  incrementAmount: number;
  reason: string;
  remarks?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  arrearDetails?: {
    fromDate: Date;
    toDate: Date;
    monthsCount: number;
    arrearAmount: number;
    processed: boolean;
    processedInPayrollId?: string;
  };
  letterGenerated: boolean;
  letterUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryComponentSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  previousAmount: { type: Number, required: true },
  newAmount: { type: Number, required: true },
  changePercentage: { type: Number, default: 0 }
}, { _id: false });

const SalaryRevisionSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  revisionType: {
    type: String,
    enum: ['increment', 'promotion', 'adjustment', 'correction', 'annual_review'],
    required: true
  },
  effectiveDate: { type: Date, required: true },
  previousSalary: {
    basic: { type: Number, required: true },
    gross: { type: Number, required: true },
    ctc: { type: Number, required: true },
    salaryStructureId: String
  },
  newSalary: {
    basic: { type: Number, required: true },
    gross: { type: Number, required: true },
    ctc: { type: Number, required: true },
    salaryStructureId: String
  },
  components: [SalaryComponentSchema],
  incrementPercentage: { type: Number, default: 0 },
  incrementAmount: { type: Number, default: 0 },
  reason: { type: String, required: true },
  remarks: String,
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: String,
  approvedAt: Date,
  rejectionReason: String,
  arrearDetails: {
    fromDate: Date,
    toDate: Date,
    monthsCount: Number,
    arrearAmount: Number,
    processed: { type: Boolean, default: false },
    processedInPayrollId: String
  },
  letterGenerated: { type: Boolean, default: false },
  letterUrl: String,
  createdBy: { type: String, required: true }
}, { timestamps: true });

SalaryRevisionSchema.index({ tenantId: 1, employeeId: 1, effectiveDate: -1 });
SalaryRevisionSchema.index({ tenantId: 1, approvalStatus: 1 });

export default mongoose.model<ISalaryRevision>('SalaryRevision', SalaryRevisionSchema);
