import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  expiryDate?: Date;
  source: 'manual' | 'api' | 'bank';
  isActive: boolean;
}

export interface ICurrency extends Document {
  tenantId: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBaseCurrency: boolean;
  isActive: boolean;
  country: string;
  exchangeRates: IExchangeRate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeCurrency extends Document {
  tenantId: string;
  employeeId: string;
  salaryCurrency: string;
  paymentCurrency: string;
  exchangeRateType: 'fixed' | 'monthly' | 'realtime';
  fixedExchangeRate?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeRateSchema = new Schema({
  fromCurrency: { type: String, required: true },
  toCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
  expiryDate: Date,
  source: {
    type: String,
    enum: ['manual', 'api', 'bank'],
    default: 'manual'
  },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const CurrencySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  decimalPlaces: { type: Number, default: 2 },
  isBaseCurrency: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  country: String,
  exchangeRates: [ExchangeRateSchema]
}, { timestamps: true });

CurrencySchema.index({ tenantId: 1, code: 1 }, { unique: true });
CurrencySchema.index({ tenantId: 1, isBaseCurrency: 1 });

const EmployeeCurrencySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  salaryCurrency: { type: String, required: true },
  paymentCurrency: { type: String, required: true },
  exchangeRateType: {
    type: String,
    enum: ['fixed', 'monthly', 'realtime'],
    default: 'monthly'
  },
  fixedExchangeRate: Number,
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

EmployeeCurrencySchema.index({ tenantId: 1, employeeId: 1, isActive: 1 });

export const Currency = mongoose.model<ICurrency>('Currency', CurrencySchema);
export const EmployeeCurrency = mongoose.model<IEmployeeCurrency>('EmployeeCurrency', EmployeeCurrencySchema);
