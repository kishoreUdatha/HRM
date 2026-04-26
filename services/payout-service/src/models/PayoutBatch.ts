import mongoose, { Schema } from 'mongoose';

export interface IPayoutBatchApproval {
  userId: mongoose.Types.ObjectId;
  role: string;
  action: 'approved' | 'rejected';
  comment?: string;
  timestamp: Date;
}

export interface IPayoutBatchError {
  employeeId: string;
  employeeName: string;
  error: string;
  timestamp: Date;
}

export interface IPayoutBatch {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;

  // Reference
  batchNumber: string;
  payrollBatchId?: mongoose.Types.ObjectId;
  month: number;
  year: number;

  // Amounts (in paise)
  totalAmount: number;
  totalEmployees: number;
  successfulPayouts: number;
  failedPayouts: number;
  pendingPayouts: number;

  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'partial' | 'failed' | 'cancelled';

  // Approval Flow
  approvals: IPayoutBatchApproval[];

  // Processing
  initiatedBy: mongoose.Types.ObjectId;
  initiatedAt?: Date;
  completedAt?: Date;

  // Errors
  errors: IPayoutBatchError[];

  createdAt: Date;
  updatedAt: Date;

  save(): Promise<IPayoutBatch>;
  toObject(): any;
}

const PayoutBatchSchema = new Schema<IPayoutBatch>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      unique: true,
    },
    payrollBatchId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalEmployees: {
      type: Number,
      default: 0,
    },
    successfulPayouts: {
      type: Number,
      default: 0,
    },
    failedPayouts: {
      type: Number,
      default: 0,
    },
    pendingPayouts: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'processing', 'completed', 'partial', 'failed', 'cancelled'],
      default: 'draft',
    },
    approvals: [{
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      role: {
        type: String,
        required: true,
      },
      action: {
        type: String,
        enum: ['approved', 'rejected'],
        required: true,
      },
      comment: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    initiatedBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    initiatedAt: Date,
    completedAt: Date,
    errors: [{
      employeeId: String,
      employeeName: String,
      error: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
PayoutBatchSchema.index({ tenantId: 1, status: 1 });
PayoutBatchSchema.index({ tenantId: 1, month: 1, year: 1 });
PayoutBatchSchema.index({ batchNumber: 1 });

// Generate batch number before saving
PayoutBatchSchema.pre('save', async function() {
  if (this.isNew && !this.batchNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Count existing batches for this month
    const count = await mongoose.model('PayoutBatch').countDocuments({
      tenantId: this.tenantId,
      batchNumber: { $regex: `^PAY-${year}${month}` }
    });

    this.batchNumber = `PAY-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
});

const PayoutBatch = mongoose.model<IPayoutBatch>('PayoutBatch', PayoutBatchSchema);
export default PayoutBatch;
