import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Locale, TranslationKey } from './translations';
import { safeStorageGet, safeStorageSet } from '../storage/safeStorage';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'smokelab_preferred_locale';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = safeStorageGet(STORAGE_KEY);
      if (saved === 'de' || saved === 'en') return saved;

      // Existing installs may predate the dedicated locale key. Read the profile
      // directly so the first frame after an update does not flash the wrong language.
      const rawProfile = safeStorageGet('smokelab_user_profile_v1') || safeStorageGet('smokelab_user_profile');
      if (rawProfile) {
        try {
          const profile = JSON.parse(rawProfile) as { preferredLanguage?: unknown };
          if (profile.preferredLanguage === 'de' || profile.preferredLanguage === 'en') return profile.preferredLanguage;
        } catch {
          // Let storage migration/integrity handle malformed profile JSON later.
        }
      }

      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('de')) return 'de';
    } catch {
      // Fallback
    }
    return 'en';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      safeStorageSet(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: TranslationKey): string => {
    const table = translations[locale] || translations.en;
    return (table[key] || translations.en[key] || key) as string;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
