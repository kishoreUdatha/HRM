import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  managerId?: mongoose.Types.ObjectId;
  parentDepartmentId?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    parentDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique indexes
departmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });
departmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });

const Department = mongoose.model<IDepartment>('Department', departmentSchema);

export default Department;
