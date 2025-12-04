import { Router } from 'express';
import * as controller from '../controllers/localizationController';

const router = Router();

// Languages
router.get('/languages', controller.getLanguages);
router.post('/languages', controller.createLanguage);
router.put('/languages/:code', controller.updateLanguage);
router.post('/languages/seed', controller.seedLanguages);

// Translations
router.get('/translations', controller.getTranslations);
router.get('/translations/:languageCode/:namespace', controller.getTranslationsByNamespace);
router.post('/translations', controller.upsertTranslation);
router.post('/translations/bulk', controller.bulkUpsertTranslations);
router.delete('/translations/:languageCode/:namespace/:key', controller.deleteCustomTranslation);

// Currencies
router.get('/currencies', controller.getCurrencies);
router.post('/currencies', controller.createCurrency);
router.put('/currencies/:code', controller.updateCurrency);
router.post('/currencies/seed', controller.seedCurrencies);
router.post('/currencies/rates', controller.updateExchangeRates);
router.get('/currencies/convert', controller.convertCurrency);

// Tenant Localization
router.get('/tenant', controller.getTenantLocalization);
router.put('/tenant', controller.updateTenantLocalization);

export default router;
