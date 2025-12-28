import mongoose, { Document, Schema } from 'mongoose';

// Reference model for Employee - used for populate() only
// The actual Employee documents are managed by employee-service
// This model just defines the schema structure for cross-service population

export interface IEmployee extends Document {
  tenantId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
}

const employeeSchema = new Schema<IEmployee>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    // Use the same collection as employee-service
    collection: 'employees',
  }
);

export default mongoose.model<IEmployee>('Employee', employeeSchema);
