import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const StorageUnavailableScreen: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { locale } = useLanguage();
  return (
    <main className="min-h-screen w-full bg-[#F4F3EF] text-[#191B1C] flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-5">
        <span className="text-[11px] font-semibold tracking-[0.24em] uppercase">SMOKE LAB</span>
        <h1 className="font-display text-4xl tracking-[-0.03em]">
          {locale === 'de' ? 'Lokaler Speicher ist nicht verfügbar.' : 'Local storage is unavailable.'}
        </h1>
        <p className="text-sm text-[#747779] leading-relaxed">
          {locale === 'de'
            ? 'Smoke Lab speichert Verhaltensdaten ausschließlich lokal. Deshalb lassen wir dich nicht in einen Modus weitergehen, der nur so tun würde, als wären neue Einträge gespeichert. Deine vorhandenen Daten werden nicht gelöscht.'
            : 'Smoke Lab stores behavioral data locally only. We will not continue into a mode that could pretend new entries were saved. Existing data is not deleted.'}
        </p>
        <button type="button" onClick={onRetry} className="rounded-xl bg-[#191B1C] px-5 py-3 text-sm font-semibold text-[#F2F1ED]">
          {locale === 'de' ? 'Erneut prüfen' : 'Check again'}
        </button>
      </div>
    </main>
  );
};
