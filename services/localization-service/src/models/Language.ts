import mongoose, { Document, Schema } from 'mongoose';

export interface ILanguage extends Document {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  isActive: boolean;
  isDefault: boolean;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    precision: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const languageSchema = new Schema<ILanguage>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nativeName: { type: String, required: true },
    direction: { type: String, enum: ['ltr', 'rtl'], default: 'ltr' },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: 'h:mm A' },
    numberFormat: {
      decimal: { type: String, default: '.' },
      thousands: { type: String, default: ',' },
      precision: { type: Number, default: 2 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILanguage>('Language', languageSchema);
