import mongoose, { Schema, Document } from 'mongoose';

export interface IFnFComponent {
  code: string;
  name: string;
  type: 'earning' | 'deduction' | 'recovery';
  category: 'salary' | 'bonus' | 'leave_encashment' | 'gratuity' | 'notice_recovery' | 'loan_recovery' | 'advance_recovery' | 'asset_recovery' | 'other';
  amount: number;
  taxable: boolean;
  remarks?: string;
}

export interface IFullAndFinal extends Document {
  tenantId: string;
  employeeId: string;
  fnfNumber: string;
  separationType: 'resignation' | 'termination' | 'retirement' | 'death' | 'absconding' | 'contract_end';
  lastWorkingDate: Date;
  resignationDate?: Date;
  noticePeriodDays: number;
  noticePeriodServed: number;
  noticePeriodShortfall: number;
  employeeDetails: {
    name: string;
    employeeCode: string;
    department: string;
    designation: string;
    dateOfJoining: Date;
    totalServiceDays: number;
    totalServiceYears: number;
  };
  salaryDetails: {
    lastDrawnBasic: number;
    lastDrawnGross: number;
    lastDrawnCTC: number;
  };
  earnings: IFnFComponent[];
  deductions: IFnFComponent[];
  recoveries: IFnFComponent[];
  gratuityDetails?: {
    eligible: boolean;
    yearsOfService: number;
    lastDrawnBasic: number;
    calculatedAmount: number;
    taxableAmount: number;
    exemptAmount: number;
    remarks?: string;
  };
  leaveEncashmentDetails?: {
    leaveType: string;
    balance: number;
    perDayRate: number;
    amount: number;
  }[];
  loanRecoveryDetails?: {
    loanId: string;
    loanNumber: string;
    outstandingAmount: number;
    recoveryAmount: number;
    waivedAmount: number;
  }[];
  noticePeriodRecovery?: {
    daysShort: number;
    perDayRate: number;
    amount: number;
    waived: boolean;
    waivedBy?: string;
    waiverReason?: string;
  };
  assetRecovery?: {
    assetId: string;
    assetName: string;
    assetValue: number;
    returned: boolean;
    recoveryAmount: number;
  }[];
  summary: {
    totalEarnings: number;
    totalDeductions: number;
    totalRecoveries: number;
    netPayable: number;
    inWords: string;
  };
  taxDetails: {
    grossTaxableAmount: number;
    exemptions: number;
    taxableAmount: number;
    tdsDeducted: number;
  };
  status: 'initiated' | 'pending_clearance' | 'pending_approval' | 'approved' | 'processed' | 'paid' | 'cancelled';
  clearances: {
    department: string;
    clearedBy?: string;
    clearedAt?: Date;
    status: 'pending' | 'cleared' | 'rejected';
    remarks?: string;
  }[];
  approvalWorkflow: {
    level: number;
    approverRole: string;
    approverId?: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    actionDate?: Date;
  }[];
  initiatedBy: string;
  initiatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  processedAt?: Date;
  paidAt?: Date;
  paymentMode?: 'bank_transfer' | 'cheque' | 'cash';
  paymentReference?: string;
  exitInterviewCompleted: boolean;
  experienceLetterIssued: boolean;
  relievingLetterIssued: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FnFComponentSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['earning', 'deduction', 'recovery'],
    required: true
  },
  category: {
    type: String,
    enum: ['salary', 'bonus', 'leave_encashment', 'gratuity', 'notice_recovery', 'loan_recovery', 'advance_recovery', 'asset_recovery', 'other'],
    required: true
  },
  amount: { type: Number, required: true },
  taxable: { type: Boolean, default: true },
  remarks: String
}, { _id: false });

const FullAndFinalSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  fnfNumber: { type: String, required: true, unique: true },
  separationType: {
    type: String,
    enum: ['resignation', 'termination', 'retirement', 'death', 'absconding', 'contract_end'],
    required: true
  },
  lastWorkingDate: { type: Date, required: true },
  resignationDate: Date,
  noticePeriodDays: { type: Number, default: 0 },
  noticePeriodServed: { type: Number, default: 0 },
  noticePeriodShortfall: { type: Number, default: 0 },
  employeeDetails: {
    name: { type: String, required: true },
    employeeCode: { type: String, required: true },
    department: String,
    designation: String,
    dateOfJoining: Date,
    totalServiceDays: Number,
    totalServiceYears: Number
  },
  salaryDetails: {
    lastDrawnBasic: Number,
    lastDrawnGross: Number,
    lastDrawnCTC: Number
  },
  earnings: [FnFComponentSchema],
  deductions: [FnFComponentSchema],
  recoveries: [FnFComponentSchema],
  gratuityDetails: {
    eligible: Boolean,
    yearsOfService: Number,
    lastDrawnBasic: Number,
    calculatedAmount: Number,
    taxableAmount: Number,
    exemptAmount: Number,
    remarks: String
  },
  leaveEncashmentDetails: [{
    leaveType: String,
    balance: Number,
    perDayRate: Number,
    amount: Number
  }],
  loanRecoveryDetails: [{
    loanId: String,
    loanNumber: String,
    outstandingAmount: Number,
    recoveryAmount: Number,
    waivedAmount: Number
  }],
  noticePeriodRecovery: {
    daysShort: Number,
    perDayRate: Number,
    amount: Number,
    waived: Boolean,
    waivedBy: String,
    waiverReason: String
  },
  assetRecovery: [{
    assetId: String,
    assetName: String,
    assetValue: Number,
    returned: Boolean,
    recoveryAmount: Number
  }],
  summary: {
    totalEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalRecoveries: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    inWords: String
  },
  taxDetails: {
    grossTaxableAmount: Number,
    exemptions: Number,
    taxableAmount: Number,
    tdsDeducted: Number
  },
  status: {
    type: String,
    enum: ['initiated', 'pending_clearance', 'pending_approval', 'approved', 'processed', 'paid', 'cancelled'],
    default: 'initiated'
  },
  clearances: [{
    department: String,
    clearedBy: String,
    clearedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'cleared', 'rejected'],
      default: 'pending'
    },
    remarks: String
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
  initiatedBy: { type: String, required: true },
  initiatedAt: { type: Date, default: Date.now },
  approvedBy: String,
  approvedAt: Date,
  processedAt: Date,
  paidAt: Date,
  paymentMode: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'cash']
  },
  paymentReference: String,
  exitInterviewCompleted: { type: Boolean, default: false },
  experienceLetterIssued: { type: Boolean, default: false },
  relievingLetterIssued: { type: Boolean, default: false },
  remarks: String
}, { timestamps: true });

FullAndFinalSchema.index({ tenantId: 1, fnfNumber: 1 });
FullAndFinalSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IFullAndFinal>('FullAndFinal', FullAndFinalSchema);
