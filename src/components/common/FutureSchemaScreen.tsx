import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const FutureSchemaScreen: React.FC = () => {
  const { locale } = useLanguage();
  return (
    <main className="min-h-screen w-full bg-[#F4F3EF] text-[#191B1C] flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4">
        <span className="text-[11px] font-semibold tracking-[0.24em] uppercase">SMOKE LAB</span>
        <h1 className="font-display text-4xl tracking-[-0.03em]">
          {locale === 'de' ? 'Diese Daten stammen aus einer neueren Version.' : 'This data comes from a newer version.'}
        </h1>
        <p className="text-sm text-[#747779] leading-relaxed">
          {locale === 'de'
            ? 'Diese App-Version verändert die Daten nicht. Aktualisiere Smoke Lab und öffne es danach erneut.'
            : 'This app version will not modify the data. Update Smoke Lab, then open it again.'}
        </p>
        <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-[#D9D9D4] px-4 py-2.5 text-sm font-medium">
          {locale === 'de' ? 'Neu laden' : 'Reload'}
        </button>
      </div>
    </main>
  );
};
