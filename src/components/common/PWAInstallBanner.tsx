import React, { useState } from 'react';
import { Download, Share2, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useLanguage } from '../../i18n/LanguageContext';
import { ModalSheet } from './ModalSheet';

export const PWAInstallBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t } = useLanguage();

  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-[#E7E7E3] px-2.5 py-1 text-[11px] font-medium text-[#191B1C]">
        <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-[#17372E]" />
        <span>{t('pwaStandaloneBadge')}</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`btn-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg font-mono uppercase tracking-wider transition ${
          compact
            ? 'bg-[#191B1C] text-[#F2F1ED] px-2.5 py-1 text-[10px] hover:bg-[#232627]'
            : 'bg-[#191B1C] text-[#F2F1ED] px-3.5 py-1.5 text-xs hover:bg-[#232627]'
        }`}
      >
        <Download aria-hidden="true" className="w-3 h-3 stroke-[2]" />
        <span>{t('installApp')}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`btn-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#D9D9D4] bg-transparent px-2.5 py-1 font-mono uppercase tracking-wider text-[#191B1C] hover:bg-[#E7E7E3] transition ${
            compact ? 'text-[10px]' : 'text-xs'
          }`}
        >
          <Share2 aria-hidden="true" className="w-3 h-3 text-[#191B1C] stroke-[2]" />
          <span>{t('installApp')}</span>
        </button>

        <ModalSheet
          isOpen={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title={t('installApp')}
          badge="iOS Safari"
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-[#747779] leading-relaxed">
              {t('installAppDesc')}
            </p>
            <div className="space-y-3 rounded-xl bg-[#E7E7E3] p-4 text-xs font-medium text-[#191B1C]">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#191B1C] text-[#F2F1ED] font-mono text-[10px]">
                  1
                </div>
                <span>{t('installIosStep1')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#191B1C] text-[#F2F1ED] font-mono text-[10px]">
                  2
                </div>
                <span>{t('installIosStep2')}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-[#191B1C] py-3 text-xs font-semibold text-[#F2F1ED] hover:bg-[#232627] transition"
            >
              {t('installClose')}
            </button>
          </div>
        </ModalSheet>
      </>
    );
  }

  return null;
};
