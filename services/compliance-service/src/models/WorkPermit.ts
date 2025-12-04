import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkPermit extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  type: 'work_visa' | 'work_permit' | 'residence_permit' | 'green_card' | 'citizenship' | 'other';
  country: string;
  permitNumber: string;
  issueDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expiring_soon' | 'expired' | 'pending_renewal' | 'revoked';
  issuingAuthority: string;
  sponsorType?: 'employer' | 'self' | 'family' | 'other';
  documents: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  renewalHistory: {
    previousExpiryDate: Date;
    renewedAt: Date;
    newExpiryDate: Date;
    processedBy: mongoose.Types.ObjectId;
  }[];
  alerts: {
    daysBeforeExpiry: number;
    notified: boolean;
    notifiedAt?: Date;
  }[];
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workPermitSchema = new Schema<IWorkPermit>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    type: {
      type: String,
      enum: ['work_visa', 'work_permit', 'residence_permit', 'green_card', 'citizenship', 'other'],
      required: true,
    },
    country: { type: String, required: true },
    permitNumber: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['valid', 'expiring_soon', 'expired', 'pending_renewal', 'revoked'],
      default: 'valid',
    },
    issuingAuthority: String,
    sponsorType: { type: String, enum: ['employer', 'self', 'family', 'other'] },
    documents: [{ name: String, url: String, uploadedAt: Date }],
    renewalHistory: [{
      previousExpiryDate: Date,
      renewedAt: Date,
      newExpiryDate: Date,
      processedBy: Schema.Types.ObjectId,
    }],
    alerts: [{
      daysBeforeExpiry: Number,
      notified: { type: Boolean, default: false },
      notifiedAt: Date,
    }],
    notes: String,
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

workPermitSchema.index({ tenantId: 1, employeeId: 1 });
workPermitSchema.index({ tenantId: 1, expiryDate: 1 });
workPermitSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IWorkPermit>('WorkPermit', workPermitSchema);
