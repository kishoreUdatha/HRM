import mongoose, { Document, Schema } from 'mongoose';

export interface ISalaryComponent {
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage';
  value: number;
  percentageOf?: string;
  isTaxable: boolean;
  isActive: boolean;
}

export interface ISalaryStructure extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  components: ISalaryComponent[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const salaryComponentSchema = new Schema<ISalaryComponent>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    type: { type: String, enum: ['earning', 'deduction'], required: true },
    calculationType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    value: { type: Number, required: true },
    percentageOf: String,
    isTaxable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const salaryStructureSchema = new Schema<ISalaryStructure>(
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
    components: [salaryComponentSchema],
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

salaryStructureSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<ISalaryStructure>('SalaryStructure', salaryStructureSchema);
