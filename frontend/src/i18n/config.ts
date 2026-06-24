import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en.json';
import arTranslation from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslation,
      ar: arTranslation
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
