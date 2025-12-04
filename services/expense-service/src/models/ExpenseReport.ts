import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenseReport extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  reportNumber: string;
  title: string;
  description?: string;
  purpose: 'travel' | 'business_meal' | 'supplies' | 'client_entertainment' | 'training' | 'other';
  startDate: Date;
  endDate: Date;
  tripId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  expenses: mongoose.Types.ObjectId[];
  totalAmount: number;
  approvedAmount?: number;
  currency: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'rejected' | 'paid' | 'cancelled';
  currentApprover?: mongoose.Types.ObjectId;
  approvalWorkflow: {
    level: number;
    approverId: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    actionDate?: Date;
    comments?: string;
  }[];
  submittedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
  paymentDetails?: {
    method: string;
    reference: string;
    amount: number;
    date: Date;
  };
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
  comments?: {
    by: mongoose.Types.ObjectId;
    text: string;
    at: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const expenseReportSchema = new Schema<IExpenseReport>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    reportNumber: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    purpose: {
      type: String,
      enum: ['travel', 'business_meal', 'supplies', 'client_entertainment', 'training', 'other'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    tripId: Schema.Types.ObjectId,
    projectId: Schema.Types.ObjectId,
    expenses: [{
      type: Schema.Types.ObjectId,
      ref: 'Expense',
    }],
    totalAmount: {
      type: Number,
      default: 0,
    },
    approvedAmount: Number,
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled'],
      default: 'draft',
    },
    currentApprover: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalWorkflow: [{
      level: Number,
      approverId: Schema.Types.ObjectId,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending',
      },
      actionDate: Date,
      comments: String,
    }],
    submittedAt: Date,
    approvedAt: Date,
    paidAt: Date,
    paymentDetails: {
      method: String,
      reference: String,
      amount: Number,
      date: Date,
    },
    attachments: [{
      name: String,
      url: String,
      type: String,
    }],
    comments: [{
      by: Schema.Types.ObjectId,
      text: String,
      at: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  }
);

expenseReportSchema.index({ tenantId: 1, reportNumber: 1 }, { unique: true });
expenseReportSchema.index({ tenantId: 1, employeeId: 1 });
expenseReportSchema.index({ tenantId: 1, status: 1 });
expenseReportSchema.index({ tenantId: 1, currentApprover: 1 });

export default mongoose.model<IExpenseReport>('ExpenseReport', expenseReportSchema);
