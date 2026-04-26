import mongoose, { Document, Schema } from 'mongoose';

export interface IPayoutEmployee {
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
}

export interface IPayoutBankDetails {
  bankName: string;
  accountNumber: string;  // Last 4 digits
  ifscCode: string;
  accountHolderName: string;
}

export interface IPayout extends Document {
  tenantId: mongoose.Types.ObjectId;

  // References
  batchId?: mongoose.Types.ObjectId;
  payrollId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  fundAccountId: mongoose.Types.ObjectId;

  // Employee Snapshot
  employee: IPayoutEmployee;

  // Bank Details Snapshot
  bankDetails: IPayoutBankDetails;

  // Payout Details (amount in paise)
  amount: number;
  currency: string;
  payoutMethod: 'NEFT' | 'IMPS' | 'RTGS';
  purpose: 'salary' | 'reimbursement' | 'bonus' | 'advance';
  narration: string;

  // Razorpay Details
  razorpayPayoutId?: string;
  razorpayStatus?: 'queued' | 'pending' | 'processing' | 'processed' | 'reversed' | 'cancelled' | 'rejected';
  utr?: string;  // Unique Transaction Reference

  // Status
  status: 'pending' | 'initiated' | 'processing' | 'completed' | 'failed' | 'reversed' | 'cancelled';

  // Timestamps
  initiatedAt?: Date;
  processedAt?: Date;
  failedAt?: Date;

  // Error Handling
  failureReason?: string;
  retryCount: number;
  lastRetryAt?: Date;

  // Notifications
  employeeNotified: boolean;
  employeeNotifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    payrollId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fundAccountId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    employee: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      employeeCode: { type: String, required: true },
      email: { type: String, required: true },
    },
    bankDetails: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      ifscCode: { type: String, required: true },
      accountHolderName: { type: String, required: true },
    },
    amount: {
      type: Number,
      required: true,
      min: 100,  // Minimum 1 INR (100 paise)
    },
    currency: {
      type: String,
      default: 'INR',
    },
    payoutMethod: {
      type: String,
      enum: ['NEFT', 'IMPS', 'RTGS'],
      required: true,
    },
    purpose: {
      type: String,
      enum: ['salary', 'reimbursement', 'bonus', 'advance'],
      default: 'salary',
    },
    narration: {
      type: String,
      required: true,
      maxlength: 30,  // Razorpay limit
    },
    razorpayPayoutId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpayStatus: {
      type: String,
      enum: ['queued', 'pending', 'processing', 'processed', 'reversed', 'cancelled', 'rejected'],
    },
    utr: {
      type: String,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'initiated', 'processing', 'completed', 'failed', 'reversed', 'cancelled'],
      default: 'pending',
    },
    initiatedAt: Date,
    processedAt: Date,
    failedAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: Date,
    employeeNotified: {
      type: Boolean,
      default: false,
    },
    employeeNotifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
PayoutSchema.index({ tenantId: 1, status: 1 });
PayoutSchema.index({ tenantId: 1, employeeId: 1 });
PayoutSchema.index({ tenantId: 1, batchId: 1 });
PayoutSchema.index({ payrollId: 1 }, { unique: true });  // One payout per payroll
PayoutSchema.index({ razorpayPayoutId: 1 });

export default mongoose.model<IPayout>('Payout', PayoutSchema);
