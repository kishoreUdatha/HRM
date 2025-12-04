import mongoose, { Document, Schema } from 'mongoose';

export interface ITwoFactorAuth extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  method: 'totp' | 'sms' | 'email' | 'backup_codes';
  isEnabled: boolean;
  secret?: string;
  phoneNumber?: string;
  backupCodes?: { code: string; used: boolean; usedAt?: Date }[];
  lastVerified?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TwoFactorAuthSchema = new Schema<ITwoFactorAuth>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  method: { type: String, enum: ['totp', 'sms', 'email', 'backup_codes'], required: true },
  isEnabled: { type: Boolean, default: false },
  secret: { type: String, select: false },
  phoneNumber: { type: String },
  backupCodes: [{ code: { type: String }, used: { type: Boolean, default: false }, usedAt: Date }],
  lastVerified: Date,
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: Date
}, { timestamps: true });

TwoFactorAuthSchema.index({ userId: 1, method: 1 }, { unique: true });

export default mongoose.model<ITwoFactorAuth>('TwoFactorAuth', TwoFactorAuthSchema);
