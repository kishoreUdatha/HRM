import mongoose, { Document, Schema } from 'mongoose';

// Advance Tax Installment Interface
export interface IAdvanceTaxInstallment {
  quarter: 1 | 2 | 3 | 4;
  dueDate: Date;
  cumulativePercentage: number;  // 15, 45, 75, 100
  installmentPercentage: number;  // 15, 30, 30, 25
  estimatedAmount: number;
  paidAmount: number;
  status: 'upcoming' | 'due' | 'overdue' | 'paid' | 'partially_paid';
  paymentIds: string[];
  remindersSent: {
    daysBefore: number;
    sentAt: Date;
    channel: string;
  }[];
}

// Income Breakdown Interface
export interface IIncomeBreakdown {
  salary: number;
  houseProperty: number;
  capitalGains: {
    shortTerm: number;
    longTerm: number;
  };
  businessIncome: number;
  otherSources: number;
}

// Deductions Breakdown Interface
export interface IDeductionsBreakdown {
  section80C: number;
  section80D: number;
  section80CCD: number;
  section80E: number;
  section80G: number;
  section80TTA_TTB: number;
  section24: number;
  standardDeduction: number;
  other: number;
}

// Reconciliation Interface
export interface IReconciliation {
  actualTaxLiability: number;
  totalAdvanceTaxPaid: number;
  totalTDSDeducted: number;
  totalTaxPaid: number;
  balanceTax: number;
  refundDue: number;
  interest234A: number;  // Interest for late filing
  interest234B: number;  // Interest for default in advance tax
  interest234C: number;  // Interest for deferment
  totalInterest: number;
  reconciliationDate: Date;
  status: 'pending' | 'completed' | 'discrepancy';
  notes?: string;
}

// Advance Tax Schedule Interface
export interface IAdvanceTaxSchedule extends Document {
  tenantId: string;
  employeeId: string;
  financialYear: string;
  assessmentYear: string;

  // Estimated income
  estimatedAnnualIncome: number;
  incomeBreakdown: IIncomeBreakdown;

  // Deductions
  estimatedDeductions: number;
  deductionsBreakdown: IDeductionsBreakdown;

  // Tax calculation
  estimatedTaxableIncome: number;
  estimatedTotalTax: number;
  estimatedSurcharge: number;
  estimatedCess: number;
  estimatedTDSByEmployer: number;
  estimatedNetTaxPayable: number;

  // Quarterly installments
  installments: IAdvanceTaxInstallment[];

  // Reminder settings
  reminderSettings: {
    enabled: boolean;
    daysBefore: number[];
    notificationChannels: ('email' | 'sms' | 'push' | 'whatsapp')[];
  };

  // Reconciliation
  reconciliation?: IReconciliation;

  // Tax regime
  regime: 'old' | 'new';

  // Status
  status: 'draft' | 'active' | 'revised' | 'reconciled' | 'closed';

  // Revision history
  revisionHistory: {
    revisedAt: Date;
    revisedBy: string;
    previousEstimatedTax: number;
    newEstimatedTax: number;
    reason: string;
  }[];

  // Audit fields
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvanceTaxInstallmentSchema = new Schema<IAdvanceTaxInstallment>({
  quarter: { type: Number, required: true, enum: [1, 2, 3, 4] },
  dueDate: { type: Date, required: true },
  cumulativePercentage: { type: Number, required: true },
  installmentPercentage: { type: Number, required: true },
  estimatedAmount: { type: Number, required: true, default: 0 },
  paidAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['upcoming', 'due', 'overdue', 'paid', 'partially_paid'],
    default: 'upcoming'
  },
  paymentIds: { type: [String], default: [] },
  remindersSent: [{
    daysBefore: Number,
    sentAt: Date,
    channel: String
  }]
}, { _id: false });

const IncomeBreakdownSchema = new Schema<IIncomeBreakdown>({
  salary: { type: Number, default: 0 },
  houseProperty: { type: Number, default: 0 },
  capitalGains: {
    shortTerm: { type: Number, default: 0 },
    longTerm: { type: Number, default: 0 }
  },
  businessIncome: { type: Number, default: 0 },
  otherSources: { type: Number, default: 0 }
}, { _id: false });

const DeductionsBreakdownSchema = new Schema<IDeductionsBreakdown>({
  section80C: { type: Number, default: 0 },
  section80D: { type: Number, default: 0 },
  section80CCD: { type: Number, default: 0 },
  section80E: { type: Number, default: 0 },
  section80G: { type: Number, default: 0 },
  section80TTA_TTB: { type: Number, default: 0 },
  section24: { type: Number, default: 0 },
  standardDeduction: { type: Number, default: 50000 },
  other: { type: Number, default: 0 }
}, { _id: false });

const ReconciliationSchema = new Schema<IReconciliation>({
  actualTaxLiability: { type: Number, required: true },
  totalAdvanceTaxPaid: { type: Number, required: true },
  totalTDSDeducted: { type: Number, required: true },
  totalTaxPaid: { type: Number, required: true },
  balanceTax: { type: Number, required: true },
  refundDue: { type: Number, default: 0 },
  interest234A: { type: Number, default: 0 },
  interest234B: { type: Number, default: 0 },
  interest234C: { type: Number, default: 0 },
  totalInterest: { type: Number, default: 0 },
  reconciliationDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'discrepancy'],
    default: 'pending'
  },
  notes: { type: String }
}, { _id: false });

