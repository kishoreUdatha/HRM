import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenseCategory extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  parentCategoryId?: mongoose.Types.ObjectId;
  glCode?: string;
  policy: {
    maxAmount?: number;
    requiresReceipt: boolean;
    receiptThreshold: number;
    requiresPreApproval: boolean;
    preApprovalThreshold?: number;
    allowedPaymentMethods: ('cash' | 'card' | 'bank_transfer' | 'corporate_card' | 'other')[];
  };
  perDiem?: {
    enabled: boolean;
    domesticRate?: number;
    internationalRate?: number;
    currency: string;
  };
  mileageRate?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    description: String,
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
    },
    glCode: String,
    policy: {
      maxAmount: Number,
      requiresReceipt: { type: Boolean, default: true },
      receiptThreshold: { type: Number, default: 25 },
      requiresPreApproval: { type: Boolean, default: false },
      preApprovalThreshold: Number,
      allowedPaymentMethods: [{
        type: String,
        enum: ['cash', 'card', 'bank_transfer', 'corporate_card', 'other'],
      }],
    },
    perDiem: {
      enabled: { type: Boolean, default: false },
      domesticRate: Number,
      internationalRate: Number,
      currency: { type: String, default: 'USD' },
    },
    mileageRate: Number,
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

expenseCategorySchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<IExpenseCategory>('ExpenseCategory', expenseCategorySchema);
