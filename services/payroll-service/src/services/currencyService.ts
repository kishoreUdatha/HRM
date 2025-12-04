import { Currency, EmployeeCurrency, ICurrency, IEmployeeCurrency } from '../models/Currency';

export async function setupCurrency(
  tenantId: string,
  data: {
    code: string;
    name: string;
    symbol: string;
    decimalPlaces?: number;
    country?: string;
    isBaseCurrency?: boolean;
  }
): Promise<ICurrency> {
  // If setting as base currency, unset any existing base currency
  if (data.isBaseCurrency) {
    await Currency.updateMany(
      { tenantId, isBaseCurrency: true },
      { isBaseCurrency: false }
    );
  }

  const currency = new Currency({
    tenantId,
    ...data,
    isActive: true
  });

  await currency.save();
  return currency;
}

export async function addExchangeRate(
  tenantId: string,
  currencyCode: string,
  exchangeRate: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveDate: Date;
    expiryDate?: Date;
    source?: 'manual' | 'api' | 'bank';
  }
): Promise<ICurrency | null> {
  const currency = await Currency.findOne({ tenantId, code: currencyCode });
  if (!currency) return null;

  // Deactivate existing rate for same currency pair
  currency.exchangeRates.forEach(er => {
    if (er.fromCurrency === exchangeRate.fromCurrency &&
        er.toCurrency === exchangeRate.toCurrency &&
        er.isActive) {
      er.isActive = false;
      er.expiryDate = new Date();
    }
  });

  currency.exchangeRates.push({
    ...exchangeRate,
    source: exchangeRate.source || 'manual',
    isActive: true
  });

  await currency.save();
  return currency;
}

export async function getExchangeRate(
  tenantId: string,
  fromCurrency: string,
  toCurrency: string,
  date?: Date
): Promise<number | null> {
  const queryDate = date || new Date();

  const currency = await Currency.findOne({
    tenantId,
    code: fromCurrency,
    isActive: true
  });

  if (!currency) return null;

  const rate = currency.exchangeRates.find(er =>
    er.fromCurrency === fromCurrency &&
    er.toCurrency === toCurrency &&
    er.isActive &&
    er.effectiveDate <= queryDate &&
    (!er.expiryDate || er.expiryDate >= queryDate)
  );

  return rate?.rate || null;
}

export async function convertAmount(
  tenantId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date?: Date
): Promise<{ convertedAmount: number; exchangeRate: number } | null> {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, exchangeRate: 1 };
  }

  const rate = await getExchangeRate(tenantId, fromCurrency, toCurrency, date);
  if (!rate) {
    // Try reverse rate
    const reverseRate = await getExchangeRate(tenantId, toCurrency, fromCurrency, date);
    if (!reverseRate) return null;

    const exchangeRate = 1 / reverseRate;
    return {
      convertedAmount: Math.round(amount * exchangeRate * 100) / 100,
      exchangeRate
    };
  }

  return {
    convertedAmount: Math.round(amount * rate * 100) / 100,
    exchangeRate: rate
  };
}

export async function setupEmployeeCurrency(
  tenantId: string,
  employeeId: string,
  data: {
    salaryCurrency: string;
    paymentCurrency: string;
    exchangeRateType: IEmployeeCurrency['exchangeRateType'];
    fixedExchangeRate?: number;
    effectiveFrom: Date;
  }
): Promise<IEmployeeCurrency> {
  // Deactivate existing currency settings
  await EmployeeCurrency.updateMany(
    { tenantId, employeeId, isActive: true },
    { isActive: false, effectiveTo: new Date() }
  );

  const employeeCurrency = new EmployeeCurrency({
    tenantId,
    employeeId,
    ...data,
    isActive: true
  });

  await employeeCurrency.save();
  return employeeCurrency;
}

export async function getEmployeeCurrency(
  tenantId: string,
  employeeId: string
): Promise<IEmployeeCurrency | null> {
  return EmployeeCurrency.findOne({
    tenantId,
    employeeId,
    isActive: true
  }).lean();
}

export async function calculateEmployeeSalaryInPaymentCurrency(
  tenantId: string,
  employeeId: string,
  salaryAmount: number,
  payDate?: Date
): Promise<{
  salaryCurrency: string;
  paymentCurrency: string;
  salaryAmount: number;
  exchangeRate: number;
  paymentAmount: number;
} | null> {
  const empCurrency = await getEmployeeCurrency(tenantId, employeeId);
  if (!empCurrency) return null;

  if (empCurrency.salaryCurrency === empCurrency.paymentCurrency) {
    return {
      salaryCurrency: empCurrency.salaryCurrency,
      paymentCurrency: empCurrency.paymentCurrency,
      salaryAmount,
      exchangeRate: 1,
      paymentAmount: salaryAmount
    };
  }

  let exchangeRate: number;

  if (empCurrency.exchangeRateType === 'fixed' && empCurrency.fixedExchangeRate) {
    exchangeRate = empCurrency.fixedExchangeRate;
  } else {
    const rate = await getExchangeRate(
      tenantId,
      empCurrency.salaryCurrency,
      empCurrency.paymentCurrency,
      payDate
    );
    if (!rate) return null;
    exchangeRate = rate;
  }

  return {
    salaryCurrency: empCurrency.salaryCurrency,
    paymentCurrency: empCurrency.paymentCurrency,
    salaryAmount,
    exchangeRate,
    paymentAmount: Math.round(salaryAmount * exchangeRate * 100) / 100
  };
}

export async function getCurrencyList(tenantId: string): Promise<ICurrency[]> {
  return Currency.find({ tenantId, isActive: true }).lean();
}

export async function getBaseCurrency(tenantId: string): Promise<ICurrency | null> {
  return Currency.findOne({ tenantId, isBaseCurrency: true, isActive: true }).lean();
}

export async function updateExchangeRates(
  tenantId: string,
  rates: Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    source: 'api' | 'bank';
  }>
): Promise<void> {
  const effectiveDate = new Date();

  for (const rateData of rates) {
    const currency = await Currency.findOne({ tenantId, code: rateData.fromCurrency });
    if (!currency) continue;

    // Deactivate existing rate
    currency.exchangeRates.forEach(er => {
      if (er.fromCurrency === rateData.fromCurrency &&
          er.toCurrency === rateData.toCurrency &&
          er.isActive) {
        er.isActive = false;
        er.expiryDate = effectiveDate;
      }
    });

    // Add new rate
    currency.exchangeRates.push({
      fromCurrency: rateData.fromCurrency,
      toCurrency: rateData.toCurrency,
      rate: rateData.rate,
      effectiveDate,
      source: rateData.source,
      isActive: true
    });

    await currency.save();
  }
}

export async function getExchangeRateHistory(
  tenantId: string,
  fromCurrency: string,
  toCurrency: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; rate: number; source: string }>> {
  const currency = await Currency.findOne({ tenantId, code: fromCurrency });
  if (!currency) return [];

  return currency.exchangeRates
    .filter(er =>
      er.fromCurrency === fromCurrency &&
      er.toCurrency === toCurrency &&
      er.effectiveDate >= startDate &&
      er.effectiveDate <= endDate
    )
    .map(er => ({
      date: er.effectiveDate,
      rate: er.rate,
      source: er.source
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
