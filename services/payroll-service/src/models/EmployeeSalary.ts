import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployeeSalary extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  salaryStructureId: mongoose.Types.ObjectId;
  baseSalary: number;
  currency: string;
  payFrequency: 'monthly' | 'bi-weekly' | 'weekly';
  bankDetails: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountType?: string;
  };
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSalarySchema = new Schema<IEmployeeSalary>(
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
    salaryStructureId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'SalaryStructure',
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    payFrequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly'],
      default: 'monthly',
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      accountType: String,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

employeeSalarySchema.index({ tenantId: 1, employeeId: 1 });
employeeSalarySchema.index({ tenantId: 1, employeeId: 1, effectiveFrom: -1 });

export default mongoose.model<IEmployeeSalary>('EmployeeSalary', employeeSalarySchema);
