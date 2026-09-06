import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';
import { useLanguage } from '../../i18n/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();

  if (isOnline) return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#191B1C] border border-[#2E3234] px-3.5 py-1.5 text-xs font-medium text-[#F2F1ED] shadow-md">
      <WifiOff aria-hidden="true" className="w-3.5 h-3.5 text-[#B9BCBE]" />
      <span className="font-ui">{t('offlineNotice')}</span>
    </div>
  );
};
