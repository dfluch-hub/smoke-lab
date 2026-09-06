import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const standaloneNow = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

const iosNow = (): boolean => {
  if (typeof window === 'undefined') return false;
  const navigatorWithTouch = window.navigator as Navigator & { maxTouchPoints?: number };
  const ua = navigatorWithTouch.userAgent.toLowerCase();
  const classicIOS = /iphone|ipad|ipod/.test(ua);
  // iPadOS may report a desktop-class Macintosh user agent.
  const desktopClassIPad = /macintosh/.test(ua) && (navigatorWithTouch.maxTouchPoints || 0) > 1;
  return classicIOS || desktopClassIPad;
};

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(standaloneNow);
  const [isIOS, setIsIOS] = useState(iosNow);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const checkStandalone = () => setIsInstalled(standaloneNow());
    const checkIOS = () => setIsIOS(iosNow());

    checkStandalone();
    checkIOS();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('orientationchange', checkIOS);
    displayMode.addEventListener?.('change', checkStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('orientationchange', checkIOS);
      displayMode.removeEventListener?.('change', checkStandalone);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('PWA install error:', err);
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
