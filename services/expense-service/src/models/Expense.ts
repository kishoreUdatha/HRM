import mongoose, { Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  expenseReportId?: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  date: Date;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'corporate_card' | 'other';
  receipts: {
    url: string;
    fileName: string;
    uploadedAt: Date;
    ocrData?: Record<string, any>;
  }[];
  isBillable: boolean;
  projectId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId;
  mileage?: {
    distance: number;
    unit: 'miles' | 'km';
    rate: number;
    startLocation: string;
    endLocation: string;
  };
  attendees?: {
    name: string;
    type: 'internal' | 'external';
    employeeId?: mongoose.Types.ObjectId;
  }[];
  policyViolations?: {
    type: string;
    description: string;
    severity: 'warning' | 'violation';
  }[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed' | 'cancelled';
  approvalHistory: {
    action: 'submitted' | 'approved' | 'rejected' | 'returned';
    by: mongoose.Types.ObjectId;
    at: Date;
    comments?: string;
  }[];
  reimbursement?: {
    date: Date;
    amount: number;
    reference: string;
    method: string;
  };
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
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
    expenseReportId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseReport',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'ExpenseCategory',
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    merchant: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    exchangeRate: Number,
    convertedAmount: Number,
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'corporate_card', 'other'],
      default: 'cash',
    },
    receipts: [{
      url: String,
      fileName: String,
      uploadedAt: { type: Date, default: Date.now },
      ocrData: Schema.Types.Mixed,
    }],
    isBillable: { type: Boolean, default: false },
    projectId: Schema.Types.ObjectId,
    clientId: Schema.Types.ObjectId,
    tripId: Schema.Types.ObjectId,
    mileage: {
      distance: Number,
      unit: { type: String, enum: ['miles', 'km'] },
      rate: Number,
      startLocation: String,
      endLocation: String,
    },
    attendees: [{
      name: String,
      type: { type: String, enum: ['internal', 'external'] },
      employeeId: Schema.Types.ObjectId,
    }],
    policyViolations: [{
      type: { type: String },
      description: String,
      severity: { type: String, enum: ['warning', 'violation'] },
    }],
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'reimbursed', 'cancelled'],
      default: 'draft',
    },
    approvalHistory: [{
      action: {
        type: String,
        enum: ['submitted', 'approved', 'rejected', 'returned'],
      },
      by: Schema.Types.ObjectId,
      at: { type: Date, default: Date.now },
      comments: String,
    }],
    reimbursement: {
      date: Date,
      amount: Number,
      reference: String,
      method: String,
    },
    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ tenantId: 1, employeeId: 1 });
expenseSchema.index({ tenantId: 1, status: 1 });
expenseSchema.index({ tenantId: 1, date: 1 });
expenseSchema.index({ tenantId: 1, expenseReportId: 1 });

export default mongoose.model<IExpense>('Expense', expenseSchema);
