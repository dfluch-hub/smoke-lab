import React, { useState, useEffect, useRef } from 'react';
import { TabId, UserProfile, JourneyProgress } from './types';
import {
  getUserProfile,
  getJourneyProgress,
  getTodaySmokingEvents,
  resetAllUserData,
} from './storage/localStorage';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { TodayDashboard } from './components/today/TodayDashboard';
import { TabViews } from './components/tabs/TabViews';
import { BottomNavigation } from './components/navigation/BottomNavigation';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { StorageIntegrityService } from './services/StorageIntegrityService';
import { CURRENT_STORAGE_SCHEMA_VERSION, StorageMigrationService } from './services/StorageMigrationService';
import { StorageHealthService } from './services/StorageHealthService';
import { StorageIssueBanner } from './components/common/StorageIssueBanner';
import { StorageUnavailableScreen } from './components/common/StorageUnavailableScreen';
import { FutureSchemaScreen } from './components/common/FutureSchemaScreen';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { PWAUpdatePrompt } from './components/common/PWAUpdatePrompt';

function AppContent() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('TODAY');
  const [progress, setProgress] = useState<JourneyProgress>(getJourneyProgress());
  const [todaySmokingCount, setTodaySmokingCount] = useState<number>(0);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [storageIssue, setStorageIssue] = useState(false);
  const [futureSchemaDetected, setFutureSchemaDetected] = useState(false);
  const appShellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    appShellRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeTab]);

  useEffect(() => {
    const onStorageError = (event: Event) => {
      setStorageIssue(true);
      const operation = (event as CustomEvent<{ operation?: string }>).detail?.operation;
      if (operation === 'read' || operation === 'write') setStorageUnavailable(true);
    };
    window.addEventListener('smokelab:storage-error', onStorageError);

    const health = StorageHealthService.check();
    if (!health.ok) {
      setStorageUnavailable(true);
      setStorageIssue(true);
      setIsLoading(false);
      return () => window.removeEventListener('smokelab:storage-error', onStorageError);
    }

    try {
      const migration = StorageMigrationService.run();
      if (migration.toVersion > CURRENT_STORAGE_SCHEMA_VERSION) {
        setFutureSchemaDetected(true);
        setIsLoading(false);
        return () => window.removeEventListener('smokelab:storage-error', onStorageError);
      }

      const loadedProfile = getUserProfile();
      if (loadedProfile) StorageIntegrityService.run();
      const repairedProfile = getUserProfile();
      setProfile(repairedProfile);
      setProgress(getJourneyProgress());
      setTodaySmokingCount(getTodaySmokingEvents().length);
    } catch (error) {
      console.error('Smoke Lab startup recovery:', error);
      setStorageIssue(true);
      setProfile(getUserProfile());
    } finally {
      setIsLoading(false);
    }

    return () => window.removeEventListener('smokelab:storage-error', onStorageError);
  }, []);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setActiveTab('TODAY');
    setProgress(getJourneyProgress());
  };

  const handleResetData = () => {
    resetAllUserData();
    setProfile(null);
    setActiveTab('TODAY');
  };

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-label={t('loadingLabel')} className="flex min-h-screen w-full items-center justify-center bg-[#F4F3EF] text-[#191B1C]">
        <div aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-[#191B1C] border-t-transparent" />
      </div>
    );
  }


  if (storageUnavailable) {
    return <StorageUnavailableScreen onRetry={() => window.location.reload()} />;
  }

  if (futureSchemaDetected) {
    return <FutureSchemaScreen />;
  }

  // If user hasn't completed onboarding, show Onboarding Flow
  if (!profile || !profile.onboardingCompleted) {
    return (
      <main className="min-h-[100dvh] w-full bg-[#E7E7E3] flex items-center justify-center sm:py-6">
        <div className="w-full max-w-md min-h-[100dvh] sm:min-h-[820px] sm:max-h-[920px] bg-[#F4F3EF] sm:rounded-[28px] sm:shadow-[0_16px_48px_rgba(25,27,28,0.08)] sm:border sm:border-[#D9D9D4] overflow-hidden flex flex-col relative pt-[env(safe-area-inset-top)] sm:pt-0">
          <OfflineIndicator />
          <PWAUpdatePrompt />
          {storageIssue && <StorageIssueBanner />}
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        </div>
      </main>
    );
  }

  // Main Mobile App Shell
  return (
    <div className="min-h-[100dvh] w-full bg-[#E7E7E3] flex items-center justify-center sm:py-6">
      <a href="#main-content" className="skip-link">{t('skipToContent')}</a>
      {/* Mobile container - iPhone sized frame on large screens, native full viewport on mobile */}
      <div ref={appShellRef} className="w-full max-w-md min-h-[100dvh] sm:min-h-[820px] sm:max-h-[920px] bg-[#F4F3EF] sm:rounded-[28px] sm:shadow-[0_16px_48px_rgba(25,27,28,0.08)] sm:border sm:border-[#D9D9D4] overflow-y-auto flex flex-col relative pt-[env(safe-area-inset-top)] sm:pt-0">
        <OfflineIndicator />
        <PWAUpdatePrompt />
        {storageIssue && <StorageIssueBanner />}

        {/* Tab Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden focus:outline-none">
          {activeTab === 'TODAY' && (
            <TodayDashboard
              userProfile={profile}
              progress={progress}
              todaySmokingCount={todaySmokingCount}
              onDataChanged={() => {
                setProgress(getJourneyProgress());
                setTodaySmokingCount(getTodaySmokingEvents().length);
              }}
              onOpenLab={() => setActiveTab('LAB')}
            />
          )}

          {activeTab !== 'TODAY' && (
            <TabViews
              currentTab={activeTab}
              userProfile={profile}
              onResetData={handleResetData}
              onProfileChanged={(updatedProfile) => setProfile(updatedProfile)}
              onNavigate={setActiveTab}
            />
          )}
        </main>

        {/* Fixed Bottom Navigation */}
        <BottomNavigation currentTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AppErrorBoundary>
  );
}
