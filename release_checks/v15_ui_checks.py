from pathlib import Path

root = Path(__file__).resolve().parents[1]
checks = []

def expect(path, needle, label):
    text = (root / path).read_text(encoding='utf-8')
    ok = needle in text
    checks.append((label, ok))
    if not ok:
        raise AssertionError(f"Missing: {label} ({path}: {needle})")

expect('src/components/smoking/QuickSmokingLogModal.tsx', 'closeDisabled={isSaved}', 'quick-log close locked after save')
expect('src/components/smoking/QuickSmokingLogModal.tsx', 'savedEventRef', 'quick-log retains saved event for routing')
expect('src/components/craving/CravingMode.tsx', 'submissionRef', 'craving duplicate-submit guard')
expect('src/components/craving/CravingMode.tsx', 'savedSmokingEventRef', 'craving retains smoked fallback event')
expect('src/components/today/TodayDashboard.tsx', 'PostSmokingFlowEngine', 'Today uses unified post-smoking router')
expect('src/services/behavior/GoalModeCoordinator.ts', 'PostSmokingFlowEngine', 'pending Recovery uses same router')
expect('src/components/journey/JourneyMissionSheet.tsx', 'submissionRef', 'Journey completion duplicate-submit guard')
expect('src/components/journey/JourneyMissionSheet.tsx', 'readOnly={mission.completed}', 'completed Journey text response is read-only')
expect('src/components/tabs/TabViews.tsx', 'GoalTransitionEngine.transition', 'Journey/profile goal changes use transition engine')
expect('src/components/tabs/TabViews.tsx', "journeyState.journeyCompleted ? (", 'completed Journey has explicit terminal UI')
expect('src/components/onboarding/OnboardingFlow.tsx', 'OnboardingBaselineEngine', 'onboarding normalizes persisted baseline')
expect('src/components/settings/DataPortabilityPanel.tsx', 'restoringRef', 'restore duplicate-write guard')
expect('src/App.tsx', 'appShellRef', 'tab navigation scroll reset')
expect('src/components/common/ModalSheet.tsx', 'closeDisabled', 'shared modal supports critical close lock')

print(f"SMOKE LAB v15 static UI release checks: {len(checks)} OK")
for label, _ in checks:
    print('  OK -', label)
