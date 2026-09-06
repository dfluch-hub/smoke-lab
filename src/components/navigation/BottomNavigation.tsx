import React from 'react';
import { ChartNoAxesColumnIncreasing, Cigarette, Home, Lightbulb } from 'lucide-react';
import { TabId } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface BottomNavigationProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentTab, onSelectTab }) => {
  const { locale } = useLanguage();
  const de = locale === 'de';
  const items: Array<{
    id: 'today' | 'smoking' | 'pattern' | 'progress';
    target: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
  }> = [
    { id: 'today', target: 'TODAY', label: de ? 'Heute' : 'Today', icon: Home, active: ['TODAY', 'LAB'].includes(currentTab) },
    { id: 'smoking', target: 'SMOKING', label: de ? 'Rauchen' : 'Smoking', icon: Cigarette, active: currentTab === 'SMOKING' },
    { id: 'pattern', target: 'PATTERNS', label: de ? 'Mein Muster' : 'My pattern', icon: Lightbulb, active: currentTab === 'PATTERNS' },
    { id: 'progress', target: 'PROGRESS', label: de ? 'Fortschritt' : 'Progress', icon: ChartNoAxesColumnIncreasing, active: ['PROGRESS', 'ME'].includes(currentTab) },
  ];

  return (
    <nav
      id="bottom-navigation"
      aria-label={de ? 'Hauptnavigation' : 'Main navigation'}
      className="fixed sm:absolute bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-md overflow-hidden border-t border-[#E5DACB] bg-[#FFFDF8]/96 pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] pt-1.5 pb-[max(0.8rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <div className="grid min-w-0 grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`tab-btn-${item.id}`}
              type="button"
              onClick={() => onSelectTab(item.target)}
              aria-current={item.active ? 'page' : undefined}
              className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[9.5px] font-semibold transition-colors ${item.active ? 'text-[#24584A]' : 'text-[#77716A]'}`}
            >
              <span className={`flex h-7 w-10 items-center justify-center rounded-full ${item.active ? 'bg-[#E1EFE7]' : ''}`}>
                <Icon aria-hidden="true" className="h-[18px] w-[18px] stroke-[1.9]" />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
