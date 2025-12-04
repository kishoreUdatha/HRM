import mongoose, { Document, Schema } from 'mongoose';

export interface ICurrency extends Document {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  exchangeRate: number;
  isActive: boolean;
  isDefault: boolean;
  lastRateUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const currencySchema = new Schema<ICurrency>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    symbolPosition: { type: String, enum: ['before', 'after'], default: 'before' },
    decimalPlaces: { type: Number, default: 2 },
    decimalSeparator: { type: String, default: '.' },
    thousandsSeparator: { type: String, default: ',' },
    exchangeRate: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    lastRateUpdate: Date,
  },
  { timestamps: true }
);

export default mongoose.model<ICurrency>('Currency', currencySchema);
