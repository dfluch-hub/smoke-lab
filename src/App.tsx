import React, { useState, useEffect, useRef } from 'react';
import { TabId, UserProfile, JourneyProgress, SmokingEvent } from './types';
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
import { CravingMode } from './components/craving/CravingMode';
import { QuickSmokingLogModal } from './components/smoking/QuickSmokingLogModal';
import { LapseRecoveryModal } from './components/quit/LapseRecoveryModal';
import { QuitSupportRepository, LapseRecoveryRepository } from './storage/repositories';
import { PostSmokingFlowEngine } from './services/behavior/PostSmokingFlowEngine';
import { SmokingDashboard } from './components/smoking/SmokingDashboard';
import { PatternDashboard } from './components/patterns/PatternDashboard';
import { ProgressDashboard } from './components/progress/ProgressDashboard';

function AppContent() {
  const { t, locale } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('TODAY');
  const [progress, setProgress] = useState<JourneyProgress>(getJourneyProgress());
  const [todaySmokingCount, setTodaySmokingCount] = useState<number>(0);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [storageIssue, setStorageIssue] = useState(false);
  const [futureSchemaDetected, setFutureSchemaDetected] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [showCravingMode, setShowCravingMode] = useState(false);
  const [showQuickSmokingLog, setShowQuickSmokingLog] = useState(false);
  const [recoverySmokingEvent, setRecoverySmokingEvent] = useState<SmokingEvent | null>(null);
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

  const refreshDashboardData = () => {
    setProgress(getJourneyProgress());
    setTodaySmokingCount(getTodaySmokingEvents().length);
    setDataVersion((version) => version + 1);
  };

  const routeSavedSmokingEvent = (savedEvent?: SmokingEvent) => {
    if (!savedEvent || !profile) return;
    const decision = PostSmokingFlowEngine.afterSavedSmokingEvent(
      profile,
      savedEvent,
      QuitSupportRepository.get(),
      LapseRecoveryRepository.getAll(),
    );
    if (decision.action === 'open_recovery') setRecoverySmokingEvent(savedEvent);
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
      <main className="min-h-[100dvh] w-full bg-[#E9E0D4] flex items-center justify-center sm:py-6">
        <div className="w-full max-w-md min-h-[100dvh] sm:min-h-[820px] sm:max-h-[920px] bg-[#F7F1E8] sm:rounded-[28px] sm:shadow-[0_16px_48px_rgba(74,57,43,0.10)] sm:border sm:border-[#E5DACB] overflow-hidden flex flex-col relative pt-[env(safe-area-inset-top)] sm:pt-0">
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
    <div className="min-h-[100dvh] w-full bg-[#E9E0D4] flex items-center justify-center sm:py-6">
      <a href="#main-content" className="skip-link">{t('skipToContent')}</a>
      {/* Mobile container - iPhone sized frame on large screens, native full viewport on mobile */}
      <div ref={appShellRef} className="w-full max-w-md min-h-[100dvh] sm:min-h-[820px] sm:max-h-[920px] bg-[#F7F1E8] sm:rounded-[28px] sm:shadow-[0_16px_48px_rgba(74,57,43,0.10)] sm:border sm:border-[#E5DACB] overflow-x-hidden overflow-y-auto flex flex-col relative pt-[env(safe-area-inset-top)] sm:pt-0">
        <OfflineIndicator />
        <PWAUpdatePrompt />
        {storageIssue && <StorageIssueBanner />}

        {/* Tab Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden focus:outline-none pb-[calc(env(safe-area-inset-bottom)+8.5rem)]">
          {activeTab === 'TODAY' && (
            <TodayDashboard
              userProfile={profile}
              progress={progress}
              todaySmokingCount={todaySmokingCount}
              dataVersion={dataVersion}
              onDataChanged={refreshDashboardData}
              onOpenLab={() => setActiveTab('LAB')}
              onOpenCraving={() => setShowCravingMode(true)}
            />
          )}

          {activeTab === 'SMOKING' && (
            <SmokingDashboard dataVersion={dataVersion} onLogSmoking={() => setShowQuickSmokingLog(true)} />
          )}

          {activeTab === 'PATTERNS' && (
            <PatternDashboard
              userProfile={profile}
              dataVersion={dataVersion}
              onOpenCraving={() => setShowCravingMode(true)}
              onOpenSmoking={() => setActiveTab('SMOKING')}
            />
          )}

          {activeTab === 'PROGRESS' && (
            <ProgressDashboard userProfile={profile} dataVersion={dataVersion} onOpenSettings={() => setActiveTab('ME')} />
          )}

          {['LAB', 'ME'].includes(activeTab) && (
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
        <div
          className="fixed sm:absolute left-0 right-0 z-30 mx-auto flex w-full max-w-md items-center border-t border-[#E5DACB] bg-[#FFFDF8]/97 px-[max(1rem,env(safe-area-inset-left))] py-2 backdrop-blur-xl"
          style={{ bottom: 'calc(max(0.8rem, env(safe-area-inset-bottom)) + 4rem)' }}
          aria-label={locale === 'de' ? 'Schnellaktionen' : 'Quick actions'}
        >
          <button
            type="button"
            id="global-want-to-smoke"
            onClick={() => setShowCravingMode(true)}
            className="btn-tactile flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#E8C9B8] bg-[#FFF0E8] px-4 text-sm font-bold text-[#9A452F]"
          >
            {locale === 'de' ? 'Ich will gerade rauchen' : 'I want to smoke right now'}
          </button>
        </div>

        <BottomNavigation currentTab={activeTab} onSelectTab={setActiveTab} />

        <CravingMode
          isOpen={showCravingMode}
          onClose={(_score, savedSmokingEvent) => {
            setShowCravingMode(false);
            refreshDashboardData();
            routeSavedSmokingEvent(savedSmokingEvent);
          }}
        />
        <QuickSmokingLogModal
          isOpen={showQuickSmokingLog}
          onClose={(savedEvent) => {
            setShowQuickSmokingLog(false);
            refreshDashboardData();
            routeSavedSmokingEvent(savedEvent);
          }}
        />
        <LapseRecoveryModal
          isOpen={Boolean(recoverySmokingEvent)}
          smokingEvent={recoverySmokingEvent}
          onClose={() => {
            setRecoverySmokingEvent(null);
            refreshDashboardData();
          }}
        />
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
