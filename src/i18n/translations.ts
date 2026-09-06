export type Locale = 'en' | 'de';

export const translations = {
  en: {
    // Brand & App
    brandName: 'SMOKE LAB',
    tagline: 'Behavior, understood.',
    corePromise: 'Understand the trigger. Break the pattern.',
    phaseDiscover: 'Day 01 · Discover',
    privacyNotice: 'On-device storage.',
    offlineNotice: 'Offline — local data remains available.',
    back: 'Back',
    cancel: 'Cancel',
    understood: 'Understood',
    close: 'Close',
    mainNavigation: 'Main navigation',
    dialogLabel: 'Dialog',
    loadingLabel: 'Smoke Lab is loading',
    skipToContent: 'Skip to content',
    emptyPatternsTitle: 'Your first patterns start with real moments.',
    emptyPatternsBody: 'Log a cigarette or an urge when it actually happens. Smoke Lab waits for repeated situations before calling something a pattern.',
    emptyProgressTitle: 'Nothing to compare yet.',
    emptyProgressBody: 'Your progress view stays neutral until you have real observations. No fake trend or projected improvement is generated.',
    emptyStateAction: 'Go to Today',

    // Navigation
    navToday: 'Today',
    navLab: 'Plan',
    navPatterns: 'Triggers',
    navProgress: 'Review',
    navMe: 'More',

    // Onboarding Screen 1
    onboarding1Headline: "Understand your smoking.\nChange one moment at a time.",
    onboarding1Supporting: 'Choose your goal. Smoke Lab then gives you one clear step each day.',
    onboarding1Cta: 'Get started',

    // Onboarding Screen 2 - Baseline
    onboardingStepBaseline: 'Starting point',
    onboardingStepIntent: 'Goal',
    onboardingStepTriggers: 'Situations',
    onboardingStepMindset: 'Ready',
    onboarding2Headline: 'Where are you now?',
    onboarding2CpdLabel: 'Cigarettes per day',
    onboarding2YearsLabel: 'Years smoking',
    onboarding2OptionalSection: 'Context',
    onboarding2PackPriceLabel: 'Price per pack',
    onboarding2PackSizeLabel: 'Cigarettes per pack',
    onboarding2PriceUnit: '$',
    onboarding2CigUnit: 'cigs',
    onboarding2YearsUnit: 'years',
    onboarding2Cta: 'Continue',

    // Onboarding Screen 3 - Goal
    onboarding3Headline: 'Where do you want to go?',
    onboarding3Option1Title: 'Understand my triggers',
    onboarding3Option1Desc: 'See when and why you smoke.',
    onboarding3Option2Title: 'Smoke less',
    onboarding3Option2Desc: 'Add pauses and reduce step by step.',
    onboarding3Option3Title: 'Quit smoking',
    onboarding3Option3Desc: 'Prepare and follow a quit plan.',
    onboarding3Supporting: 'You can adjust this anytime.',

    // Onboarding Screen 4 - Common Situations
    onboarding4Headline: 'Where does autopilot happen?',
    onboarding4Supporting: 'Select your most frequent smoking cues.',
    situationCoffee: 'Coffee',
    situationStress: 'Stress',
    situationAfterMeals: 'After meals',
    situationAlcohol: 'Alcohol',
    situationDriving: 'Driving',
    situationWorkBreaks: 'Work breaks',
    situationBoredom: 'Boredom',
    situationSocial: 'Social',
    situationMorning: 'Morning',
    situationEvening: 'Evening',
    situationOther: 'Other',

    // Onboarding Screen 5 - Observation Mindset
    onboarding5Headline: 'You are ready.',
    onboarding5Copy: 'Start with honest entries. Smoke Lab uses only what you record.',
    onboarding5Supporting: 'Today, one real moment is enough.',
    onboarding5Cta: 'Show today',

    // Today Screen
    dayDiscoverShort: 'Day 01 · Discover',
    greetingMorning: 'Good morning.',
    greetingAfternoon: 'Good afternoon.',
    greetingEvening: 'Good evening.',
    todaySubheading: 'Observe first. Change begins when the automatic loop becomes visible.',

    // Metrics
    metricCigarettesToday: 'Cigarettes today',
    metricControlScore: 'CONTROL',
    metricBaselineLabel: 'Baseline',
    metricBaselineLearning: 'Learning baseline',
    controlScoreUnit: 'pts',
    controlScoreInfoTitle: 'Control Score',
    controlScoreInfoText: 'Control measures how often you introduce awareness before automatic smoking. Smoking an un-delayed cigarette never erases previous learning.',
    controlScoreDisclaimer: 'Behavioral intelligence metric.',
    controlScoreModalText1: 'Conventional apps treat every cigarette as a reset of will. Smoke Lab treats every urge as data.',
    controlScoreModalText2: 'Whenever you pause or observe before acting, you create space between trigger and habit. Smoking an un-delayed cigarette never erases previous behavioral learning.',
    behaviorMetricBadge: 'Behavior metric',

    // Primary Action Area
    actionWantToSmoke: 'I want to smoke',
    actionWantToSmokeSubtitle: 'Notice the urge before you decide.',
    actionSmoked: 'I smoked',
    actionSmokedSubtitle: 'Log without judgement',

    // Action sheets preview
    sheetCravingTitle: 'Craving Interrupter',
    sheetCravingPhaseBadge: 'Protocol',
    sheetCravingBody: 'Initiates a 3-minute physiological pause and contextual cue mapping before the cigarette.',
    sheetCravingPhilosophy: '“A craving is an impulse that peaks and subsides. A conscious pause gives you the opportunity to respond differently to the cue.”',
    sheetCravingClose: 'Close protocol',
    protocolComponents: 'Protocol components:',
    protocolBullet1: 'Active 3-minute somatic de-escalation pause',
    protocolBullet2: '4-7-8 breathing cadence for nervous system calming',
    protocolBullet3: 'One-tap situational cue tagging (Coffee, Stress, etc.)',

    sheetSmokedTitle: 'Log Cigarette',
    sheetSmokedPhaseBadge: 'Observation',
    sheetSmokedBody: 'Zero-friction event capture without judgment or streaks. Maps timestamp and trigger cue.',
    sheetSmokedPhilosophy: '“Every cigarette is data. Observation without judgment is what disarms autopilot.”',
    sheetSmokedClose: 'Understood',
    loggingFlow: 'Logging flow:',
    loggingBullet1: 'Instant 1-tap timestamp capture',
    loggingBullet2: 'Autopilot vs. conscious choice recording',
    loggingBullet3: 'Contextual environment mapping',

    // Today's Experiment
    experimentLabel: 'Active Experiment',
    experimentMeta: 'Experiment 01',
    experimentTitle: 'The Coffee Test',
    experimentDesc: 'Keep the coffee. Delay the cigarette by 10 minutes.',
    experimentSupporting: 'We are testing how strongly coffee and smoking are linked in your routine.',
    experimentCta: 'Explore protocol',
    sheetExperimentTitle: 'The Coffee Test · Experiment 01',
    sheetExperimentHypothesis: 'Hypothesis: Coffee and smoking may be closely linked through routine. A 10-minute gap tests whether the two moments can be separated without forcing a decision.',
    sheetExperimentInstructions: 'Enjoy your coffee as usual. Start a 10-minute timer. If you still choose to smoke afterward, do so consciously. Observe how the sensation changed.',
    instructions: 'Instructions:',
    activeBadge: 'Active',
    lockedBadge: 'Locked',

    // Live Insight Editorial
    insightLabel: 'Signal',
    insightTitle: 'Gathering initial signals',
    insightText: 'Smoke Lab is compiling your baseline. After initial logs, this space will reveal your highest-probability triggers.',

    // Lab Tab
    labTabTitle: 'Your 30-day Lab',
    labTabSubtitle: 'Observe. Test. Change.',
    labTabBadge: 'Protocol',
    labPhase1Title: 'Phase 01 · Baseline Mapping',
    labPhase1Desc: 'Days 01–05. Passive logging of triggers, timing, and automaticity.',
    labPhase2Title: 'Phase 02 · Cue Decoupling',
    labPhase2Desc: 'Days 06–18. Targeted micro-experiments separating cues from reflex.',
    labPhase3Title: 'Phase 03 · Autopilot Dissolution',
    labPhase3Desc: 'Days 19–30. Delay expansion and automatic pattern replacement.',

    // Patterns Tab
    patternsTabTitle: 'Triggers & situations',
    patternsTabSubtitle: 'Automated clustering of your smoking loops.',
    patternsTabBadge: 'Signals',
    patternsMetric1Val: '—',
    patternsMetric1Label: 'Autopilot ratio',
    patternsMetric2Val: '—',
    patternsMetric2Label: 'Peak cue hour',
    hourlyDistribution: 'Hourly distribution',
    cycle24h: '24h cycle',
    trackedCues: 'Tracked cues',

    // Progress Tab
    progressTabTitle: 'Your review',
    progressTabSubtitle: 'Changes in cravings and your Control Score over time.',
    progressTabBadge: 'Personal Analytics',
    progressMetric1Val: '50',
    progressMetric1Label: 'Control Score',
    progressMetric3Val: '10m',
    progressMetric3Label: 'Average pause recorded',
    progressFeature1: 'Control Score trend',

    // Me Tab
    meTabTitle: 'More',
    meTabBadge: 'On-device',
    meBaselineSection: 'Starting baseline',
    meCpdLabel: 'Typical cigarettes / day',
    meYearsLabel: 'Years smoking',
    meGoalLabel: 'Goal:',
    meStorageSection: 'Device storage & privacy',
    meStorageDesc: 'All data is stored exclusively in your browser’s local storage. No external servers receive your smoking records.',
    meResetDataButton: 'Reset Onboarding & Data',
    meResetConfirm: 'Are you sure? This will wipe your local profile and return to the onboarding screen.',
    resetData: 'Reset data',
    meLanguageLabel: 'Language / Sprache',
    installToHomeScreen: 'Add to Home Screen',

    // PWA Install
    installApp: 'Install Smoke Lab',
    installAppDesc: 'Add to home screen for the full standalone mobile experience.',
    installIosStep1: 'Tap the Share button in the Safari toolbar.',
    installIosStep2: 'Scroll down and select "Add to Home Screen".',
    installClose: 'Close',
    pwaStandaloneBadge: 'Standalone PWA',
    pwaUpdateReadyTitle: 'A new Smoke Lab version is ready.',
    pwaUpdateReadyBody: 'Update when you are between entries. Your saved local data stays on this device.',
    pwaUpdateLater: 'Later',
    pwaUpdateNow: 'Update',

    // Behavioral Interventions
    interventionDelayTitle: 'Three minutes distance',
    interventionDelayDesc: 'You can still smoke afterward. For now, you are only delaying the decision.',
    interventionLocationTitle: 'Change location',
    interventionLocationDesc: 'Briefly leave the spot where you usually smoke. Only then decide afresh.',
    interventionCoffeeTitle: 'Separate coffee and cigarette',
    interventionCoffeeDesc: 'Keep the coffee. Only delay the cigarette.',
    interventionMealTitle: 'Interrupt the ritual',
    interventionMealDesc: 'Stand up and immediately switch activities or rooms. Decide only after that.',
    interventionHandsTitle: 'Keep your hands busy',
    interventionHandsDesc: 'Give your hands another task for three minutes. Then decide afresh.',
    interventionChoiceTitle: 'Make the decision conscious',
    interventionChoiceDesc: 'Forbid nothing yet. Simply say to yourself consciously: "I will decide again in three minutes."',
    interventionMorningTitle: 'Morning Delay',
    interventionMorningDesc: 'Delay your first cigarette of the day by a few minutes. Break the immediate waking link.',
    interventionRoutineTitle: 'Interrupt break routine',
    interventionRoutineDesc: 'Step away from your usual break spot. Change the physical setting for a few minutes.',
    adaptiveInterventionNote: 'Based on your previous logs in similar situations.',

    // Craving Mode (Flow A)
    cravingIntensityTitle: 'How strong is the urge right now?',
    cravingIntensityNotice: 'Do not judge. Just notice.',
    cravingTriggerTitle: 'What is happening right now?',
    cravingTriggerSubtitle: 'Select primary trigger cue',
    cravingContextTitle: 'Where are you?',
    cravingContextSubtitle: 'Environment context',
    skipStep: 'Skip',
    safetyDrivingTitle: 'Safety first.',
    safetyDrivingBody: 'Continue using Smoke Lab once you are safely parked.',
    safetyDrivingCta: 'I am safely parked',
    interventionActiveProtocol: 'Active protocol',
    interventionReassessEarly: 'Reassess earlier',
    interventionSmokedAnyway: 'I smoked anyway',
    interventionPauseCompleted: 'Pause completed',
    reassessmentTitle: 'How is the urge now?',
    outcomeGone: 'Gone',
    outcomeWeaker: 'Weaker',
    outcomeUnchanged: 'Unchanged',
    outcomeStronger: 'Stronger',
    cravingResolvedFeedbackGone: 'The urge dissipated. This shows an impulse can change without you having to react to it immediately.',
    cravingResolvedFeedbackWeaker: 'Noticeable easing. The intensity subsided without forced resistance.',
    cravingResolvedFeedbackUnchanged: 'The urge barely changed this time. That is also useful data.',
    cravingResolvedFeedbackStronger: 'The urge is still present. We log this so this strategy is not preferred in similar contexts.',
    cravingResolvedFeedbackSmoked: 'You smoked. The situation remains valuable: trigger, intensity, and intervention were already recorded.',
    finishCravingFlow: 'Back to Today',
    continueBtn: 'Continue',

    // Evidence Strength
    evidenceInsufficient: 'Not enough data yet',
    evidenceEmerging: 'Initial signal',
    evidenceEstablished: 'Clear recurring pattern',
    learningStateNoData: 'Your journey begins today. Once data across multiple days is recorded, your control trend will become visible here.',

    // Quick Smoking Log (Flow B)
    smokedLogTitle: 'Log Cigarette',
    smokedLogIntro: 'Good. Let’s understand what happened right before.',
    smokedLogTriggerLabel: 'What happened right before?',
    smokedLogPlaceLabel: 'Where were you?',
    smokedLogIntensityLabel: 'How strong was the urge?',
    smokedLogDecisionLabel: 'Was the cigarette rather:',
    decisionAutomatic: 'Automatic',
    decisionIntentional: 'Consciously decided',
    smokedLogEnjoymentLabel: 'Did you actually enjoy it?',
    enjoymentYes: 'Yes',
    enjoymentPartially: 'Partially',
    enjoymentNo: 'No',
    saveEntry: 'Save entry',
    smokedLogSavedToast: 'Data point captured.',

    // Patterns & Learning states
    patternsGatheringTitle: 'Patterns are emerging',
    patternsGatheringDesc: 'More observations are needed for a reliable statistical breakdown.',
    observationsCollected: 'observations collected',
    noDataYet: 'Not enough data yet',
    effectiveInterventionLabel: 'Most effective intervention',
  },

  de: {
    // Brand & App
    brandName: 'SMOKE LAB',
    tagline: 'Verhalten, verstanden.',
    corePromise: 'Den Auslöser verstehen. Das Muster durchbrechen.',
    phaseDiscover: 'Tag 01 · Entdecken',
    privacyNotice: 'Lokal auf diesem Gerät.',
    offlineNotice: 'Offline — lokale Daten bleiben verfügbar.',
    back: 'Zurück',
    cancel: 'Abbrechen',
    understood: 'Verstanden',
    close: 'Schließen',
    mainNavigation: 'Hauptnavigation',
    dialogLabel: 'Dialog',
    loadingLabel: 'Smoke Lab wird geladen',
    skipToContent: 'Zum Inhalt springen',
    emptyPatternsTitle: 'Deine ersten Muster entstehen aus echten Momenten.',
    emptyPatternsBody: 'Erfasse eine Zigarette oder einen Drang genau dann, wenn es wirklich passiert. Smoke Lab wartet auf wiederkehrende Situationen, bevor etwas als Muster bezeichnet wird.',
    emptyProgressTitle: 'Noch nichts fair zu vergleichen.',
    emptyProgressBody: 'Dein Fortschritt bleibt neutral, bis echte Beobachtungen vorliegen. Smoke Lab erzeugt keine erfundene Kurve und keine prognostizierte Verbesserung.',
    emptyStateAction: 'Zu Heute',

    // Navigation
    navToday: 'Heute',
    navLab: 'Plan',
    navPatterns: 'Auslöser',
    navProgress: 'Auswertung',
    navMe: 'Mehr',

    // Onboarding Screen 1
    onboarding1Headline: "Verstehe dein Rauchen.\nVerändere einen Moment nach dem anderen.",
    onboarding1Supporting: 'Wähle dein Ziel. Smoke Lab zeigt dir dann jeden Tag genau einen klaren Schritt.',
    onboarding1Cta: 'Loslegen',

    // Onboarding Screen 2 - Baseline
    onboardingStepBaseline: 'Startpunkt',
    onboardingStepIntent: 'Ziel',
    onboardingStepTriggers: 'Situationen',
    onboardingStepMindset: 'Bereit',
    onboarding2Headline: 'Wo stehst du jetzt?',
    onboarding2CpdLabel: 'Zigaretten pro Tag',
    onboarding2YearsLabel: 'Raucherjahre',
    onboarding2OptionalSection: 'Kontext',
    onboarding2PackPriceLabel: 'Preis pro Schachtel',
    onboarding2PackSizeLabel: 'Zigaretten pro Schachtel',
    onboarding2PriceUnit: '€',
    onboarding2CigUnit: 'Stk.',
    onboarding2YearsUnit: 'Jahre',
    onboarding2Cta: 'Weiter',

    // Onboarding Screen 3 - Goal
    onboarding3Headline: 'Wo willst du hin?',
    onboarding3Option1Title: 'Meine Auslöser verstehen',
    onboarding3Option1Desc: 'Erkennen, wann und warum du rauchst.',
    onboarding3Option2Title: 'Weniger rauchen',
    onboarding3Option2Desc: 'Pausen einbauen und Schritt für Schritt reduzieren.',
    onboarding3Option3Title: 'Mit dem Rauchen aufhören',
    onboarding3Option3Desc: 'Vorbereiten und einem Rauchstopp-Plan folgen.',
    onboarding3Supporting: 'Du kannst dies später jederzeit anpassen.',

    // Onboarding Screen 4 - Common Situations
    onboarding4Headline: 'Wann schlägt der Autopilot zu?',
    onboarding4Supporting: 'Wähle deine häufigsten Auslöser.',
    situationCoffee: 'Kaffee',
    situationStress: 'Stress',
    situationAfterMeals: 'Nach dem Essen',
    situationAlcohol: 'Alkohol',
    situationDriving: 'Autofahren',
    situationWorkBreaks: 'Arbeitspausen',
    situationBoredom: 'Langeweile',
    situationSocial: 'Gesellschaft',
    situationMorning: 'Morgens',
    situationEvening: 'Abends',
    situationOther: 'Andere',

    // Onboarding Screen 5 - Observation Mindset
    onboarding5Headline: 'Du bist startklar.',
    onboarding5Copy: 'Beginne mit ehrlichen Einträgen. Smoke Lab nutzt nur, was du selbst erfasst.',
    onboarding5Supporting: 'Heute reicht ein echter Moment.',
    onboarding5Cta: 'Heute anzeigen',

    // Today Screen
    dayDiscoverShort: 'Tag 01 · Entdecken',
    greetingMorning: 'Guten Morgen.',
    greetingAfternoon: 'Guten Tag.',
    greetingEvening: 'Guten Abend.',
    todaySubheading: 'Zuerst beobachten. Veränderung beginnt, wenn die automatische Schleife sichtbar wird.',

    // Metrics
    metricCigarettesToday: 'Zigaretten heute',
    metricControlScore: 'CONTROL',
    metricBaselineLabel: 'Basis',
    metricBaselineLearning: 'Erfasse Basis',
    controlScoreUnit: 'Pkt.',
    controlScoreInfoTitle: 'Control Score',
    controlScoreInfoText: 'Control misst, wie oft du vor dem automatischen Griff zur Zigarette ein Innehalten einfügst. Eine gerauchte Zigarette setzt Gelerntes niemals zurück.',
    controlScoreDisclaimer: 'Verhaltensmetrik.',
    controlScoreModalText1: 'Klassische Apps werten jeden Griff zur Zigarette als Willensschwäche. Smoke Lab begreift jeden Impuls als wertvollen Datenpunkt.',
    controlScoreModalText2: 'Jedes Mal, wenn du vor dem Handeln innehältst, schwächt sich die automatische Verknüpfung ab. Eine unaufgeschobene Zigarette löscht gelerntes Verhalten nicht.',
    behaviorMetricBadge: 'Verhaltensmetrik',

    // Primary Action Area
    actionWantToSmoke: 'Ich will rauchen',
    actionWantToSmokeSubtitle: 'Nimm den Impuls wahr, bevor du entscheidest.',
    actionSmoked: 'Ich habe geraucht',
    actionSmokedSubtitle: 'Wertungsfrei erfassen',

    // Action sheets preview
    sheetCravingTitle: 'Verlangens-Unterbrecher',
    sheetCravingPhaseBadge: 'Protokoll',
    sheetCravingBody: 'Initiiert ein 3-minütiges Innehalten und die Erfassung von Kontextreizen vor der Zigarette.',
    sheetCravingPhilosophy: '„Ein Drang ist ein Impuls, der typischerweise nach wenigen Minuten abflacht. Ein bewusstes Innehalten gibt dir Raum, anders darauf zu reagieren.“',
    sheetCravingClose: 'Protokoll schließen',
    protocolComponents: 'Protokoll-Elemente:',
    protocolBullet1: '3-minütige Deeskalationspause',
    protocolBullet2: '4-7-8 Atemrhythmus zur Nervenberuhigung',
    protocolBullet3: 'Zuordnung des Auslösers per Klick (Kaffee, Stress, etc.)',

    sheetSmokedTitle: 'Zigarette erfassen',
    sheetSmokedPhaseBadge: 'Beobachtung',
    sheetSmokedBody: 'Schnelle Erfassung ohne moralische Bewertung oder Streak-Druck. Erfasst Uhrzeit und Kontext.',
    sheetSmokedPhilosophy: '„Jede Zigarette ist ein Datenpunkt. Wertungsfreie Beobachtung nimmt dem Autopiloten die Macht.“',
    sheetSmokedClose: 'Verstanden',
    loggingFlow: 'Ablauf der Erfassung:',
    loggingBullet1: 'Sofortige Erfassung per Fingertipp',
    loggingBullet2: 'Unterscheidung: Autopilot oder Absicht',
    loggingBullet3: 'Kontextuelle Umgebung erfassen',

    // Today's Experiment
    experimentLabel: 'Aktives Experiment',
    experimentMeta: 'Experiment 01',
    experimentTitle: 'Der Kaffee-Test',
    experimentDesc: 'Behalte den Kaffee. Verschiebe die Zigarette um 10 Minuten.',
    experimentSupporting: 'Wir testen, wie stark Kaffee und Zigarette in deiner Routine miteinander gekoppelt sind.',
    experimentCta: 'Protokoll ansehen',
    sheetExperimentTitle: 'Der Kaffee-Test · Experiment 01',
    sheetExperimentHypothesis: 'Hypothese: Kaffee und Rauchen können durch Routine eng miteinander gekoppelt sein. Eine 10-minütige Pause testet, ob sich beide Momente trennen lassen, ohne etwas zu erzwingen.',
    sheetExperimentInstructions: 'Genieße deinen Kaffee ganz normal. Starte einen 10-Minuten-Timer. Wenn du danach rauchen möchtest, tu es bewusst. Achte darauf, wie sich der Impuls verändert hat.',
    instructions: 'Anleitung:',
    activeBadge: 'Aktiv',
    lockedBadge: 'Phase gesperrt',

    // Live Insight Editorial
    insightLabel: 'Signal',
    insightTitle: 'Erste Signale erfassen',
    insightText: 'Smoke Lab erfasst deine Basisdaten. Nach ersten Einträgen zeigt dieser Bereich deine häufigsten Auslöser.',

    // Lab Tab
    labTabTitle: 'Dein 30-Tage-Labor',
    labTabSubtitle: 'Beobachten. Testen. Verändern.',
    labTabBadge: 'Protokoll',
    labPhase1Title: 'Phase 01 · Basis-Erfassung',
    labPhase1Desc: 'Tage 01–05. Passives Erfassen von Auslösern, Timing und Automatismen.',
    labPhase2Title: 'Phase 02 · Reiz-Entkopplung',
    labPhase2Desc: 'Tage 06–18. Gezielte Mikro-Experimente trennen Reize vom Reflex.',
    labPhase3Title: 'Phase 03 · Autopilot-Auflösung',
    labPhase3Desc: 'Tage 19–30. Pausen erweitern und alte Gewohnheiten auflösen.',

    // Patterns Tab
    patternsTabTitle: 'Auslöser & Situationen',
    patternsTabSubtitle: 'Automatisierte Cluster deiner Gewohnheitsschleifen.',
    patternsTabBadge: 'Signale',
    patternsMetric1Val: '—',
    patternsMetric1Label: 'Autopilot-Anteil',
    patternsMetric2Val: '—',
    patternsMetric2Label: 'Häufigste Reizzeit',
    hourlyDistribution: 'Tageszeit-Verteilung',
    cycle24h: '24-Stunden-Verlauf',
    trackedCues: 'Aktive Auslöser',

    // Progress Tab
    progressTabTitle: 'Deine Auswertung',
    progressTabSubtitle: 'Veränderungen deines Verlangens und deines Control Scores im Zeitverlauf.',
    progressTabBadge: 'Persönliche Analytik',
    progressMetric1Val: '50',
    progressMetric1Label: 'Control Score',
    progressMetric3Val: '10m',
    progressMetric3Label: 'Durchschnittliche Pause',
    progressFeature1: 'Entwicklung deiner Kontrolle',

    // Me Tab
    meTabTitle: 'Mehr',
    meTabBadge: 'Lokal auf Gerät',
    meBaselineSection: 'Ausgangsbasis',
    meCpdLabel: 'Typische Zigaretten pro Tag',
    meYearsLabel: 'Raucherjahre',
    meGoalLabel: 'Ziel:',
    meStorageSection: 'Gerätespeicher & Datenschutz',
    meStorageDesc: 'Alle Daten werden ausschließlich im lokalen Speicher deines Browsers aufbewahrt. Keine externen Server erhalten deine Rauchdaten.',
    meResetDataButton: 'Onboarding & Daten zurücksetzen',
    meResetConfirm: 'Bist du sicher? Dies löscht dein lokales Profil und kehrt zum Onboarding zurück.',
    resetData: 'Zurücksetzen',
    meLanguageLabel: 'Sprache / Language',
    installToHomeScreen: 'Zum Startbildschirm hinzufügen',

    // PWA Install
    installApp: 'Smoke Lab installieren',
    installAppDesc: 'Zum Startbildschirm hinzufügen für die vollwertige App-Erfahrung.',
    installIosStep1: 'Tippe in der Safari-Symbolleiste auf das Teilen-Symbol.',
    installIosStep2: 'Scrolle nach unten und wähle „Zum Home-Bildschirm“.',
    installClose: 'Schließen',
    pwaStandaloneBadge: 'Eigenständige PWA',
    pwaUpdateReadyTitle: 'Eine neue Smoke-Lab-Version ist bereit.',
    pwaUpdateReadyBody: 'Aktualisiere zwischen zwei Eingaben. Deine gespeicherten lokalen Daten bleiben auf diesem Gerät.',
    pwaUpdateLater: 'Später',
    pwaUpdateNow: 'Aktualisieren',

    // Behavioral Interventions
    interventionDelayTitle: 'Drei Minuten Abstand',
    interventionDelayDesc: 'Du kannst danach immer noch rauchen. Für jetzt verschiebst du nur die Entscheidung.',
    interventionLocationTitle: 'Wechsle den Ort',
    interventionLocationDesc: 'Verlasse kurz den Ort, an dem du normalerweise rauchst. Entscheide erst danach neu.',
    interventionCoffeeTitle: 'Trenne Kaffee und Zigarette',
    interventionCoffeeDesc: 'Behalte den Kaffee. Verschiebe nur die Zigarette.',
    interventionMealTitle: 'Unterbrich den Abschluss',
    interventionMealDesc: 'Steh auf und wechsle direkt die Tätigkeit oder den Raum. Entscheide danach neu.',
    interventionHandsTitle: 'Beschäftige deine Hände',
    interventionHandsDesc: 'Gib deinen Händen für drei Minuten eine andere Aufgabe. Danach entscheidest du neu.',
    interventionChoiceTitle: 'Mach die Entscheidung bewusst',
    interventionChoiceDesc: 'Noch nichts verbieten. Sag dir nur bewusst: „Ich entscheide in drei Minuten neu.“',
    interventionMorningTitle: 'Morgendlicher Aufschub',
    interventionMorningDesc: 'Schiebe die erste Zigarette des Tages um einige Minuten auf. Trenne das Aufwachen vom Griff zur Zigarette.',
    interventionRoutineTitle: 'Pausenroutine unterbrechen',
    interventionRoutineDesc: 'Verlasse die gewohnte Raucher-Ecke. Verändere den Ort und die Haltung für wenige Minuten.',
    adaptiveInterventionNote: 'Basierend auf deinen bisherigen Notizen in ähnlichen Situationen.',

    // Craving Mode (Flow A)
    cravingIntensityTitle: 'Wie stark ist der Drang gerade?',
    cravingIntensityNotice: 'Nicht bewerten. Nur wahrnehmen.',
    cravingTriggerTitle: 'Was passiert gerade?',
    cravingTriggerSubtitle: 'Wähle den Auslöser',
    cravingContextTitle: 'Wo bist du gerade?',
    cravingContextSubtitle: 'Umgebung erfassen',
    skipStep: 'Überspringen',
    safetyDrivingTitle: 'Sicherheit zuerst.',
    safetyDrivingBody: 'Nutze Smoke Lab weiter, sobald du sicher stehst.',
    safetyDrivingCta: 'Ich bin sicher geparkt',
    interventionActiveProtocol: 'Aktives Protokoll',
    interventionReassessEarly: 'Früher bewerten',
    interventionSmokedAnyway: 'Ich habe trotzdem geraucht',
    interventionPauseCompleted: 'Pause abgeschlossen',
    reassessmentTitle: 'Wie ist der Drang jetzt?',
    outcomeGone: 'Weg',
    outcomeWeaker: 'Schwächer',
    outcomeUnchanged: 'Unverändert',
    outcomeStronger: 'Stärker',
    cravingResolvedFeedbackGone: 'Der Drang hat sich aufgelöst. Das zeigt, dass sich ein Impuls verändern kann, ohne dass du sofort darauf reagieren musst.',
    cravingResolvedFeedbackWeaker: 'Spürbare Entlastung. Die Intensität hat ohne Zwang nachgelassen.',
    cravingResolvedFeedbackUnchanged: 'Der Drang hat sich diesmal kaum verändert. Auch das ist nützliche Information.',
    cravingResolvedFeedbackStronger: 'Der Drang ist noch präsent. Wir speichern das, damit diese Strategie in ähnlichen Situationen nicht bevorzugt wird.',
    cravingResolvedFeedbackSmoked: 'Du hast geraucht. Die Situation bleibt trotzdem wertvoll: Auslöser, Stärke und Intervention wurden bereits erfasst.',
    finishCravingFlow: 'Zurück zu Heute',
    continueBtn: 'Weiter',

    // Evidence Strength
    evidenceInsufficient: 'Noch nicht genug Daten',
    evidenceEmerging: 'Erstes Signal',
    evidenceEstablished: 'Klares wiederkehrendes Muster',
    learningStateNoData: 'Deine Entwicklung beginnt heute. Sobald Daten über mehrere Tage vorliegen, wird hier sichtbar, wie sich deine Kontrolle entwickelt.',

    // Quick Smoking Log (Flow B)
    smokedLogTitle: 'Zigarette erfassen',
    smokedLogIntro: 'Gut. Lass uns verstehen, was davor passiert ist.',
    smokedLogTriggerLabel: 'Was war direkt davor?',
    smokedLogPlaceLabel: 'Wo warst du?',
    smokedLogIntensityLabel: 'Wie stark war der Drang?',
    smokedLogDecisionLabel: 'War die Zigarette eher:',
    decisionAutomatic: 'Automatisch',
    decisionIntentional: 'Bewusst entschieden',
    smokedLogEnjoymentLabel: 'Hast du sie genossen?',
    enjoymentYes: 'Ja',
    enjoymentPartially: 'Teilweise',
    enjoymentNo: 'Nein',
    saveEntry: 'Speichern',
    smokedLogSavedToast: 'Datenpunkt erfasst.',

    // Patterns & Learning states
    patternsGatheringTitle: 'Muster entstehen gerade',
    patternsGatheringDesc: 'Noch fehlen genügend Situationen für eine verlässliche Auswertung.',
    observationsCollected: 'Beobachtungen gesammelt',
    noDataYet: 'Noch nicht genug Daten',
    effectiveInterventionLabel: 'Wirksamste Intervention',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

/**
 * Maps any stored cue key to its proper localized display representation
 */
export function formatSituation(key: string, locale: Locale): string {
  const map: Record<string, { en: string; de: string }> = {
    Coffee: { en: 'Coffee', de: 'Kaffee' },
    Kaffee: { en: 'Coffee', de: 'Kaffee' },
    Stress: { en: 'Stress', de: 'Stress' },
    'After meals': { en: 'After meals', de: 'Nach dem Essen' },
    'Nach dem Essen': { en: 'After meals', de: 'Nach dem Essen' },
    Alcohol: { en: 'Alcohol', de: 'Alkohol' },
    Alkohol: { en: 'Alcohol', de: 'Alkohol' },
    Driving: { en: 'Driving', de: 'Autofahren' },
    Autofahren: { en: 'Driving', de: 'Autofahren' },
    'Work breaks': { en: 'Work breaks', de: 'Arbeitspausen' },
    Arbeitspausen: { en: 'Work breaks', de: 'Arbeitspausen' },
    Arbeitspause: { en: 'Work break', de: 'Arbeitspause' },
    Boredom: { en: 'Boredom', de: 'Langeweile' },
    Langeweile: { en: 'Boredom', de: 'Langeweile' },
    Social: { en: 'Social', de: 'Gesellschaft' },
    Gesellschaft: { en: 'Social', de: 'Gesellschaft' },
    Gewohnheit: { en: 'Habit', de: 'Gewohnheit' },
    Habit: { en: 'Habit', de: 'Gewohnheit' },
    Morning: { en: 'Morning', de: 'Morgens' },
    Morgens: { en: 'Morning', de: 'Morgens' },
    Morgenroutine: { en: 'Morning routine', de: 'Morgenroutine' },
    Evening: { en: 'Evening', de: 'Abends' },
    Abends: { en: 'Evening', de: 'Abends' },
    Abendroutine: { en: 'Evening routine', de: 'Abendroutine' },
    Other: { en: 'Other', de: 'Andere' },
    Sonstiges: { en: 'Other', de: 'Sonstiges' },
  };

  return map[key] ? map[key][locale] : key;
}

export function formatPlace(place: string, locale: Locale): string {
  const map: Record<string, { en: string; de: string }> = {
    Home: { en: 'Home', de: 'Zuhause' },
    Zuhause: { en: 'Home', de: 'Zuhause' },
    Work: { en: 'Work', de: 'Arbeit' },
    Arbeit: { en: 'Work', de: 'Arbeit' },
    Car: { en: 'Car', de: 'Auto' },
    Auto: { en: 'Car', de: 'Auto' },
    Outside: { en: 'Outside', de: 'Draußen' },
    Draußen: { en: 'Outside', de: 'Draußen' },
    'Restaurant / Bar': { en: 'Restaurant / Bar', de: 'Restaurant / Bar' },
    Social: { en: 'Social gathering', de: 'Soziales Treffen' },
    'Soziales Treffen': { en: 'Social gathering', de: 'Soziales Treffen' },
    'Bei anderen': { en: "At someone else's", de: 'Bei anderen' },
    "At someone else's": { en: "At someone else's", de: 'Bei anderen' },
    Other: { en: 'Other', de: 'Sonstiges' },
    Sonstiges: { en: 'Other', de: 'Sonstiges' },
  };
  return map[place] ? map[place][locale] : place;
}

export function formatOutcome(outcome: string, locale: Locale): string {
  const map: Record<string, { en: string; de: string }> = {
    gone: { en: 'Gone', de: 'Weg' },
    weaker: { en: 'Weaker', de: 'Schwächer' },
    unchanged: { en: 'Unchanged', de: 'Unverändert' },
    stronger: { en: 'Stronger', de: 'Stärker' },
    smoked: { en: 'Smoked', de: 'Geraucht' },
  };
  return map[outcome] ? map[outcome][locale] : outcome;
}

/**
 * Formats precise elapsed seconds into a readable string without rounding up small durations into minutes.
 * E.g. 42s -> "42 Sek." / "42 sec", 198s -> "3 Min. 18 Sek." / "3 min 18 sec"
 */
export function formatElapsedHuman(seconds: number, locale: Locale): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) {
    return locale === 'de' ? `${s} Sek.` : `${s} sec`;
  }
  const mins = Math.floor(s / 60);
  const remainingSecs = s % 60;
  if (remainingSecs === 0) {
    return locale === 'de' ? `${mins} Min.` : `${mins} min`;
  }
  return locale === 'de'
    ? `${mins} Min. ${remainingSecs} Sek.`
    : `${mins} min ${remainingSecs} sec`;
}

