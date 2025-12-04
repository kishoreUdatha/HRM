import mongoose, { Document, Schema } from 'mongoose';

export interface ITenantLocalization extends Document {
  tenantId: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultTimezone: string;
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: number;
  numberFormat: {
    decimal: string;
    thousands: string;
    precision: number;
  };
  addressFormat?: string;
  phoneFormat?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tenantLocalizationSchema = new Schema<ITenantLocalization>(
  {
    tenantId: { type: String, required: true, unique: true },
    defaultLanguage: { type: String, default: 'en' },
    supportedLanguages: { type: [String], default: ['en'] },
    defaultCurrency: { type: String, default: 'USD' },
    supportedCurrencies: { type: [String], default: ['USD'] },
    defaultTimezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: 'h:mm A' },
    firstDayOfWeek: { type: Number, default: 0 },
    numberFormat: {
      decimal: { type: String, default: '.' },
      thousands: { type: String, default: ',' },
      precision: { type: Number, default: 2 },
    },
    addressFormat: String,
    phoneFormat: String,
  },
  { timestamps: true }
);

export default mongoose.model<ITenantLocalization>('TenantLocalization', tenantLocalizationSchema);
