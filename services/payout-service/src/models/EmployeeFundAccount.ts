import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployeeFundAccount extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;

  // Razorpay Fund Account
  razorpayContactId: string;
  razorpayFundAccountId: string;

  // Bank Details Snapshot
  bankName: string;
  accountNumber: string;  // Last 4 digits only for display
  accountNumberHash: string;  // Hashed full number for verification
  ifscCode: string;
  accountHolderName: string;
  accountType: 'savings' | 'current';

  // Verification
  verificationStatus: 'pending' | 'verified' | 'failed';
  verifiedAt?: Date;
  verificationDetails?: {
    method: string;
    transactionId?: string;
    failureReason?: string;
  };

  // Status
  isActive: boolean;
  deactivatedAt?: Date;
  deactivationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const EmployeeFundAccountSchema = new Schema<IEmployeeFundAccount>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    razorpayContactId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayFundAccountId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    accountNumberHash: {
      type: String,
      required: true,
    },
    ifscCode: {
      type: String,
      required: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      enum: ['savings', 'current'],
      default: 'savings',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
    verifiedAt: Date,
    verificationDetails: {
      method: String,
      transactionId: String,
      failureReason: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deactivatedAt: Date,
    deactivationReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
EmployeeFundAccountSchema.index({ tenantId: 1, employeeId: 1 });
EmployeeFundAccountSchema.index({ tenantId: 1, isActive: 1 });
EmployeeFundAccountSchema.index({ razorpayContactId: 1 });

export default mongoose.model<IEmployeeFundAccount>('EmployeeFundAccount', EmployeeFundAccountSchema);
