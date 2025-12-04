import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestmentProof {
  documentType: string;
  documentNumber?: string;
  documentUrl?: string;
  amount: number;
  uploadedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  verifiedAmount?: number;
  rejectionReason?: string;
}

export interface IInvestmentItem {
  category: string;
  subCategory: string;
  description: string;
  declaredAmount: number;
  verifiedAmount: number;
  maxLimit: number;
  proofs: IInvestmentProof[];
  status: 'declared' | 'proof_submitted' | 'verified' | 'partially_verified' | 'rejected';
}

export interface IInvestmentDeclaration extends Document {
  tenantId: string;
  employeeId: string;
  financialYear: string;
  regime: 'old' | 'new';

  // Section 80C - Investments
  section80C: {
    items: IInvestmentItem[];
    totalDeclared: number;
    totalVerified: number;
    maxLimit: number;
  };

  // Section 80CCC - Pension
  section80CCC: {
    pensionFund: number;
    verified: number;
    maxLimit: number;
    proofs: IInvestmentProof[];
    status: 'pending' | 'verified' | 'rejected';
  };

  // Section 80CCD - NPS
  section80CCD: {
    employeeContribution: number;
    employerContribution: number;
    additionalContribution: number;
    totalDeclared: number;
    totalVerified: number;
    maxLimit: number;
    proofs: IInvestmentProof[];
    status: 'pending' | 'verified' | 'rejected';
  };

  // Section 80D - Medical Insurance
  section80D: {
    selfAndFamily: number;
    parents: number;
    parentsAreSeniorCitizen: boolean;
    preventiveHealthCheckup: number;
    totalDeclared: number;
    totalVerified: number;
    maxLimit: number;
    proofs: IInvestmentProof[];
    status: 'pending' | 'verified' | 'rejected';
  };

  // Section 80E - Education Loan Interest
  section80E: {
    interestAmount: number;
    verified: number;
    proofs: IInvestmentProof[];
    status: 'pending' | 'verified' | 'rejected';
  };

  // Section 80G - Donations
  section80G: {
    donations: {
      doneeeName: string;
      panOfDonee: string;
      amount: number;
      qualifyingPercentage: number;
      qualifyingAmount: number;
      proofUrl?: string;
      verified: boolean;
    }[];
    totalDeclared: number;
    totalVerified: number;
  };

  // Section 80TTA/80TTB - Interest Income
  section80TTA: {
    savingsInterest: number;
    isSeniorCitizen: boolean;
    maxLimit: number;
    verified: number;
    status: 'pending' | 'verified' | 'rejected';
  };

  // Section 24 - Home Loan Interest
  section24: {
    homeLoanInterest: number;
    isLetOut: boolean;
    maxLimit: number;
    verified: number;
    proofs: IInvestmentProof[];
    status: 'pending' | 'verified' | 'rejected';
  };

  // HRA Exemption
  hraExemption: {
    rentPaid: number;
    landlordName?: string;
    landlordPan?: string;
    landlordAddress?: string;
    cityType: 'metro' | 'non_metro';
    calculatedExemption: number;
    proofs: IInvestmentProof[];
    status: 'pending' | 'verified' | 'rejected';
  };

  // LTA Exemption
  ltaExemption: {
    claimedAmount: number;
    travelDetails?: string;
    verified: number;
    proofs: IInvestmentProof[];
    status: 'pending' | 'verified' | 'rejected';
  };

  // Other Income
  otherIncome: {
    incomeFromOtherSources: number;
    incomeFromHouseProperty: number;
    capitalGains: number;
    businessIncome: number;
    totalOtherIncome: number;
  };

  // Previous Employment
  previousEmployment?: {
    employerName: string;
    employerTAN: string;
    grossSalary: number;
    tdsDeducted: number;
    fromDate: Date;
    toDate: Date;
    form16Url?: string;
    verified: boolean;
  };

  summary: {
    totalDeclarations: number;
    totalVerified: number;
    totalPending: number;
    estimatedTaxSaving: number;
  };

