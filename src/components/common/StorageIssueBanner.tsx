import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const StorageIssueBanner: React.FC = () => {
  const { locale } = useLanguage();
  return (
    <div role="alert" aria-live="assertive" className="sticky top-0 z-40 border-b border-[#C8BEB1] bg-[#EEE8DE] px-4 py-2.5 text-[#191B1C]">
      <div className="mx-auto flex max-w-md items-start gap-2.5">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="font-ui text-[11px] leading-relaxed">
          {locale === 'de'
            ? 'Lokales Speichern ist gerade nicht zuverlässig. Neue Eingaben könnten verloren gehen. Exportiere vorhandene Daten und lade die App neu.'
            : 'Local saving is not reliable right now. New entries may be lost. Export existing data and reload the app.'}
        </p>
      </div>
    </div>
  );
};
