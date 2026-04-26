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

// Section 80E - Education Loan Interest (No limit)
export interface ISection80E {
  loanAccountNumber: string;
  lenderName: string;
  lenderType: 'bank' | 'financial_institution' | 'approved_charitable_institution';
  loanPurpose: 'higher_education_self' | 'higher_education_spouse' | 'higher_education_children' | 'higher_education_student_guardian';
  courseName: string;
  institutionName: string;
  interestPaidDuringYear: number;
  loanStartDate: Date;
  yearOfRepayment: number;  // 1-8 years allowed
  proofUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAmount?: number;
}

// Section 80G - Donations
export interface ISection80GDonation {
  doneeName: string;
  doneeType: '100_no_limit' | '100_with_limit' | '50_with_limit' | '50_no_limit';
  doneeAddress: string;
  doneePAN: string;
  doneeRegistrationNumber?: string;
  donationAmount: number;
  donationDate: Date;
  modeOfPayment: 'cash' | 'cheque' | 'bank_transfer' | 'upi';
  receiptNumber: string;
  receiptDate: Date;
  qualifyingPercentage: 100 | 50;
  qualifyingAmount: number;
  proofUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAmount?: number;
}

export interface ISection80G {
  donations: ISection80GDonation[];
  totalDeclared: number;
  totalVerified: number;
  totalQualifying: number;
  limitedToPercentageOfIncome: boolean;
  qualifyingLimitPercentage: number;  // Usually 10% of adjusted gross total income
}

// Section 80TTA / 80TTB - Interest on Savings
export interface ISection80TTA_TTB {
  isSeniorCitizen: boolean;  // Determines 80TTA (10K) vs 80TTB (50K)
  savingsBankAccounts: {
    bankName: string;
    accountNumber: string;
    interestEarned: number;
  }[];
  fixedDepositInterest?: number;  // Only for 80TTB
  recurringDepositInterest?: number;  // Only for 80TTB
  postOfficeInterest?: number;  // Only for 80TTB
  totalInterest: number;
  maxLimit: number;  // 10000 for 80TTA, 50000 for 80TTB
  claimedAmount: number;
  proofUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAmount?: number;
}

// Section 80EE - First-time Home Buyers
export interface ISection80EE {
  loanAccountNumber: string;
  lenderName: string;
  lenderPAN: string;
  loanSanctionDate: Date;
  loanAmount: number;
  propertyValue: number;
  propertyAddress: string;
  interestPaidDuringYear: number;
  isFirstTimeHomeBuyer: boolean;
  isOnlyHouseOwned: boolean;
  maxLimit: number;  // 50000
  proofUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAmount?: number;
}

// Section 80EEA - Affordable Housing
export interface ISection80EEA {
  loanAccountNumber: string;
  lenderName: string;
  lenderPAN: string;
  loanSanctionDate: Date;
  propertyStampDutyValue: number;
  propertyAddress: string;
  carpetArea?: number;  // In sq meters
  interestPaidDuringYear: number;
  isFirstTimeHomeBuyer: boolean;
  maxLimit: number;  // 150000
  proofUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAmount?: number;
}

// Enhanced Section 24 - Home Loan Interest
export interface ISection24Loan {
  propertyType: 'self_occupied' | 'let_out';
  propertyAddress: string;
  loanAccountNumber: string;
  lenderName: string;
  lenderPAN: string;
  loanType: 'construction' | 'purchase' | 'repair_renovation';
  loanSanctionDate: Date;
  loanAmount: number;
  interestPaidAnnual: number;
  principalPaidAnnual?: number;
  constructionCompletedDate?: Date;
  possessionDate?: Date;
  preConstructionInterest?: number;
  preConstructionInterestClaimYear?: number;  // 1-5 years
  proofUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAmount?: number;
}

export interface ISection24 {
  loans: ISection24Loan[];
  totalInterestSelfOccupied: number;
  totalInterestLetOut: number;
  maxLimitSelfOccupied: number;  // 200000
  totalDeclared: number;
  totalVerified: number;
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

  // New sections
  section80E?: ISection80E;
  section80G?: ISection80G;
  section80TTA_TTB?: ISection80TTA_TTB;
  section80EE?: ISection80EE;
  section80EEA?: ISection80EEA;
  section24?: ISection24;

  hraExemption?: IHRAExemption;