const AdvanceTaxScheduleSchema = new Schema<IAdvanceTaxSchedule>({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  financialYear: { type: String, required: true },
  assessmentYear: { type: String, required: true },

  estimatedAnnualIncome: { type: Number, required: true },
  incomeBreakdown: { type: IncomeBreakdownSchema, required: true },

  estimatedDeductions: { type: Number, default: 0 },
  deductionsBreakdown: { type: DeductionsBreakdownSchema, required: true },

  estimatedTaxableIncome: { type: Number, required: true },
  estimatedTotalTax: { type: Number, required: true },
  estimatedSurcharge: { type: Number, default: 0 },
  estimatedCess: { type: Number, default: 0 },
  estimatedTDSByEmployer: { type: Number, default: 0 },
  estimatedNetTaxPayable: { type: Number, required: true },

  installments: { type: [AdvanceTaxInstallmentSchema], required: true },

  reminderSettings: {
    enabled: { type: Boolean, default: true },
    daysBefore: { type: [Number], default: [7, 3, 1] },
    notificationChannels: {
      type: [String],
      enum: ['email', 'sms', 'push', 'whatsapp'],
      default: ['email', 'push']
    }
  },

  reconciliation: { type: ReconciliationSchema },

  regime: {
    type: String,
    enum: ['old', 'new'],
    required: true,
    default: 'new'
  },

  status: {
    type: String,
    enum: ['draft', 'active', 'revised', 'reconciled', 'closed'],
    default: 'draft'
  },

  revisionHistory: [{
    revisedAt: Date,
    revisedBy: String,
    previousEstimatedTax: Number,
    newEstimatedTax: Number,
    reason: String
  }],

  createdBy: { type: String, required: true }
}, {
  timestamps: true
});

// Compound indexes
AdvanceTaxScheduleSchema.index({ tenantId: 1, employeeId: 1, financialYear: 1 }, { unique: true });
AdvanceTaxScheduleSchema.index({ tenantId: 1, status: 1 });
AdvanceTaxScheduleSchema.index({ 'installments.dueDate': 1, 'installments.status': 1 });

// Calculate quarterly installments based on estimated tax
AdvanceTaxScheduleSchema.methods.calculateInstallments = function(): IAdvanceTaxInstallment[] {
  const fyStart = parseInt(this.financialYear.split('-')[0]);
  const netTaxPayable = this.estimatedNetTaxPayable;

  const installments: IAdvanceTaxInstallment[] = [
    {
      quarter: 1,
      dueDate: new Date(fyStart, 5, 15),  // June 15
      cumulativePercentage: 15,
      installmentPercentage: 15,
      estimatedAmount: Math.round(netTaxPayable * 0.15),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    },
    {
      quarter: 2,
      dueDate: new Date(fyStart, 8, 15),  // September 15
      cumulativePercentage: 45,
      installmentPercentage: 30,
      estimatedAmount: Math.round(netTaxPayable * 0.30),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    },
    {
      quarter: 3,
      dueDate: new Date(fyStart, 11, 15),  // December 15
      cumulativePercentage: 75,
      installmentPercentage: 30,
      estimatedAmount: Math.round(netTaxPayable * 0.30),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    },
    {
      quarter: 4,
      dueDate: new Date(fyStart + 1, 2, 15),  // March 15
      cumulativePercentage: 100,
      installmentPercentage: 25,
      estimatedAmount: Math.round(netTaxPayable * 0.25),
      paidAmount: 0,
      status: 'upcoming',
      paymentIds: [],
      remindersSent: []
    }
  ];

  return installments;
};

// Update installment status based on current date
AdvanceTaxScheduleSchema.methods.updateInstallmentStatuses = function(): void {
  const now = new Date();

  for (const installment of this.installments) {
    if (installment.paidAmount >= installment.estimatedAmount) {
      installment.status = 'paid';
    } else if (installment.paidAmount > 0) {
      installment.status = 'partially_paid';
    } else if (now > installment.dueDate) {
      installment.status = 'overdue';
    } else if (now >= new Date(installment.dueDate.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      installment.status = 'due';
    } else {
      installment.status = 'upcoming';
    }
  }
};

// Calculate interest under section 234C (deferment of advance tax)
AdvanceTaxScheduleSchema.methods.calculateInterest234C = function(): number {
  let totalInterest = 0;
  const monthlyRate = 0.01;  // 1% per month

  for (const installment of this.installments) {
    if (installment.paidAmount < installment.estimatedAmount && installment.status === 'overdue') {
      const shortfall = installment.estimatedAmount - installment.paidAmount;
      // Interest is calculated for 3 months per quarter
      const interest = Math.round(shortfall * monthlyRate * 3);
      totalInterest += interest;
    }
  }

  return totalInterest;
};

export default mongoose.model<IAdvanceTaxSchedule>('AdvanceTaxSchedule', AdvanceTaxScheduleSchema);
