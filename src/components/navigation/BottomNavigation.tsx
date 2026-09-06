import React from 'react';
import { CalendarCheck, Home, Menu } from 'lucide-react';
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
    id: 'today' | 'plan' | 'more';
    target: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
  }> = [
    { id: 'today', target: 'TODAY', label: de ? 'Heute' : 'Today', icon: Home, active: currentTab === 'TODAY' },
    { id: 'plan', target: 'LAB', label: de ? 'Plan' : 'Plan', icon: CalendarCheck, active: currentTab === 'LAB' },
    { id: 'more', target: 'ME', label: de ? 'Mehr' : 'More', icon: Menu, active: ['PATTERNS', 'PROGRESS', 'ME'].includes(currentTab) },
  ];

  return (
    <nav
      id="bottom-navigation"
      aria-label={de ? 'Hauptnavigation' : 'Main navigation'}
      className="fixed sm:absolute bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-md border-t border-[#D9D9D4]/80 bg-[#F4F3EF]/95 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-1 pb-[max(0.8rem,env(safe-area-inset-bottom))] backdrop-blur-md"
    >
      <div className="grid grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`tab-btn-${item.id}`}
              type="button"
              onClick={() => onSelectTab(item.target)}
              aria-current={item.active ? 'page' : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold transition-colors ${item.active ? 'text-[#191B1C]' : 'text-[#747779]'}`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 stroke-[1.7]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
