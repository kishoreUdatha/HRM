import { Request, Response } from 'express';
import Language from '../models/Language';
import Translation from '../models/Translation';
import Currency from '../models/Currency';
import TenantLocalization from '../models/TenantLocalization';

// Language Controllers
export const getLanguages = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const query: any = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const languages = await Language.find(query).sort({ name: 1 });
    res.json({ success: true, data: languages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLanguage = async (req: Request, res: Response) => {
  try {
    const language = new Language(req.body);
    await language.save();
    res.status(201).json({ success: true, data: language });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLanguage = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const language = await Language.findOneAndUpdate({ code }, req.body, { new: true });
    if (!language) return res.status(404).json({ success: false, message: 'Language not found' });
    res.json({ success: true, data: language });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const seedLanguages = async (_req: Request, res: Response) => {
  try {
    const defaultLanguages = [
      { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', isDefault: true, dateFormat: 'MM/DD/YYYY' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', dateFormat: 'DD/MM/YYYY' },
      { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', dateFormat: 'DD/MM/YYYY' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', dateFormat: 'DD.MM.YYYY' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', dateFormat: 'YYYY/MM/DD' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', dateFormat: 'YYYY/MM/DD' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', dateFormat: 'DD/MM/YYYY' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', dateFormat: 'DD/MM/YYYY' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', dateFormat: 'DD/MM/YYYY' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', dateFormat: 'DD.MM.YYYY' },
    ];

    for (const lang of defaultLanguages) {
      await Language.findOneAndUpdate({ code: lang.code }, lang, { upsert: true });
    }
    res.json({ success: true, message: 'Languages seeded successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Translation Controllers
export const getTranslations = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { languageCode, namespace } = req.query;

    const baseQuery: any = { languageCode };
    if (namespace) baseQuery.namespace = namespace;

    const baseTranslations = await Translation.find({ ...baseQuery, tenantId: null });
    const customTranslations = tenantId
      ? await Translation.find({ ...baseQuery, tenantId })
      : [];

    const translationMap = new Map();
    baseTranslations.forEach(t => translationMap.set(`${t.namespace}.${t.key}`, t));
    customTranslations.forEach(t => translationMap.set(`${t.namespace}.${t.key}`, t));

    const result: Record<string, Record<string, string>> = {};
    translationMap.forEach((t, key) => {
      const [ns, ...keyParts] = key.split('.');
      if (!result[ns]) result[ns] = {};
      result[ns][keyParts.join('.')] = t.value;
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTranslationsByNamespace = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { languageCode, namespace } = req.params;

    const baseTranslations = await Translation.find({ languageCode, namespace, tenantId: null });
    const customTranslations = tenantId
      ? await Translation.find({ languageCode, namespace, tenantId })
      : [];

    const translationMap = new Map();
    baseTranslations.forEach(t => translationMap.set(t.key, t.value));
    customTranslations.forEach(t => translationMap.set(t.key, t.value));

    res.json({ success: true, data: Object.fromEntries(translationMap) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertTranslation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { languageCode, namespace, key, value, pluralForms, context } = req.body;

    const translation = await Translation.findOneAndUpdate(
      { languageCode, namespace, key, tenantId: tenantId || null },
      { languageCode, namespace, key, value, pluralForms, context, tenantId: tenantId || null, isCustom: !!tenantId },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: translation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkUpsertTranslations = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { languageCode, namespace, translations } = req.body;

    const ops = Object.entries(translations).map(([key, value]) => ({
      updateOne: {
        filter: { languageCode, namespace, key, tenantId: tenantId || null },
        update: { languageCode, namespace, key, value, tenantId: tenantId || null, isCustom: !!tenantId },
        upsert: true,
      },
    }));
    await Translation.bulkWrite(ops);
    res.json({ success: true, message: `${Object.keys(translations).length} translations upserted` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomTranslation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { languageCode, namespace, key } = req.params;
    await Translation.deleteOne({ languageCode, namespace, key, tenantId });
    res.json({ success: true, message: 'Custom translation deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Currency Controllers
export const getCurrencies = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const query: any = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const currencies = await Currency.find(query).sort({ name: 1 });
    res.json({ success: true, data: currencies });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCurrency = async (req: Request, res: Response) => {
  try {
    const currency = new Currency(req.body);
    await currency.save();
    res.status(201).json({ success: true, data: currency });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCurrency = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currency = await Currency.findOneAndUpdate({ code }, req.body, { new: true });
    if (!currency) return res.status(404).json({ success: false, message: 'Currency not found' });
    res.json({ success: true, data: currency });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExchangeRates = async (req: Request, res: Response) => {
  try {
    const { rates } = req.body;
    const ops = Object.entries(rates).map(([code, rate]) => ({
      updateOne: {
        filter: { code },
        update: { exchangeRate: rate, lastRateUpdate: new Date() },
      },
    }));
    await Currency.bulkWrite(ops);
    res.json({ success: true, message: 'Exchange rates updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const seedCurrencies = async (_req: Request, res: Response) => {
  try {
    const defaultCurrencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', isDefault: true },
      { code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before' },
      { code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', symbolPosition: 'before' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', symbolPosition: 'before', decimalPlaces: 0 },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', symbolPosition: 'before' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', symbolPosition: 'before' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', symbolPosition: 'before' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', symbolPosition: 'after' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', symbolPosition: 'after' },
    ];

    for (const curr of defaultCurrencies) {
      await Currency.findOneAndUpdate({ code: curr.code }, curr, { upsert: true });
    }
    res.json({ success: true, message: 'Currencies seeded successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tenant Localization Controllers
export const getTenantLocalization = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    let config = await TenantLocalization.findOne({ tenantId });
    if (!config) {
      config = new TenantLocalization({ tenantId });
      await config.save();
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTenantLocalization = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const config = await TenantLocalization.findOneAndUpdate(
      { tenantId },
      { ...req.body, tenantId },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const convertCurrency = async (req: Request, res: Response) => {
  try {
    const { amount, from, to } = req.query;
    const [fromCurrency, toCurrency] = await Promise.all([
      Currency.findOne({ code: from }),
      Currency.findOne({ code: to }),
    ]);

    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({ success: false, message: 'Invalid currency code' });
    }

    const amountInBase = Number(amount) / fromCurrency.exchangeRate;
    const convertedAmount = amountInBase * toCurrency.exchangeRate;

    res.json({
      success: true,
      data: {
        amount: Number(amount),
        from: from,
        to: to,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        rate: toCurrency.exchangeRate / fromCurrency.exchangeRate,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
