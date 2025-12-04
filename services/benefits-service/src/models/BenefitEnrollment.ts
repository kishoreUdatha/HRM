import mongoose, { Document, Schema } from 'mongoose';

export interface IBenefitEnrollment extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  benefitPlanId: mongoose.Types.ObjectId;
  tierId: string;
  tierName: string;
  enrollmentDate: Date;
  effectiveDate: Date;
  terminationDate?: Date;
  status: 'pending' | 'active' | 'terminated' | 'cancelled' | 'pending_approval';
  enrollmentReason: 'new_hire' | 'open_enrollment' | 'qualifying_event' | 'promotion' | 'other';
  qualifyingEvent?: {
    type: 'marriage' | 'birth' | 'adoption' | 'divorce' | 'loss_of_coverage' | 'other';
    date: Date;
    description?: string;
    documents?: string[];
  };
  dependents?: {
    name: string;
    relationship: 'spouse' | 'child' | 'domestic_partner' | 'parent' | 'other';
    dateOfBirth: Date;
    ssn?: string;
    documents?: string[];
  }[];
  beneficiaries?: {
    name: string;
    relationship: string;
    percentage: number;
    contactInfo?: string;
  }[];
  employeeCost: number;
  employerCost: number;
  paymentFrequency: 'monthly' | 'bi-weekly' | 'weekly' | 'annual';
  notes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const benefitEnrollmentSchema = new Schema<IBenefitEnrollment>(
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
    benefitPlanId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'BenefitPlan',
    },
    tierId: String,
    tierName: String,
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    terminationDate: Date,
    status: {
      type: String,
      enum: ['pending', 'active', 'terminated', 'cancelled', 'pending_approval'],
      default: 'pending',
    },
    enrollmentReason: {
      type: String,
      enum: ['new_hire', 'open_enrollment', 'qualifying_event', 'promotion', 'other'],
      required: true,
    },
    qualifyingEvent: {
      type: {
        type: String,
        enum: ['marriage', 'birth', 'adoption', 'divorce', 'loss_of_coverage', 'other'],
      },
      date: Date,
      description: String,
      documents: [String],
    },
    dependents: [{
      name: String,
      relationship: {
        type: String,
        enum: ['spouse', 'child', 'domestic_partner', 'parent', 'other'],
      },
      dateOfBirth: Date,
      ssn: String,
      documents: [String],
    }],
    beneficiaries: [{
      name: String,
      relationship: String,
      percentage: { type: Number, min: 0, max: 100 },
      contactInfo: String,
    }],
    employeeCost: { type: Number, default: 0 },
    employerCost: { type: Number, default: 0 },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly', 'annual'],
      default: 'monthly',
    },
    notes: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
  },
  {
    timestamps: true,
  }
);

benefitEnrollmentSchema.index({ tenantId: 1, employeeId: 1, benefitPlanId: 1 });
benefitEnrollmentSchema.index({ tenantId: 1, status: 1 });
benefitEnrollmentSchema.index({ tenantId: 1, effectiveDate: 1 });

export default mongoose.model<IBenefitEnrollment>('BenefitEnrollment', benefitEnrollmentSchema);
