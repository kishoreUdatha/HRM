import mongoose, { Document, Schema } from 'mongoose';

// Razorpay Payment Details
export interface IRazorpayDetails {
  orderId: string;
  paymentId?: string;
  signature?: string;
  status: 'created' | 'attempted' | 'paid' | 'failed' | 'refunded';
  method?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  fee?: number;
  tax?: number;
  errorCode?: string;
  errorDescription?: string;
  errorSource?: string;
  errorStep?: string;
  errorReason?: string;
}

// Challan Details for Manual Payments
export interface IChallanDetails {
  challanNumber: string;
  bsrCode: string;
  challanDate: Date;
  depositDate: Date;
  bankName: string;
  branchName?: string;
  serialNumber?: string;
}

// Acknowledgement Details
export interface IAcknowledgement {
  number: string;
  date: Date;
  downloadUrl?: string;
  documentId?: string;
}

// Advance Tax Payment Interface
export interface IAdvanceTaxPayment extends Document {
  tenantId: string;
  employeeId: string;
  scheduleId: string;
  financialYear: string;
  assessmentYear: string;
  quarter: 1 | 2 | 3 | 4;

  // Payment amount
  amount: number;
  currency: string;

  // Tax head codes (for challan)
  majorHeadCode: string;  // 0021 - Income Tax (Other than Companies)
  minorHeadCode: string;  // 100 - Advance Tax
  panNumber: string;

  // Payment method
  paymentMethod: 'razorpay' | 'netbanking' | 'debit_card' | 'credit_card' | 'upi' | 'manual';

  // Razorpay details (for online payments)
  razorpay?: IRazorpayDetails;

  // Challan details (for manual payments)
  challan?: IChallanDetails;

  // Transaction references
  transactionId?: string;
  bankReference?: string;
  paymentGatewayReference?: string;

  // Status tracking
  status: 'initiated' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  initiatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;

  // Failure handling
  failureReason?: string;
  retryCount: number;
  lastRetryAt?: Date;
  maxRetries: number;

  // Acknowledgement from IT Department
  acknowledgement?: IAcknowledgement;

  // Verification
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationNotes?: string;

  // Audit fields
  createdBy: string;
  updatedBy?: string;
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

const RazorpayDetailsSchema = new Schema<IRazorpayDetails>({
  orderId: { type: String, required: true },
  paymentId: { type: String },
  signature: { type: String },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'refunded'],
    required: true
  },
  method: { type: String },
  bank: { type: String },
  wallet: { type: String },
  vpa: { type: String },
  fee: { type: Number },
  tax: { type: Number },
  errorCode: { type: String },
  errorDescription: { type: String },
  errorSource: { type: String },
  errorStep: { type: String },
  errorReason: { type: String }
}, { _id: false });

const ChallanDetailsSchema = new Schema<IChallanDetails>({
  challanNumber: { type: String, required: true },
  bsrCode: { type: String, required: true },
  challanDate: { type: Date, required: true },
  depositDate: { type: Date, required: true },
  bankName: { type: String, required: true },
  branchName: { type: String },
  serialNumber: { type: String }
}, { _id: false });

const AcknowledgementSchema = new Schema<IAcknowledgement>({
  number: { type: String, required: true },
  date: { type: Date, required: true },
  downloadUrl: { type: String },
  documentId: { type: String }
}, { _id: false });

const AdvanceTaxPaymentSchema = new Schema<IAdvanceTaxPayment>({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  scheduleId: { type: String, required: true, index: true },
  financialYear: { type: String, required: true },
  assessmentYear: { type: String, required: true },
  quarter: { type: Number, required: true, enum: [1, 2, 3, 4] },

  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  majorHeadCode: { type: String, default: '0021' },
  minorHeadCode: { type: String, default: '100' },
  panNumber: { type: String, required: true },

  paymentMethod: {
    type: String,
    enum: ['razorpay', 'netbanking', 'debit_card', 'credit_card', 'upi', 'manual'],
    required: true
  },

  razorpay: { type: RazorpayDetailsSchema },
  challan: { type: ChallanDetailsSchema },

  transactionId: { type: String },
  bankReference: { type: String },
  paymentGatewayReference: { type: String },

  status: {
    type: String,
    enum: ['initiated', 'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'initiated'
  },
  initiatedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  cancelledAt: { type: Date },
  refundedAt: { type: Date },

  failureReason: { type: String },
  retryCount: { type: Number, default: 0 },
  lastRetryAt: { type: Date },
  maxRetries: { type: Number, default: 3 },

  acknowledgement: { type: AcknowledgementSchema },

  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: String },
  verificationNotes: { type: String },

  createdBy: { type: String, required: true },
  updatedBy: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String }
}, {
  timestamps: true
});

// Indexes for efficient queries
AdvanceTaxPaymentSchema.index({ tenantId: 1, scheduleId: 1, quarter: 1 });
AdvanceTaxPaymentSchema.index({ 'razorpay.orderId': 1 });
AdvanceTaxPaymentSchema.index({ 'razorpay.paymentId': 1 });
AdvanceTaxPaymentSchema.index({ status: 1, initiatedAt: -1 });
AdvanceTaxPaymentSchema.index({ tenantId: 1, employeeId: 1, financialYear: 1 });

// Auto-generate payment reference
AdvanceTaxPaymentSchema.pre('save', function(next) {
  if (!this.transactionId && this.isNew) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.transactionId = `ADVTAX-${this.financialYear.replace('-', '')}-Q${this.quarter}-${timestamp}${random}`;
  }
  next();
});

// Method to mark payment as completed
AdvanceTaxPaymentSchema.methods.markCompleted = function(
  razorpayPaymentId?: string,
  razorpaySignature?: string
): void {
  this.status = 'completed';
  this.completedAt = new Date();

  if (this.razorpay && razorpayPaymentId) {
    this.razorpay.paymentId = razorpayPaymentId;
    this.razorpay.signature = razorpaySignature;
    this.razorpay.status = 'paid';
  }
};

// Method to mark payment as failed
AdvanceTaxPaymentSchema.methods.markFailed = function(reason: string): void {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  this.retryCount += 1;
  this.lastRetryAt = new Date();

  if (this.razorpay) {
    this.razorpay.status = 'failed';
    this.razorpay.errorDescription = reason;
  }
};

// Method to check if retry is allowed
AdvanceTaxPaymentSchema.methods.canRetry = function(): boolean {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
};

// Virtual for formatted amount
AdvanceTaxPaymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

export default mongoose.model<IAdvanceTaxPayment>('AdvanceTaxPayment', AdvanceTaxPaymentSchema);
