import mongoose, { Schema, Document } from 'mongoose';

export interface IForm16PartA {
  employerDetails: {
    name: string;
    address: string;
    tan: string;
    pan: string;
  };
  employeeDetails: {
    name: string;
    pan: string;
    address: string;
  };
  assessmentYear: string;
  period: {
    from: Date;
    to: Date;
  };
  quarterlyTDSDetails: Array<{
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    receiptNumbers: string[];
    taxDeducted: number;
    taxDeposited: number;
    dateOfDeposit: Date;
    bsrCode: string;
    challanSerialNumber: string;
  }>;
  summaryOfTax: {
    totalTaxDeducted: number;
    totalTaxDeposited: number;
  };
}

export interface IForm16PartB {
  grossSalary: {
    salaryAsPerSection17_1: number;
    valueOfPerquisites17_2: number;
    profitsInLieuOfSalary17_3: number;
    total: number;
  };
  allowancesExempt: {
    hraExemption: number;
    ltaExemption: number;
    otherExemptions: number;
    total: number;
  };
  deductions: {
    standardDeduction: number;
    entertainmentAllowance: number;
    professionalTax: number;
    total: number;
  };
  incomeFromSalary: number;
  incomeFromOtherSources: number;
  grossTotalIncome: number;
  deductionsUnderChapterVIA: {
    section80C: {
      ppf: number;
      elss: number;
      lifeInsurance: number;
      housingLoanPrincipal: number;
      tuitionFees: number;
      others: number;
      total: number;
    };
    section80CCC: number;
    section80CCD_1: number;
    section80CCD_1B: number;
    section80CCD_2: number;
    section80D: {
      selfAndFamily: number;
      parents: number;
      total: number;
    };
    section80E: number;
    section80EE: number;
    section80EEA: number;
    section80G: number;
    section80TTA_TTB: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  totalIncome: number;
  taxOnTotalIncome: number;
  rebateUnderSection87A: number;
  surcharge: number;
  healthAndEducationCess: number;
  totalTaxPayable: number;
  reliefUnderSection89: number;
  netTaxPayable: number;
  taxPaidByEmployer: number;
  taxPayableOrRefund: number;
}

export interface IForm16 extends Document {
  tenantId: string;
  employeeId: string;
  financialYear: string;
  assessmentYear: string;
  partA: IForm16PartA;
  partB: IForm16PartB;
  verification: {
    place: string;
    date: Date;
    designation: string;
    signatory: string;
  };
  status: 'draft' | 'generated' | 'issued' | 'revised';
  pdfUrl?: string;
  issuedAt?: Date;
  issuedBy?: string;
  downloadCount: number;
  lastDownloadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const Form16Schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  financialYear: { type: String, required: true },
  assessmentYear: { type: String, required: true },

  partA: {
    employerDetails: {
      name: String,
      address: String,
      tan: String,
      pan: String
    },
    employeeDetails: {
      name: String,
      pan: String,
      address: String
    },
    assessmentYear: String,
    period: {
      from: Date,
      to: Date
    },
    quarterlyTDSDetails: [{
      quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'] },
      receiptNumbers: [String],
      taxDeducted: Number,
      taxDeposited: Number,
      dateOfDeposit: Date,
      bsrCode: String,
      challanSerialNumber: String
    }],
    summaryOfTax: {
      totalTaxDeducted: Number,
      totalTaxDeposited: Number
    }
  },

  partB: {
    grossSalary: {
      salaryAsPerSection17_1: Number,
      valueOfPerquisites17_2: Number,
      profitsInLieuOfSalary17_3: Number,
      total: Number
    },
    allowancesExempt: {
      hraExemption: Number,
      ltaExemption: Number,
      otherExemptions: Number,
      total: Number
    },
    deductions: {
      standardDeduction: Number,
      entertainmentAllowance: Number,
      professionalTax: Number,
      total: Number
    },
    incomeFromSalary: Number,
    incomeFromOtherSources: Number,
    grossTotalIncome: Number,
    deductionsUnderChapterVIA: {
      section80C: {
        ppf: Number,
        elss: Number,
        lifeInsurance: Number,
        housingLoanPrincipal: Number,
        tuitionFees: Number,
        others: Number,
        total: Number
      },
      section80CCC: Number,
      section80CCD_1: Number,
      section80CCD_1B: Number,
      section80CCD_2: Number,
      section80D: {
        selfAndFamily: Number,
        parents: Number,
        total: Number
      },
      section80E: Number,
      section80EE: Number,
      section80EEA: Number,
      section80G: Number,
      section80TTA_TTB: Number,
      otherDeductions: Number,
      totalDeductions: Number
    },
    totalIncome: Number,
    taxOnTotalIncome: Number,
    rebateUnderSection87A: Number,
    surcharge: Number,
    healthAndEducationCess: Number,
    totalTaxPayable: Number,
    reliefUnderSection89: Number,
    netTaxPayable: Number,
    taxPaidByEmployer: Number,
    taxPayableOrRefund: Number
  },

  verification: {
    place: String,
    date: Date,
    designation: String,
    signatory: String
  },

  status: { type: String, enum: ['draft', 'generated', 'issued', 'revised'], default: 'draft' },
  pdfUrl: String,
  issuedAt: Date,
  issuedBy: String,
  downloadCount: { type: Number, default: 0 },
  lastDownloadedAt: Date
}, { timestamps: true });

Form16Schema.index({ tenantId: 1, employeeId: 1, financialYear: 1 }, { unique: true });

export default mongoose.model<IForm16>('Form16', Form16Schema);
