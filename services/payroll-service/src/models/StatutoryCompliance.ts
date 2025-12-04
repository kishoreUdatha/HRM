import mongoose, { Schema, Document } from 'mongoose';

// PF ECR (Electronic Challan cum Return)
export interface IPFECRRecord {
  uan: string;
  memberName: string;
  grossWages: number;
  epfWages: number;
  epsWages: number;
  edliWages: number;
  epfContribution: number;
  epsContribution: number;
  epfEpsContribution: number;
  ncp_days: number;
  refundOfAdvance: number;
}

export interface IPFECRFile extends Document {
  tenantId: string;
  establishmentId: string;
  establishmentName: string;
  month: number;
  year: number;
  wageMonth: string;
  records: IPFECRRecord[];
  summary: {
    totalMembers: number;
    totalGrossWages: number;
    totalEPFContribution: number;
    totalEPSContribution: number;
    totalEDLIContribution: number;
    totalAdminCharges: number;
    grandTotal: number;
  };
  fileContent?: string;
  status: 'generated' | 'submitted' | 'acknowledged';
  challanNumber?: string;
  submittedAt?: Date;
  acknowledgedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ESI Return
export interface IESIRecord {
  ipNumber: string;
  memberName: string;
  grossWages: number;
  ipContribution: number;
  employerContribution: number;
  totalContribution: number;
  noOfDays: number;
}

export interface IESIReturn extends Document {
  tenantId: string;
  employerCode: string;
  contributionPeriod: string;
  month: number;
  year: number;
  records: IESIRecord[];
  summary: {
    totalEmployees: number;
    totalGrossWages: number;
    totalIPContribution: number;
    totalEmployerContribution: number;
    grandTotal: number;
  };
  status: 'generated' | 'submitted' | 'acknowledged';
  challanNumber?: string;
  submittedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Professional Tax Return
export interface IPTRecord {
  employeeCode: string;
  employeeName: string;
  grossSalary: number;
  ptDeducted: number;
}

export interface IPTReturn extends Document {
  tenantId: string;
  registrationNumber: string;
  state: string;
  month: number;
  year: number;
  records: IPTRecord[];
  summary: {
    totalEmployees: number;
    totalPTDeducted: number;
  };
  status: 'generated' | 'submitted' | 'paid';
  challanNumber?: string;
  paymentDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// TDS Return (Form 24Q)
export interface ITDSDeducteeRecord {
  employeeCode: string;
  pan: string;
  name: string;
  dateOfPayment: Date;
  amountPaid: number;
  tdsDeducted: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  section: string;
  certificateNumber?: string;
}

export interface ITDSReturn extends Document {
  tenantId: string;
  tanNumber: string;
  formType: '24Q' | '26Q' | '27Q';
  quarter: 1 | 2 | 3 | 4;
  financialYear: string;
  assessmentYear: string;
  deductorDetails: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    email: string;
    phone: string;
  };
  records: ITDSDeducteeRecord[];
  summary: {
    totalDeductees: number;
    totalAmountPaid: number;
    totalTDSDeducted: number;
    totalSurcharge: number;
    totalCess: number;
    grandTotal: number;
  };
  challanDetails: {
    bsrCode: string;
    challanDate: Date;
    challanNumber: string;
    amount: number;
  }[];
  status: 'draft' | 'generated' | 'submitted' | 'processed' | 'revised';
  tokenNumber?: string;
  acknowledgementNumber?: string;
  submittedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// LWF Return
export interface ILWFReturn extends Document {
  tenantId: string;
  registrationNumber: string;
  state: string;
  period: string;
  month: number;
  year: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  numberOfEmployees: number;
  status: 'generated' | 'submitted' | 'paid';
  challanNumber?: string;
  paymentDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schemas
const PFECRRecordSchema = new Schema({
  uan: { type: String, required: true },
  memberName: { type: String, required: true },
  grossWages: { type: Number, default: 0 },
  epfWages: { type: Number, default: 0 },
  epsWages: { type: Number, default: 0 },
  edliWages: { type: Number, default: 0 },
  epfContribution: { type: Number, default: 0 },
  epsContribution: { type: Number, default: 0 },
  epfEpsContribution: { type: Number, default: 0 },
  ncp_days: { type: Number, default: 0 },
  refundOfAdvance: { type: Number, default: 0 }
}, { _id: false });

const PFECRFileSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  establishmentId: { type: String, required: true },
  establishmentName: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  wageMonth: { type: String, required: true },
  records: [PFECRRecordSchema],
  summary: {
    totalMembers: Number,
    totalGrossWages: Number,
    totalEPFContribution: Number,
    totalEPSContribution: Number,
    totalEDLIContribution: Number,
    totalAdminCharges: Number,
    grandTotal: Number
  },
  fileContent: String,
  status: {
    type: String,
    enum: ['generated', 'submitted', 'acknowledged'],
    default: 'generated'
  },
  challanNumber: String,
  submittedAt: Date,
  acknowledgedAt: Date,
  createdBy: { type: String, required: true }
}, { timestamps: true });

PFECRFileSchema.index({ tenantId: 1, year: 1, month: 1 }, { unique: true });

const ESIRecordSchema = new Schema({
  ipNumber: { type: String, required: true },
  memberName: { type: String, required: true },
  grossWages: { type: Number, default: 0 },
  ipContribution: { type: Number, default: 0 },
  employerContribution: { type: Number, default: 0 },
  totalContribution: { type: Number, default: 0 },
  noOfDays: { type: Number, default: 0 }
}, { _id: false });

const ESIReturnSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employerCode: { type: String, required: true },
  contributionPeriod: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  records: [ESIRecordSchema],
  summary: {
    totalEmployees: Number,
    totalGrossWages: Number,
    totalIPContribution: Number,
    totalEmployerContribution: Number,
    grandTotal: Number
  },
  status: {
    type: String,
    enum: ['generated', 'submitted', 'acknowledged'],
    default: 'generated'
  },
  challanNumber: String,
  submittedAt: Date,
  createdBy: { type: String, required: true }
}, { timestamps: true });

