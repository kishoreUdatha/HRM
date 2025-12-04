import mongoose, { Schema, Document } from 'mongoose';

export interface IArrearComponent {
  code: string;
  name: string;
  type: 'earning' | 'deduction';
  originalAmount: number;
  revisedAmount: number;
  differenceAmount: number;
}

export interface IArrear extends Document {
  tenantId: string;
  employeeId: string;
  arrearNumber: string;
  arrearType: 'salary_revision' | 'promotion' | 'correction' | 'statutory_update' | 'bonus' | 'allowance' | 'other';
  reason: string;
  referenceId?: string; // Reference to salary revision, etc.
  referenceType?: string;
  period: {
    fromMonth: number;
    fromYear: number;
    toMonth: number;
    toYear: number;
    monthsCount: number;
  };
  components: IArrearComponent[];
  calculation: {
    totalOriginalAmount: number;
    totalRevisedAmount: number;
    grossArrearAmount: number;
    taxOnArrear: number;
    netArrearAmount: number;
  };
  monthlyBreakdown: {
    month: number;
    year: number;
    originalGross: number;
    revisedGross: number;
    difference: number;
  }[];
  status: 'calculated' | 'pending_approval' | 'approved' | 'processed' | 'paid' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  processedInPayrollId?: string;
  processedInMonth?: number;
  processedInYear?: number;
  paidAt?: Date;
  remarks?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ArrearComponentSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['earning', 'deduction'],
    required: true
  },
  originalAmount: { type: Number, required: true },
  revisedAmount: { type: Number, required: true },
  differenceAmount: { type: Number, required: true }
}, { _id: false });

const ArrearSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  arrearNumber: { type: String, required: true, unique: true },
  arrearType: {
    type: String,
    enum: ['salary_revision', 'promotion', 'correction', 'statutory_update', 'bonus', 'allowance', 'other'],
    required: true
  },
  reason: { type: String, required: true },
  referenceId: String,
  referenceType: String,
  period: {
    fromMonth: { type: Number, required: true },
    fromYear: { type: Number, required: true },
    toMonth: { type: Number, required: true },
    toYear: { type: Number, required: true },
    monthsCount: { type: Number, required: true }
  },
  components: [ArrearComponentSchema],
  calculation: {
    totalOriginalAmount: { type: Number, default: 0 },
    totalRevisedAmount: { type: Number, default: 0 },
    grossArrearAmount: { type: Number, default: 0 },
    taxOnArrear: { type: Number, default: 0 },
    netArrearAmount: { type: Number, default: 0 }
  },
  monthlyBreakdown: [{
    month: Number,
    year: Number,
    originalGross: Number,
    revisedGross: Number,
    difference: Number
  }],
  status: {
    type: String,
    enum: ['calculated', 'pending_approval', 'approved', 'processed', 'paid', 'cancelled'],
    default: 'calculated'
  },
  approvedBy: String,
  approvedAt: Date,
  processedInPayrollId: String,
  processedInMonth: Number,
  processedInYear: Number,
  paidAt: Date,
  remarks: String,
  createdBy: { type: String, required: true }
}, { timestamps: true });

ArrearSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
ArrearSchema.index({ tenantId: 1, arrearNumber: 1 });

export default mongoose.model<IArrear>('Arrear', ArrearSchema);