  status: 'draft' | 'submitted' | 'under_review' | 'partially_verified' | 'verified' | 'locked';
  submittedAt?: Date;
  verificationDeadline?: Date;
  lockedAt?: Date;
  lockedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

const InvestmentProofSchema = new Schema({
  documentType: { type: String, required: true },
  documentNumber: String,
  documentUrl: String,
  amount: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: String,
  verifiedAt: Date,
  verifiedAmount: Number,
  rejectionReason: String
}, { _id: false });

const InvestmentItemSchema = new Schema({
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  description: String,
  declaredAmount: { type: Number, default: 0 },
  verifiedAmount: { type: Number, default: 0 },
  maxLimit: { type: Number, default: 0 },
  proofs: [InvestmentProofSchema],
  status: {
    type: String,
    enum: ['declared', 'proof_submitted', 'verified', 'partially_verified', 'rejected'],
    default: 'declared'
  }
}, { _id: false });

const InvestmentDeclarationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  financialYear: { type: String, required: true },
  regime: {
    type: String,
    enum: ['old', 'new'],
    default: 'new'
  },

  section80C: {
    items: [InvestmentItemSchema],
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 150000 }
  },

  section80CCC: {
    pensionFund: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 150000 },
    proofs: [InvestmentProofSchema],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  section80CCD: {
    employeeContribution: { type: Number, default: 0 },
    employerContribution: { type: Number, default: 0 },
    additionalContribution: { type: Number, default: 0 },
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 50000 },
    proofs: [InvestmentProofSchema],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  section80D: {
    selfAndFamily: { type: Number, default: 0 },
    parents: { type: Number, default: 0 },
    parentsAreSeniorCitizen: { type: Boolean, default: false },
    preventiveHealthCheckup: { type: Number, default: 0 },
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 100000 },
    proofs: [InvestmentProofSchema],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  section80E: {
    interestAmount: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
    proofs: [InvestmentProofSchema],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  section80G: {
    donations: [{
      doneeeName: String,
      panOfDonee: String,
      amount: Number,
      qualifyingPercentage: { type: Number, default: 100 },
      qualifyingAmount: Number,
      proofUrl: String,
      verified: { type: Boolean, default: false }
    }],
    totalDeclared: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 }
  },

  section80TTA: {
    savingsInterest: { type: Number, default: 0 },
    isSeniorCitizen: { type: Boolean, default: false },
    maxLimit: { type: Number, default: 10000 },
    verified: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  section24: {
    homeLoanInterest: { type: Number, default: 0 },
    isLetOut: { type: Boolean, default: false },
    maxLimit: { type: Number, default: 200000 },
    verified: { type: Number, default: 0 },
    proofs: [InvestmentProofSchema],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  hraExemption: {
    rentPaid: { type: Number, default: 0 },
    landlordName: String,
    landlordPan: String,
    landlordAddress: String,
    cityType: { type: String, enum: ['metro', 'non_metro'], default: 'non_metro' },
    calculatedExemption: { type: Number, default: 0 },
    proofs: [InvestmentProofSchema],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  ltaExemption: {
    claimedAmount: { type: Number, default: 0 },
    travelDetails: String,
    verified: { type: Number, default: 0 },
    proofs: [InvestmentProofSchema],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  otherIncome: {
    incomeFromOtherSources: { type: Number, default: 0 },
    incomeFromHouseProperty: { type: Number, default: 0 },
    capitalGains: { type: Number, default: 0 },
    businessIncome: { type: Number, default: 0 },
    totalOtherIncome: { type: Number, default: 0 }
  },

  previousEmployment: {
    employerName: String,
    employerTAN: String,
    grossSalary: Number,
    tdsDeducted: Number,
    fromDate: Date,
    toDate: Date,
    form16Url: String,
    verified: { type: Boolean, default: false }
  },

  summary: {
    totalDeclarations: { type: Number, default: 0 },
    totalVerified: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    estimatedTaxSaving: { type: Number, default: 0 }
  },

  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'partially_verified', 'verified', 'locked'],
    default: 'draft'
  },
  submittedAt: Date,
  verificationDeadline: Date,
  lockedAt: Date,
  lockedBy: String
}, { timestamps: true });

InvestmentDeclarationSchema.index({ tenantId: 1, employeeId: 1, financialYear: 1 }, { unique: true });
InvestmentDeclarationSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IInvestmentDeclaration>('InvestmentDeclaration', InvestmentDeclarationSchema);
