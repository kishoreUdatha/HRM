import mongoose, { Document, Schema } from 'mongoose';

export interface ISSOConfig extends Document {
  tenantId: string;
  provider: 'okta' | 'azure_ad' | 'google' | 'onelogin' | 'auth0' | 'custom_saml' | 'custom_oidc';
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
  protocol: 'saml' | 'oidc';
  samlConfig?: {
    entityId: string;
    ssoUrl: string;
    sloUrl?: string;
    certificate: string;
    signatureAlgorithm: 'sha256' | 'sha512';
    nameIdFormat: string;
    attributeMapping: {
      email: string;
      firstName?: string;
      lastName?: string;
      department?: string;
      role?: string;
    };
  };
  oidcConfig?: {
    issuer: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    responseType: string;
    attributeMapping: {
      email: string;
      firstName?: string;
      lastName?: string;
      department?: string;
      role?: string;
    };
  };
  jitProvisioning: {
    enabled: boolean;
    defaultRole?: string;
    defaultDepartment?: mongoose.Types.ObjectId;
  };
  domainRestrictions?: string[];
  allowedGroups?: string[];
  forceSSOForDomains?: string[];
  sessionDuration: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SSOConfigSchema = new Schema<ISSOConfig>(
  {
    tenantId: { type: String, required: true, index: true },
    provider: {
      type: String,
      enum: ['okta', 'azure_ad', 'google', 'onelogin', 'auth0', 'custom_saml', 'custom_oidc'],
      required: true,
    },
    name: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    protocol: { type: String, enum: ['saml', 'oidc'], required: true },
    samlConfig: {
      entityId: String,
      ssoUrl: String,
      sloUrl: String,
      certificate: { type: String, select: false },
      signatureAlgorithm: { type: String, enum: ['sha256', 'sha512'], default: 'sha256' },
      nameIdFormat: { type: String, default: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' },
      attributeMapping: {
        email: String,
        firstName: String,
        lastName: String,
        department: String,
        role: String,
      },
    },
    oidcConfig: {
      issuer: String,
      authorizationUrl: String,
      tokenUrl: String,
      userInfoUrl: String,
      clientId: String,
      clientSecret: { type: String, select: false },
      scopes: [String],
      responseType: { type: String, default: 'code' },
      attributeMapping: {
        email: String,
        firstName: String,
        lastName: String,
        department: String,
        role: String,
      },
    },
    jitProvisioning: {
      enabled: { type: Boolean, default: false },
      defaultRole: String,
      defaultDepartment: Schema.Types.ObjectId,
    },
    domainRestrictions: [String],
    allowedGroups: [String],
    forceSSOForDomains: [String],
    sessionDuration: { type: Number, default: 86400 },
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

SSOConfigSchema.index({ tenantId: 1, provider: 1 });

export default mongoose.model<ISSOConfig>('SSOConfig', SSOConfigSchema);
