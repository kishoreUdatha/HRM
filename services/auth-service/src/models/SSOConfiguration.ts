import mongoose, { Document, Schema } from 'mongoose';

export interface ISSOConfiguration extends Document {
  tenantId: mongoose.Types.ObjectId;
  provider: 'saml' | 'oauth2' | 'oidc' | 'google' | 'microsoft' | 'okta';
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
  config: {
    // SAML Config
    entryPoint?: string;
    issuer?: string;
    cert?: string;
    callbackUrl?: string;
    signatureAlgorithm?: string;
    // OAuth2/OIDC Config
    clientId?: string;
    clientSecret?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    scopes?: string[];
    // Common
    logoutUrl?: string;
    attributeMapping?: { email: string; firstName: string; lastName: string; groups?: string };
  };
  allowedDomains: string[];
  autoProvision: boolean;
  defaultRole: string;
  groupMapping: { ssoGroup: string; hrmRole: string }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SSOConfigurationSchema = new Schema<ISSOConfiguration>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  provider: { type: String, enum: ['saml', 'oauth2', 'oidc', 'google', 'microsoft', 'okta'], required: true },
  name: { type: String, required: true },
  isEnabled: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  config: {
    entryPoint: String, issuer: String, cert: String, callbackUrl: String, signatureAlgorithm: String,
    clientId: String, clientSecret: { type: String, select: false }, authorizationUrl: String, tokenUrl: String, userInfoUrl: String, scopes: [String],
    logoutUrl: String, attributeMapping: { email: String, firstName: String, lastName: String, groups: String }
  },
  allowedDomains: [String],
  autoProvision: { type: Boolean, default: true },
  defaultRole: { type: String, default: 'employee' },
  groupMapping: [{ ssoGroup: String, hrmRole: String }],
  createdBy: { type: Schema.Types.ObjectId, required: true }
}, { timestamps: true });

SSOConfigurationSchema.index({ tenantId: 1, provider: 1 });

export default mongoose.model<ISSOConfiguration>('SSOConfiguration', SSOConfigurationSchema);
