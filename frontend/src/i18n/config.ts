import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en.json';
import arTranslation from './locales/ar.json';
import frTranslation from './locales/fr.json';
import deTranslation from './locales/de.json';
import zhTranslation from './locales/zh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslation,
      ar: arTranslation,
      fr: frTranslation,
      de: deTranslation,
      zh: zhTranslation
    },
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

// Set HTML document direction based on language
const updateLayoutDirection = (lng: string) => {
  const direction = lng.startsWith('ar') ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
};

// Initialize direction
updateLayoutDirection(i18n.resolvedLanguage || 'ar');

// Listen to language change to toggle RTL/LTR
i18n.on('languageChanged', (lng) => {
  updateLayoutDirection(lng);
});

export default i18n;
