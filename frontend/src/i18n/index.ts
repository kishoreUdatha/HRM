// i18n stub - packages not installed
// TODO: Install i18next, react-i18next, and i18next-browser-languagedetector to enable i18n

const i18n = {
  t: (key: string) => key,
  changeLanguage: (_lng: string) => Promise.resolve(),
  language: 'en',
};

export default i18n;
