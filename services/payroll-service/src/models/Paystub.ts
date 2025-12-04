import mongoose, { Schema, Document } from 'mongoose';

export interface IEarningComponent {
  code: string;
  name: string;
  type: 'fixed' | 'variable' | 'reimbursement' | 'bonus' | 'arrear';
  amount: number;
  ytdAmount: number;
  taxable: boolean;
}

export interface IDeductionComponent {
  code: string;
  name: string;
  type: 'statutory' | 'voluntary' | 'loan' | 'advance' | 'tax' | 'other';
  employeeAmount: number;
  employerAmount: number;
  ytdEmployeeAmount: number;
  ytdEmployerAmount: number;
}

export interface ITaxDetails {
  regime: 'old' | 'new';
  grossTaxableIncome: number;
  exemptions: number;
  deductions: number;
  netTaxableIncome: number;
  incomeTax: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  taxDeductedThisMonth: number;
  ytdTaxDeducted: number;
  remainingTax: number;
  projectedAnnualTax: number;
}

export interface IPaystub extends Document {
  tenantId: string;
  employeeId: string;
  employeeDetails: {
    name: string;
    employeeCode: string;
    department: string;
    designation: string;
    dateOfJoining: Date;
    pan: string;
    uan?: string;
    bankAccountNumber: string;
    bankName: string;
    ifscCode: string;
  };
  payPeriod: {
    month: number;
    year: number;
    startDate: Date;
    endDate: Date;
    payDate: Date;
    workingDays: number;
    paidDays: number;
    lopDays: number;
  };
  earnings: IEarningComponent[];
  deductions: IDeductionComponent[];
  taxDetails: ITaxDetails;
  summary: {
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
    ytdGrossEarnings: number;
    ytdTotalDeductions: number;
    ytdNetPay: number;
    inWords: string;
  };
  reimbursements?: Array<{
    type: string;
    description: string;
    claimAmount: number;
    approvedAmount: number;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  loans?: Array<{
    loanId: string;
    loanType: string;
    emiAmount: number;
    principalAmount: number;
    interestAmount: number;
    remainingBalance: number;
  }>;
  leaveBalance?: {
    earnedLeave: number;
    sickLeave: number;
    casualLeave: number;
  };
  status: 'draft' | 'processed' | 'approved' | 'paid' | 'cancelled';
  pdfUrl?: string;
  emailSent: boolean;
  emailSentAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EarningComponentSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['fixed', 'variable', 'reimbursement', 'bonus', 'arrear'], required: true },
  amount: { type: Number, required: true },
  ytdAmount: { type: Number, default: 0 },
  taxable: { type: Boolean, default: true }
}, { _id: false });

const DeductionComponentSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['statutory', 'voluntary', 'loan', 'advance', 'tax', 'other'], required: true },
  employeeAmount: { type: Number, required: true },
  employerAmount: { type: Number, default: 0 },
  ytdEmployeeAmount: { type: Number, default: 0 },
  ytdEmployerAmount: { type: Number, default: 0 }
}, { _id: false });

const PaystubSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },

  employeeDetails: {
    name: String,
    employeeCode: String,
    department: String,
    designation: String,
    dateOfJoining: Date,
    pan: String,
    uan: String,
    bankAccountNumber: String,
    bankName: String,
    ifscCode: String
  },

  payPeriod: {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    startDate: Date,
    endDate: Date,
    payDate: Date,
    workingDays: Number,
    paidDays: Number,
    lopDays: { type: Number, default: 0 }
  },

  earnings: [EarningComponentSchema],
  deductions: [DeductionComponentSchema],

  taxDetails: {
    regime: { type: String, enum: ['old', 'new'], default: 'new' },
    grossTaxableIncome: Number,
    exemptions: Number,
    deductions: Number,
    netTaxableIncome: Number,
    incomeTax: Number,
    surcharge: Number,
    cess: Number,
    totalTax: Number,
    taxDeductedThisMonth: Number,
    ytdTaxDeducted: Number,
    remainingTax: Number,
    projectedAnnualTax: Number
  },

  summary: {
    grossEarnings: Number,
    totalDeductions: Number,
    netPay: Number,
    ytdGrossEarnings: Number,
    ytdTotalDeductions: Number,
    ytdNetPay: Number,
    inWords: String
  },

  reimbursements: [{
    type: String,
    description: String,
    claimAmount: Number,
    approvedAmount: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] }
  }],

  loans: [{
    loanId: String,
    loanType: String,
    emiAmount: Number,
    principalAmount: Number,
    interestAmount: Number,
    remainingBalance: Number
  }],

  leaveBalance: {
    earnedLeave: Number,
    sickLeave: Number,
    casualLeave: Number
  },

  status: { type: String, enum: ['draft', 'processed', 'approved', 'paid', 'cancelled'], default: 'draft' },
  pdfUrl: String,
  emailSent: { type: Boolean, default: false },
  emailSentAt: Date,
  approvedBy: String,
  approvedAt: Date
}, { timestamps: true });

PaystubSchema.index({ tenantId: 1, employeeId: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 }, { unique: true });
PaystubSchema.index({ tenantId: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 });

export default mongoose.model<IPaystub>('Paystub', PaystubSchema);
