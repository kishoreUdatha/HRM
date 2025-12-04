import mongoose, { Document, Schema } from 'mongoose';
import { getNextSequence } from './Counter';

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  employeeCode: string;
  userId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  departmentId: mongoose.Types.ObjectId;
  designation: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  joiningDate: Date;
  reportingManagerId?: mongoose.Types.ObjectId;
  shiftId?: mongoose.Types.ObjectId;
  salary: {
    basic: number;
    hra: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    currency: string;
  };
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
  documents: Array<{
    name: string;
    type: string;
    url: string;
    uploadedAt: Date;
  }>;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';
  avatar?: string;
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    employeeCode: {
      type: String,
      // Not required - auto-generated in pre-save hook if not provided
    },
    userId: {
      type: Schema.Types.ObjectId,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      default: 'single',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      zipCode: { type: String, default: '' },
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time',
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    reportingManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
    },
    salary: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      netSalary: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
    },
    documents: [
      {
        name: String,
        type: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated', 'on-leave'],
      default: 'active',
    },
    avatar: String,
    skills: [String],
  },
  {
    timestamps: true,
  }
);

// Compound unique index for tenant + email and tenant + employeeCode
employeeSchema.index({ tenantId: 1, email: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, employeeCode: 1 }, { unique: true });

// Text index for search
employeeSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  employeeCode: 'text',
});

// Other indexes
employeeSchema.index({ tenantId: 1, departmentId: 1 });
employeeSchema.index({ tenantId: 1, status: 1 });
employeeSchema.index({ tenantId: 1, joiningDate: 1 });

// Generate employee code before saving using atomic counter
employeeSchema.pre('save', async function () {
  if (this.isNew && !this.employeeCode) {
    // Use atomic counter to generate sequential employee IDs
    const seq = await getNextSequence(this.tenantId.toString(), 'employee');
    this.employeeCode = `EMP${String(seq).padStart(5, '0')}`;
  }

  // Calculate net salary
  if (this.isModified('salary')) {
    this.salary.netSalary =
      this.salary.basic +
      this.salary.hra +
      this.salary.allowances -
      this.salary.deductions;
  }
});

const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);

export default Employee;
