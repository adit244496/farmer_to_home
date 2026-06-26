import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useAuthStore();

  const toggleLanguage = useCallback(async () => {
    const newLang = language === 'mr' ? 'en' : 'mr';
    await i18n.changeLanguage(newLang);
    setLanguage(newLang);
  }, [language, i18n, setLanguage]);

  const changeLanguage = useCallback(
    async (lang: 'mr' | 'en') => {
      await i18n.changeLanguage(lang);
      setLanguage(lang);
    },
    [i18n, setLanguage]
  );

  const isMr = language === 'mr';
  const isEn = language === 'en';

  const getLocalizedText = useCallback(
    (en: string, mr: string): string => {
      return language === 'mr' ? mr : en;
    },
    [language]
  );

  return {
    language,
    toggleLanguage,
    changeLanguage,
    isMr,
    isEn,
    getLocalizedText,
    currentLanguageLabel: language === 'mr' ? 'मराठी' : 'EN',
  };
};
