import React from 'react';
import { Compass, FlaskConical, Network, TrendingUp, User } from 'lucide-react';
import { TabId } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface BottomNavigationProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { t } = useLanguage();

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'TODAY', label: t('navToday'), icon: Compass },
    { id: 'LAB', label: t('navLab'), icon: FlaskConical },
    { id: 'PATTERNS', label: t('navPatterns'), icon: Network },
    { id: 'PROGRESS', label: t('navProgress'), icon: TrendingUp },
    { id: 'ME', label: t('navMe'), icon: User },
  ];

  return (
    <nav
      id="bottom-navigation"
      aria-label={t('mainNavigation')}
      className="fixed sm:absolute bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-md bg-[#F4F3EF]/95 backdrop-blur-md border-t border-[#D9D9D4]/80 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-2 pb-[max(0.8rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id.toLowerCase()}`}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 select-none min-h-[44px] transition-colors ${
                isActive ? 'text-[#191B1C]' : 'text-[#747779] hover:text-[#191B1C]'
              }`}
            >
              <div className="relative flex items-center justify-center h-4 mb-0.5">
                <Icon
                  aria-hidden="true"
                  className={`w-4 h-4 transition-all ${
                    isActive
                      ? 'stroke-[1.6] text-[#191B1C]'
                      : 'stroke-[1.25] text-[#747779]'
                  }`}
                />
              </div>
              <span
                className={`font-ui text-[8.5px] tracking-[0.08em] uppercase transition-all leading-tight ${
                  isActive
                    ? 'font-medium text-[#191B1C]'
                    : 'font-normal text-[#747779]'
                }`}
              >
                {tab.label}
              </span>
              {/* Quiet signature accent dot in deep forest green */}
              <span
                className={`block h-1 w-1 rounded-full mt-0.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-[#17372E] scale-100 opacity-100'
                    : 'scale-0 opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
