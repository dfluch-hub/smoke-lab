import React from 'react';
import { CircleDashed, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
}) => (
  <section
    className={`rounded-2xl border border-[#D9D9D4] bg-[#F8F7F3] ${compact ? 'p-4' : 'p-5'} space-y-3`}
    aria-live="polite"
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7E7E3] text-[#17372E]" aria-hidden="true">
        <CircleDashed className="h-4 w-4 stroke-[1.8]" />
      </div>
      <div className="min-w-0 space-y-1">
        <h2 className="font-ui text-[14px] font-semibold text-[#191B1C] leading-snug">{title}</h2>
        <p className="font-ui text-[11.5px] text-[#747779] leading-relaxed">{body}</p>
      </div>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="btn-tactile inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#191B1C] px-4 py-2.5 font-ui text-[11.5px] font-semibold text-[#F2F1ED]"
      >
        <span>{actionLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    )}
  </section>
);
