import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentMethod extends Document {
  tenantId: mongoose.Types.ObjectId;
  razorpayCustomerId: string;
  razorpayTokenId?: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'emandate';
  isDefault: boolean;
  card?: {
    last4: string;
    network: string; // visa, mastercard, rupay, etc.
    type: string; // credit, debit
    issuer?: string;
    expiryMonth: number;
    expiryYear: number;
  };
  upi?: {
    vpa: string; // UPI VPA like user@upi
  };
  bank?: {
    name: string;
    ifsc?: string;
    accountLast4?: string;
  };
  wallet?: {
    name: string; // paytm, phonepe, etc.
  };
  status: 'active' | 'expired' | 'deleted';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    razorpayCustomerId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayTokenId: {
      type: String,
      sparse: true,
    },
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'emandate'],
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    card: {
      last4: String,
      network: String,
      type: String,
      issuer: String,
      expiryMonth: Number,
      expiryYear: Number,
    },
    upi: {
      vpa: String,
    },
    bank: {
      name: String,
      ifsc: String,
      accountLast4: String,
    },
    wallet: {
      name: String,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'deleted'],
      default: 'active',
    },
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
PaymentMethodSchema.index({ tenantId: 1, isDefault: 1 });
PaymentMethodSchema.index({ razorpayTokenId: 1 });

export default mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);
