import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLanguage } from '../../i18n/LanguageContext';
import { PWAReleasePolicy } from '../../services/PWAReleasePolicy';

export const PWAUpdatePrompt: React.FC = () => {
  const { t } = useLanguage();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [serviceWorkerUrl, setServiceWorkerUrl] = useState('');

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, currentRegistration) {
      setServiceWorkerUrl(swUrl);
      setRegistration(currentRegistration ?? null);
    },
  });

  useEffect(() => {
    if (!registration || !serviceWorkerUrl) return;

    const checkForUpdate = async () => {
      if (!PWAReleasePolicy.shouldCheckForUpdate({
        online: navigator.onLine,
        visibilityState: document.visibilityState,
      })) return;

      if (registration.installing) return;

      try {
        const response = await fetch(serviceWorkerUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache',
          },
        });
        if (response.ok) await registration.update();
      } catch {
        // Network/update failures are non-destructive. Try again on the next lifecycle check.
      }
    };

    const timer = window.setInterval(
      () => void checkForUpdate(),
      PWAReleasePolicy.updateCheckIntervalMs(),
    );
    const onOnline = () => void checkForUpdate();
    const onVisibilityChange = () => void checkForUpdate();

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [registration, serviceWorkerUrl]);

  useEffect(() => {
    if (!needRefresh) return;
    document.documentElement.dataset.smokelabUpdateReady = 'true';
    return () => {
      delete document.documentElement.dataset.smokelabUpdateReady;
    };
  }, [needRefresh]);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sticky top-0 z-[60] border-b border-[#D9D9D4] bg-[#F4F3EF]/98 px-4 pb-3 pt-3 shadow-[0_8px_24px_rgba(25,27,28,0.08)] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <RefreshCw aria-hidden="true" className="h-4 w-4 shrink-0 text-[#17372E]" />
        <div className="min-w-0 flex-1">
          <p className="font-ui text-xs font-semibold text-[#191B1C]">{t('pwaUpdateReadyTitle')}</p>
          <p className="mt-0.5 font-ui text-[11px] leading-relaxed text-[#747779]">{t('pwaUpdateReadyBody')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="min-h-[44px] rounded-lg px-2.5 text-[11px] font-medium text-[#747779] hover:bg-[#E7E7E3] hover:text-[#191B1C]"
          >
            {t('pwaUpdateLater')}
          </button>
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="btn-tactile min-h-[44px] rounded-lg bg-[#191B1C] px-3 text-[11px] font-semibold text-[#F2F1ED] hover:bg-[#232627]"
          >
            {t('pwaUpdateNow')}
          </button>
        </div>
      </div>
    </div>
  );
};