  homeLoanInterest?: IHomeLoanInterest;  // Legacy - use section24 instead

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
    section80EDeductions: number;  // Education loan interest
    section80GDeductions: number;  // Donations
    section80TTADeductions: number;  // Savings interest
    section80EEDeductions: number;  // First-time home buyer
    section80EEADeductions: number;  // Affordable housing
    section24Deductions: number;  // Home loan interest
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

// Section 80E - Education Loan Interest Schema
const Section80ESchema = new Schema({
  loanAccountNumber: { type: String, required: true },
  lenderName: { type: String, required: true },
  lenderType: { type: String, enum: ['bank', 'financial_institution', 'approved_charitable_institution'], required: true },
  loanPurpose: { type: String, enum: ['higher_education_self', 'higher_education_spouse', 'higher_education_children', 'higher_education_student_guardian'], required: true },
  courseName: String,
  institutionName: String,
  interestPaidDuringYear: { type: Number, required: true },
  loanStartDate: Date,
  yearOfRepayment: { type: Number, min: 1, max: 8 },
  proofUrl: String,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedAmount: Number
}, { _id: false });

// Section 80G - Donations Schema
const Section80GDonationSchema = new Schema({
  doneeName: { type: String, required: true },
  doneeType: { type: String, enum: ['100_no_limit', '100_with_limit', '50_with_limit', '50_no_limit'], required: true },
  doneeAddress: String,
  doneePAN: String,
  doneeRegistrationNumber: String,
  donationAmount: { type: Number, required: true },
  donationDate: Date,
  modeOfPayment: { type: String, enum: ['cash', 'cheque', 'bank_transfer', 'upi'] },
  receiptNumber: String,
  receiptDate: Date,
  qualifyingPercentage: { type: Number, enum: [100, 50] },
  qualifyingAmount: Number,
  proofUrl: String,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedAmount: Number
}, { _id: false });

// Section 80TTA/80TTB - Savings Interest Schema
const Section80TTA_TTBSchema = new Schema({
  isSeniorCitizen: { type: Boolean, default: false },
  savingsBankAccounts: [{
    bankName: String,
    accountNumber: String,
    interestEarned: Number
  }],
  fixedDepositInterest: Number,
  recurringDepositInterest: Number,
  postOfficeInterest: Number,
  totalInterest: { type: Number, default: 0 },
  maxLimit: { type: Number, default: 10000 },
  claimedAmount: { type: Number, default: 0 },
  proofUrl: String,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedAmount: Number
}, { _id: false });

// Section 80EE - First-time Home Buyers Schema
const Section80EESchema = new Schema({
  loanAccountNumber: { type: String, required: true },
  lenderName: { type: String, required: true },
  lenderPAN: String,
  loanSanctionDate: Date,
  loanAmount: Number,
  propertyValue: Number,
  propertyAddress: String,
  interestPaidDuringYear: { type: Number, required: true },
  isFirstTimeHomeBuyer: { type: Boolean, default: true },
  isOnlyHouseOwned: { type: Boolean, default: true },
  maxLimit: { type: Number, default: 50000 },
  proofUrl: String,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedAmount: Number
}, { _id: false });

// Section 80EEA - Affordable Housing Schema
const Section80EEASchema = new Schema({
  loanAccountNumber: { type: String, required: true },
  lenderName: { type: String, required: true },
  lenderPAN: String,
  loanSanctionDate: Date,
  propertyStampDutyValue: Number,
  propertyAddress: String,
  carpetArea: Number,
  interestPaidDuringYear: { type: Number, required: true },
  isFirstTimeHomeBuyer: { type: Boolean, default: true },
  maxLimit: { type: Number, default: 150000 },
  proofUrl: String,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedAmount: Number
}, { _id: false });

// Section 24 - Home Loan Interest Schema
const Section24LoanSchema = new Schema({
  propertyType: { type: String, enum: ['self_occupied', 'let_out'], required: true },
  propertyAddress: String,
  loanAccountNumber: { type: String, required: true },
  lenderName: { type: String, required: true },
  lenderPAN: String,
  loanType: { type: String, enum: ['construction', 'purchase', 'repair_renovation'] },
  loanSanctionDate: Date,
  loanAmount: Number,
  interestPaidAnnual: { type: Number, required: true },
  principalPaidAnnual: Number,
  constructionCompletedDate: Date,
  possessionDate: Date,
  preConstructionInterest: Number,
  preConstructionInterestClaimYear: { type: Number, min: 1, max: 5 },
  proofUrl: String,
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedAmount: Number
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

  // New sections
  section80E: Section80ESchema,

  section80G: {
    donations: [Section80GDonationSchema],
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 },
    totalQualifying: { type: Number, default: 0 },
    limitedToPercentageOfIncome: { type: Boolean, default: true },
    qualifyingLimitPercentage: { type: Number, default: 10 }
  },

  section80TTA_TTB: Section80TTA_TTBSchema,

  section80EE: Section80EESchema,

  section80EEA: Section80EEASchema,

  section24: {
    loans: [Section24LoanSchema],
    totalInterestSelfOccupied: { type: Number, default: 0 },
    totalInterestLetOut: { type: Number, default: 0 },
    maxLimitSelfOccupied: { type: Number, default: 200000 },
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 }
  },

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
    section80EDeductions: { type: Number, default: 0 },
    section80GDeductions: { type: Number, default: 0 },
    section80TTADeductions: { type: Number, default: 0 },
    section80EEDeductions: { type: Number, default: 0 },
    section80EEADeductions: { type: Number, default: 0 },
    section24Deductions: { type: Number, default: 0 },
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
