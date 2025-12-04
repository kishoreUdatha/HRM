import mongoose, { Document, Schema } from 'mongoose';

export interface ISecuritySettings extends Document {
  tenantId: mongoose.Types.ObjectId;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
    expiryDays: number;
  };
  sessionPolicy: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // minutes
    idleTimeout: number; // minutes
    rememberMeDuration: number; // days
  };
  loginPolicy: {
    maxFailedAttempts: number;
    lockoutDuration: number; // minutes
    captchaAfterFailures: number;
    requireMFA: boolean;
    mfaMethods: ('totp' | 'sms' | 'email')[];
  };
  ipWhitelist: {
    enabled: boolean;
    addresses: string[];
    allowVPN: boolean;
  };
  ipBlacklist: {
    enabled: boolean;
    addresses: string[];
  };
  geoRestriction: {
    enabled: boolean;
    allowedCountries: string[];
    blockedCountries: string[];
  };
  gdprSettings: {
    dataRetentionDays: number;
    anonymizeAfterDays: number;
    allowDataExport: boolean;
    allowDataDeletion: boolean;
    consentRequired: boolean;
    cookieConsentRequired: boolean;
  };
  auditSettings: {
    logLoginAttempts: boolean;
    logDataAccess: boolean;
    logDataModification: boolean;
    retentionDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SecuritySettingsSchema = new Schema<ISecuritySettings>({
  tenantId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  passwordPolicy: {
    minLength: { type: Number, default: 8 },
    requireUppercase: { type: Boolean, default: true },
    requireLowercase: { type: Boolean, default: true },
    requireNumbers: { type: Boolean, default: true },
    requireSpecialChars: { type: Boolean, default: true },
    preventReuse: { type: Number, default: 5 },
    expiryDays: { type: Number, default: 90 }
  },
  sessionPolicy: {
    maxConcurrentSessions: { type: Number, default: 5 },
    sessionTimeout: { type: Number, default: 480 },
    idleTimeout: { type: Number, default: 30 },
    rememberMeDuration: { type: Number, default: 30 }
  },
  loginPolicy: {
    maxFailedAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 30 },
    captchaAfterFailures: { type: Number, default: 3 },
    requireMFA: { type: Boolean, default: false },
    mfaMethods: [{ type: String, enum: ['totp', 'sms', 'email'] }]
  },
  ipWhitelist: { enabled: { type: Boolean, default: false }, addresses: [String], allowVPN: { type: Boolean, default: true } },
  ipBlacklist: { enabled: { type: Boolean, default: false }, addresses: [String] },
  geoRestriction: { enabled: { type: Boolean, default: false }, allowedCountries: [String], blockedCountries: [String] },
  gdprSettings: {
    dataRetentionDays: { type: Number, default: 2555 }, // 7 years
    anonymizeAfterDays: { type: Number, default: 365 },
    allowDataExport: { type: Boolean, default: true },
    allowDataDeletion: { type: Boolean, default: true },
    consentRequired: { type: Boolean, default: true },
    cookieConsentRequired: { type: Boolean, default: true }
  },
  auditSettings: {
    logLoginAttempts: { type: Boolean, default: true },
    logDataAccess: { type: Boolean, default: true },
    logDataModification: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 365 }
  }
}, { timestamps: true });

export default mongoose.model<ISecuritySettings>('SecuritySettings', SecuritySettingsSchema);
