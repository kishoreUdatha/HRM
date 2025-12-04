import mongoose, { Schema, Document } from 'mongoose';

export interface ILoanInstallment {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'partial' | 'waived';
  paidAmount: number;
  paidDate?: Date;
  payrollId?: string;
  remarks?: string;
}

export interface ILoan extends Document {
  tenantId: string;
  employeeId: string;
  loanNumber: string;
  loanType: 'salary_advance' | 'personal_loan' | 'emergency_loan' | 'housing_loan' | 'vehicle_loan' | 'education_loan' | 'other';
  principalAmount: number;
  interestRate: number;
  interestType: 'simple' | 'compound' | 'flat' | 'reducing';
  tenure: number;
  tenureType: 'months' | 'years';
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
  disbursementDate: Date;
  firstEmiDate: Date;
  lastEmiDate: Date;
  status: 'pending_approval' | 'approved' | 'disbursed' | 'active' | 'closed' | 'defaulted' | 'cancelled';
  installments: ILoanInstallment[];
  paidInstallments: number;
  remainingInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  deductFromSalary: boolean;
  maxDeductionPercentage: number;
  purpose: string;
  guarantorDetails?: {
    name: string;
    employeeId?: string;
    relationship: string;
    contactNumber: string;
  };
  documents?: Array<{
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  approvalWorkflow: Array<{
    level: number;
    approverRole: string;
    approverId?: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    actionDate?: Date;
  }>;
  appliedBy: string;
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  disbursedBy?: string;
  disbursedAt?: Date;
  closedAt?: Date;
  closureType?: 'normal' | 'foreclosure' | 'waiver';
  createdAt: Date;
  updatedAt: Date;
}

const LoanInstallmentSchema = new Schema({
  installmentNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  principalAmount: { type: Number, required: true },
  interestAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'waived'],
    default: 'pending'
  },
  paidAmount: { type: Number, default: 0 },
  paidDate: Date,
  payrollId: String,
  remarks: String
}, { _id: false });

const LoanSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  loanNumber: { type: String, required: true, unique: true },
  loanType: {
    type: String,
    enum: ['salary_advance', 'personal_loan', 'emergency_loan', 'housing_loan', 'vehicle_loan', 'education_loan', 'other'],
    required: true
  },
  principalAmount: { type: Number, required: true },
  interestRate: { type: Number, default: 0 },
  interestType: {
    type: String,
    enum: ['simple', 'compound', 'flat', 'reducing'],
    default: 'flat'
  },
  tenure: { type: Number, required: true },
  tenureType: {
    type: String,
    enum: ['months', 'years'],
    default: 'months'
  },
  emiAmount: { type: Number, required: true },
  totalInterest: { type: Number, default: 0 },
  totalPayable: { type: Number, required: true },
  disbursementDate: Date,
  firstEmiDate: Date,
  lastEmiDate: Date,
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'disbursed', 'active', 'closed', 'defaulted', 'cancelled'],
    default: 'pending_approval'
  },
  installments: [LoanInstallmentSchema],
  paidInstallments: { type: Number, default: 0 },
  remainingInstallments: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  deductFromSalary: { type: Boolean, default: true },
  maxDeductionPercentage: { type: Number, default: 50 },
  purpose: { type: String, required: true },
  guarantorDetails: {
    name: String,
    employeeId: String,
    relationship: String,
    contactNumber: String
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
  approvalWorkflow: [{
    level: Number,
    approverRole: String,
    approverId: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date
  }],
  appliedBy: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
  approvedBy: String,
  approvedAt: Date,
  disbursedBy: String,
  disbursedAt: Date,
  closedAt: Date,
  closureType: {
    type: String,
    enum: ['normal', 'foreclosure', 'waiver']
  }
}, { timestamps: true });

LoanSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
LoanSchema.index({ tenantId: 1, loanNumber: 1 });

export default mongoose.model<ILoan>('Loan', LoanSchema);
