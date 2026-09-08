import React, { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  badge?: string;
  onBack?: () => void;
  closeDisabled?: boolean;
  closeOnBackdrop?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const ModalSheet: React.FC<ModalSheetProps> = ({
  isOpen,
  onClose,
  title,
  badge,
  onBack,
  closeDisabled = false,
  closeOnBackdrop = true,
  headerAction,
  children,
}) => {
  const { t } = useLanguage();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      (focusable[0] || sheet).focus();
    };
    const frame = window.requestAnimationFrame(focusFirst);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!closeDisabled) onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        sheet.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = priorOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose, closeDisabled]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (closeOnBackdrop && !closeDisabled) onClose();
            }}
            className="fixed inset-0 bg-[#191B1C]/50 backdrop-blur-[6px]"
            aria-hidden="true"
          />

          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={!title ? t('dialogLabel') : undefined}
            tabIndex={-1}
            initial={{ y: '100%', opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className="relative z-10 w-full max-w-lg rounded-t-[20px] sm:rounded-[20px] bg-[#F4F3EF] border border-[#D9D9D4] p-6 pt-3 shadow-[0_16px_48px_rgba(25,27,28,0.18)] max-h-[88vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] focus:outline-none"
          >
            <div className="flex justify-center pb-3 pt-1" aria-hidden="true">
              <div className="h-1 w-9 rounded-full bg-[#D9D9D4]" />
            </div>

            {(title || badge || headerAction) && (
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#D9D9D4] pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  {onBack && (
                    <button
                      type="button"
                      id="btn-sheet-back"
                      onClick={onBack}
                      className="h-11 w-11 -ml-1 inline-flex items-center justify-center rounded-lg text-[#747779] hover:text-[#191B1C] hover:bg-[#E7E7E3] transition"
                      aria-label={t('back')}
                    >
                      <ArrowLeft className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                    </button>
                  )}
                  <div className="min-w-0">
                    {badge && (
                      <span className="inline-block rounded-md bg-[#E7E7E3] px-2 py-0.5 text-[10px] font-mono tracking-wider text-[#191B1C] uppercase mb-1">
                        {badge}
                      </span>
                    )}
                    {title && (
                      <h3 id={titleId} className="font-ui text-base sm:text-lg font-medium text-[#191B1C] leading-tight tracking-tight truncate">
                        {title}
                      </h3>
                    )}
                  </div>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  {headerAction}
                  <button
                    type="button"
                    id="btn-sheet-close"
                    onClick={() => {
                      if (!closeDisabled) onClose();
                    }}
                    disabled={closeDisabled}
                    className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-[#747779] hover:text-[#191B1C] hover:bg-[#E7E7E3] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={t('close')}
                  >
                    <X className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            <div className="text-[#191B1C] font-ui">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
