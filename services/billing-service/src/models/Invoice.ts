import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  razorpayInvoiceId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  invoiceNumber: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'cancelled' | 'expired' | 'deleted';
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  paidAt?: Date;
  lineItems: {
    description: string;
    quantity: number;
    unitAmount: number;
    amount: number;
  }[];
  tax?: {
    name: string;
    rate: number;
    amount: number;
  };
  discount?: {
    name: string;
    type: 'percentage' | 'flat';
    value: number;
    amount: number;
  };
  notes?: string;
  invoiceUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
    },
    razorpayInvoiceId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpayPaymentId: String,
    razorpayOrderId: String,
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountDue: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'expired', 'deleted'],
      default: 'draft',
    },
    billingPeriodStart: {
      type: Date,
      required: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: Date,
    lineItems: [
      {
        description: String,
        quantity: Number,
        unitAmount: Number,
        amount: Number,
      },
    ],
    tax: {
      name: String,
      rate: Number,
      amount: Number,
    },
    discount: {
      name: String,
      type: { type: String, enum: ['percentage', 'flat'] },
      value: Number,
      amount: Number,
    },
    notes: String,
    invoiceUrl: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ createdAt: -1 });

// Generate invoice number
InvoiceSchema.pre('save', async function () {
  if (this.isNew && !this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(6, '0')}`;
  }
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
