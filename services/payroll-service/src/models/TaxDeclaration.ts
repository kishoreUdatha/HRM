import mongoose, { Schema, Document } from 'mongoose';

export interface ISection80CDeduction {
  type: 'PPF' | 'ELSS' | 'NSC' | 'LIC' | 'HomeLoanPrincipal' | 'TuitionFees' | 'FD_5Year' | 'SSY' | 'NPS_80CCD1' | 'Other';
  description: string;
  declaredAmount: number;
  proofSubmitted: boolean;
  proofUrl?: string;
  verifiedAmount?: number;
  status: 'pending' | 'verified' | 'rejected';
}

export interface ISection80DDeduction {
  type: 'SelfAndFamily' | 'Parents' | 'ParentsSenior' | 'PreventiveHealthCheckup';
  declaredAmount: number;
  proofSubmitted: boolean;
  proofUrl?: string;
  verifiedAmount?: number;
  status: 'pending' | 'verified' | 'rejected';
}

export interface IOtherDeduction {
  section: string;
  type: string;
  description: string;
  declaredAmount: number;
  maxLimit: number;
  proofSubmitted: boolean;
  proofUrl?: string;
  verifiedAmount?: number;
  status: 'pending' | 'verified' | 'rejected';
}

export interface IHRAExemption {
  rentPaidMonthly: number;
  landlordName: string;
  landlordPAN?: string;
  landlordAddress: string;
  cityType: 'metro' | 'non_metro';
  rentAgreementUrl?: string;
  rentReceiptsUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface IHomeLoanInterest {
  loanAccountNumber: string;
  lenderName: string;
  lenderPAN?: string;
  loanType: 'self_occupied' | 'let_out';
  interestPaidAnnual: number;
  principalPaidAnnual: number;
  possessionDate?: Date;
  certificateUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface IPreviousEmployment {
  employerName: string;
  employerPAN: string;
  employerTAN: string;
  fromDate: Date;
  toDate: Date;
  grossSalary: number;
  taxDeducted: number;
  form16Url?: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface IOtherIncome {
  type: 'InterestIncome' | 'RentalIncome' | 'CapitalGains' | 'DividendIncome' | 'Other';
  description: string;
  amount: number;
  taxPaid?: number;
}

export interface ITaxDeclaration extends Document {
  tenantId: string;
  employeeId: string;
  financialYear: string;
  regime: 'old' | 'new';
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'locked';

  section80C: {
    deductions: ISection80CDeduction[];
    totalDeclared: number;
    totalVerified: number;
    maxLimit: number;
  };

  section80D: {
    deductions: ISection80DDeduction[];
    totalDeclared: number;
    totalVerified: number;
    maxLimit: number;
  };

  section80CCD: {
    npsEmployeeContribution: number;
    npsEmployerContribution: number;
    totalDeclared: number;
    maxLimit: number;
    status: 'pending' | 'verified' | 'rejected';
  };

  otherDeductions: IOtherDeduction[];

  hraExemption?: IHRAExemption;

  homeLoanInterest?: IHomeLoanInterest;

  ltaExemption?: {
    claimAmount: number;
    travelDetails: string;
    proofUrl?: string;
    status: 'pending' | 'verified' | 'rejected';
  };

  previousEmployment?: IPreviousEmployment[];

  otherIncome: IOtherIncome[];

  taxComputation: {
    grossSalary: number;
    exemptions: {
      hra: number;
      lta: number;
      standardDeduction: number;
      otherExemptions: number;
    };
    totalExemptions: number;
    netTaxableIncome: number;
    section80CDeductions: number;
    section80DDeductions: number;
    section80CCDDeductions: number;
    otherSectionDeductions: number;
    totalDeductions: number;
    taxableIncome: number;
    incomeTax: number;
    surcharge: number;
    cess: number;
    totalTax: number;
    taxAlreadyPaid: number;
    remainingTax: number;
  };

  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;

  createdAt: Date;
  updatedAt: Date;
}

const Section80CDeductionSchema = new Schema({
  type: { type: String, enum: ['PPF', 'ELSS', 'NSC', 'LIC', 'HomeLoanPrincipal', 'TuitionFees', 'FD_5Year', 'SSY', 'NPS_80CCD1', 'Other'], required: true },
  description: String,
  declaredAmount: { type: Number, required: true },
  proofSubmitted: { type: Boolean, default: false },
  proofUrl: String,
  verifiedAmount: Number,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
}, { _id: false });

const Section80DDeductionSchema = new Schema({
  type: { type: String, enum: ['SelfAndFamily', 'Parents', 'ParentsSenior', 'PreventiveHealthCheckup'], required: true },
  declaredAmount: { type: Number, required: true },
  proofSubmitted: { type: Boolean, default: false },
  proofUrl: String,
  verifiedAmount: Number,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
}, { _id: false });

const OtherDeductionSchema = new Schema({
  section: { type: String, required: true },
  type: String,
  description: String,
  declaredAmount: { type: Number, required: true },
  maxLimit: Number,
  proofSubmitted: { type: Boolean, default: false },
  proofUrl: String,
  verifiedAmount: Number,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
}, { _id: false });

const TaxDeclarationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  financialYear: { type: String, required: true },
  regime: { type: String, enum: ['old', 'new'], default: 'new' },
  status: { type: String, enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'locked'], default: 'draft' },

  section80C: {
    deductions: [Section80CDeductionSchema],
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 150000 }
  },

