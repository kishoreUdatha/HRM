import mongoose, { Document, Schema } from 'mongoose';

export interface IPosition extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  level: number;
  grade?: string;
  reportsTo?: mongoose.Types.ObjectId;
  headcount: {
    budgeted: number;
    filled: number;
    vacant: number;
  };
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  requirements: {
    education?: string[];
    experience?: number;
    skills?: string[];
    certifications?: string[];
  };
  competencies?: string[];
  description?: string;
  isActive: boolean;
  effectiveDate: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const positionSchema = new Schema<IPosition>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    code: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Department' },
    level: { type: Number, default: 1 },
    grade: String,
    reportsTo: { type: Schema.Types.ObjectId, ref: 'Position' },
    headcount: {
      budgeted: { type: Number, default: 1 },
      filled: { type: Number, default: 0 },
      vacant: { type: Number, default: 1 },
    },
    salaryRange: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
    },
    requirements: {
      education: [String],
      experience: Number,
      skills: [String],
      certifications: [String],
    },
    competencies: [String],
    description: String,
    isActive: { type: Boolean, default: true },
    effectiveDate: { type: Date, default: Date.now },
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

positionSchema.index({ tenantId: 1, code: 1 }, { unique: true });
positionSchema.index({ tenantId: 1, departmentId: 1 });

export default mongoose.model<IPosition>('Position', positionSchema);