ESIReturnSchema.index({ tenantId: 1, year: 1, month: 1 });

const PTRecordSchema = new Schema({
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  grossSalary: { type: Number, default: 0 },
  ptDeducted: { type: Number, default: 0 }
}, { _id: false });

const PTReturnSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  registrationNumber: { type: String, required: true },
  state: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  records: [PTRecordSchema],
  summary: {
    totalEmployees: Number,
    totalPTDeducted: Number
  },
  status: {
    type: String,
    enum: ['generated', 'submitted', 'paid'],
    default: 'generated'
  },
  challanNumber: String,
  paymentDate: Date,
  createdBy: { type: String, required: true }
}, { timestamps: true });

PTReturnSchema.index({ tenantId: 1, state: 1, year: 1, month: 1 });

const TDSDeducteeRecordSchema = new Schema({
  employeeCode: { type: String, required: true },
  pan: { type: String, required: true },
  name: { type: String, required: true },
  dateOfPayment: Date,
  amountPaid: { type: Number, default: 0 },
  tdsDeducted: { type: Number, default: 0 },
  surcharge: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  section: { type: String, default: '192' },
  certificateNumber: String
}, { _id: false });

const TDSReturnSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  tanNumber: { type: String, required: true },
  formType: {
    type: String,
    enum: ['24Q', '26Q', '27Q'],
    default: '24Q'
  },
  quarter: {
    type: Number,
    enum: [1, 2, 3, 4],
    required: true
  },
  financialYear: { type: String, required: true },
  assessmentYear: { type: String, required: true },
  deductorDetails: {
    name: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    email: String,
    phone: String
  },
  records: [TDSDeducteeRecordSchema],
  summary: {
    totalDeductees: Number,
    totalAmountPaid: Number,
    totalTDSDeducted: Number,
    totalSurcharge: Number,
    totalCess: Number,
    grandTotal: Number
  },
  challanDetails: [{
    bsrCode: String,
    challanDate: Date,
    challanNumber: String,
    amount: Number
  }],
  status: {
    type: String,
    enum: ['draft', 'generated', 'submitted', 'processed', 'revised'],
    default: 'draft'
  },
  tokenNumber: String,
  acknowledgementNumber: String,
  submittedAt: Date,
  createdBy: { type: String, required: true }
}, { timestamps: true });

TDSReturnSchema.index({ tenantId: 1, financialYear: 1, quarter: 1 });

const LWFReturnSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  registrationNumber: { type: String, required: true },
  state: { type: String, required: true },
  period: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  employeeContribution: { type: Number, default: 0 },
  employerContribution: { type: Number, default: 0 },
  totalContribution: { type: Number, default: 0 },
  numberOfEmployees: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['generated', 'submitted', 'paid'],
    default: 'generated'
  },
  challanNumber: String,
  paymentDate: Date,
  createdBy: { type: String, required: true }
}, { timestamps: true });

LWFReturnSchema.index({ tenantId: 1, state: 1, year: 1, month: 1 });

export const PFECRFile = mongoose.model<IPFECRFile>('PFECRFile', PFECRFileSchema);
export const ESIReturn = mongoose.model<IESIReturn>('ESIReturn', ESIReturnSchema);
export const PTReturn = mongoose.model<IPTReturn>('PTReturn', PTReturnSchema);
export const TDSReturn = mongoose.model<ITDSReturn>('TDSReturn', TDSReturnSchema);
export const LWFReturn = mongoose.model<ILWFReturn>('LWFReturn', LWFReturnSchema);