  section80D: {
    deductions: [Section80DDeductionSchema],
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 100000 }
  },

  section80CCD: {
    npsEmployeeContribution: { type: Number, default: 0 },
    npsEmployerContribution: { type: Number, default: 0 },
    totalDeclared: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 50000 },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  otherDeductions: [OtherDeductionSchema],

  hraExemption: {
    rentPaidMonthly: Number,
    landlordName: String,
    landlordPAN: String,
    landlordAddress: String,
    cityType: { type: String, enum: ['metro', 'non_metro'] },
    rentAgreementUrl: String,
    rentReceiptsUrl: String,
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  homeLoanInterest: {
    loanAccountNumber: String,
    lenderName: String,
    lenderPAN: String,
    loanType: { type: String, enum: ['self_occupied', 'let_out'] },
    interestPaidAnnual: Number,
    principalPaidAnnual: Number,
    possessionDate: Date,
    certificateUrl: String,
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  ltaExemption: {
    claimAmount: Number,
    travelDetails: String,
    proofUrl: String,
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  previousEmployment: [{
    employerName: String,
    employerPAN: String,
    employerTAN: String,
    fromDate: Date,
    toDate: Date,
    grossSalary: Number,
    taxDeducted: Number,
    form16Url: String,
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  }],

  otherIncome: [{
    type: { type: String, enum: ['InterestIncome', 'RentalIncome', 'CapitalGains', 'DividendIncome', 'Other'] },
    description: String,
    amount: Number,
    taxPaid: Number
  }],

  taxComputation: {
    grossSalary: { type: Number, default: 0 },
    exemptions: {
      hra: { type: Number, default: 0 },
      lta: { type: Number, default: 0 },
      standardDeduction: { type: Number, default: 50000 },
      otherExemptions: { type: Number, default: 0 }
    },
    totalExemptions: { type: Number, default: 0 },
    netTaxableIncome: { type: Number, default: 0 },
    section80CDeductions: { type: Number, default: 0 },
    section80DDeductions: { type: Number, default: 0 },
    section80CCDDeductions: { type: Number, default: 0 },
    otherSectionDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    taxableIncome: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    surcharge: { type: Number, default: 0 },
    cess: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    taxAlreadyPaid: { type: Number, default: 0 },
    remainingTax: { type: Number, default: 0 }
  },

  submittedAt: Date,
  approvedBy: String,
  approvedAt: Date,
  comments: String
}, { timestamps: true });

TaxDeclarationSchema.index({ tenantId: 1, employeeId: 1, financialYear: 1 }, { unique: true });

export default mongoose.model<ITaxDeclaration>('TaxDeclaration', TaxDeclarationSchema);
