import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Plus, Minus, ArrowRight, Check } from 'lucide-react';
import { UserProfile, GoalChoice } from '../../types';
import { saveUserProfile } from '../../storage/localStorage';
import { useLanguage } from '../../i18n/LanguageContext';
import { LoopMotif } from '../common/LoopMotif';
import { OnboardingBaselineEngine } from '../../services/behavior/OnboardingBaselineEngine';

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { t, locale, setLocale } = useLanguage();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [cpd, setCpd] = useState<number>(14);
  const [years, setYears] = useState<number>(6);
  const [packPrice, setPackPrice] = useState<string>('11');
  const [packSize, setPackSize] = useState<string>('20');
  const [goal, setGoal] = useState<GoalChoice>('pattern');
  const [isFinishing, setIsFinishing] = useState(false);
  const finishRef = useRef(false);
  const [selectedSituations, setSelectedSituations] = useState<string[]>([
    'Coffee',
    'Stress',
    'After meals',
  ]);

  const situationOptions = [
    { key: 'Coffee', label: t('situationCoffee') },
    { key: 'Stress', label: t('situationStress') },
    { key: 'After meals', label: t('situationAfterMeals') },
    { key: 'Alcohol', label: t('situationAlcohol') },
    { key: 'Driving', label: t('situationDriving') },
    { key: 'Work breaks', label: t('situationWorkBreaks') },
    { key: 'Boredom', label: t('situationBoredom') },
    { key: 'Social', label: t('situationSocial') },
    { key: 'Morning', label: t('situationMorning') },
    { key: 'Evening', label: t('situationEvening') },
    { key: 'Other', label: t('situationOther') },
  ];

  const toggleSituation = (key: string) => {
    setSelectedSituations((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleFinish = () => {
    if (finishRef.current) return;
    finishRef.current = true;
    setIsFinishing(true);
    const baseline = OnboardingBaselineEngine.normalize({
      typicalCigarettesPerDay: cpd,
      yearsSmoking: years,
      pricePerPack: packPrice,
      cigarettesPerPack: packSize,
    });
    const newProfile: UserProfile = {
      id: 'usr_' + Date.now().toString(36),
      version: 2,
      baseline,
      goal,
      automaticSituations: selectedSituations,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferredLanguage: locale,
    };

    saveUserProfile(newProfile);
    onComplete(newProfile);
  };

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#F4F3EF] text-[#191B1C] px-6 py-6 select-none relative overflow-hidden">
      {/* Top micro-bar: Brand or Back + Step notation */}
      <div className="flex items-center justify-between pt-1 select-none border-b border-[#D9D9D4] pb-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 font-ui text-xs font-medium text-[#747779] hover:text-[#191B1C] transition"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2]" />
            <span>{t('back')}</span>
          </button>
        ) : (
          <span className="text-[11px] font-semibold tracking-[0.24em] uppercase text-[#191B1C]">
            {t('brandName')}
          </span>
        )}

        <div className="flex items-center gap-3">
          {step > 1 && (
            <span className="text-[10px] font-mono tracking-widest text-[#747779] uppercase">
              0{step - 1} / 04
            </span>
          )}
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'de' : 'en')}
            className="min-h-[44px] px-1 text-[11px] font-mono tracking-wider text-[#747779] hover:text-[#191B1C] transition uppercase"
            aria-label={locale === 'de' ? 'Sprache auf Englisch wechseln' : 'Switch language to German'}
          >
            [{locale.toUpperCase()}]
          </button>
        </div>
      </div>

      {/* Main Step Content */}
      <div className="flex-1 flex flex-col justify-center py-6 my-auto">
        <AnimatePresence mode="wait">
          {/* SCREEN 1: WELCOME */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-center py-2 opacity-90">
                <LoopMotif size={140} variant="welcome" />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-mono tracking-[0.18em] uppercase text-[#747779]">
                  {t('tagline')}
                </p>
                <h1 className="font-display text-3xl sm:text-[38px] font-normal tracking-[-0.03em] text-[#191B1C] leading-tight whitespace-pre-line">
                  {t('onboarding1Headline')}
                </h1>
              </div>

              <p className="font-ui text-xs sm:text-[13px] leading-relaxed text-[#747779] font-normal">
                {t('onboarding1Supporting')}
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  id="btn-start-lab"
                  onClick={() => setStep(2)}
                  className="btn-tactile group w-full flex items-center justify-between rounded-2xl bg-[#191B1C] px-6 py-4 text-sm font-medium tracking-wide text-[#F2F1ED] shadow-[0_6px_24px_rgba(25,27,28,0.12)] hover:bg-[#232627] transition"
                >
                  <span className="font-ui uppercase tracking-[0.08em]">{t('onboarding1Cta')}</span>
                  <ArrowRight className="w-4 h-4 text-[#B9BCBE] group-hover:translate-x-1 transition-transform stroke-[1.8]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: BASELINE */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <span className="font-ui text-xs font-medium text-[#747779]">
                  {t('onboardingStepBaseline')}
                </span>
                <h2 className="font-display text-3xl sm:text-[34px] font-normal tracking-tight text-[#191B1C]">
                  {t('onboarding2Headline')}
                </h2>
              </div>

              {/* Question 1: Cigarettes per day */}
              <div className="py-2 text-center space-y-2">
                <div className="font-ui text-xs font-medium text-[#747779]">
                  {t('onboarding2CpdLabel')}
                </div>

                <div className="flex items-center justify-center gap-8 pt-1">
                  <button
                    type="button"
                    onClick={() => setCpd((v) => Math.max(1, v - 1))}
                    className="btn-tactile flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D9D4] bg-transparent text-[#191B1C] hover:bg-[#E7E7E3] transition"
                    aria-label={locale === 'de' ? 'Zigaretten pro Tag verringern' : 'Decrease cigarettes per day'}
                  >
                    <Minus className="w-4 h-4 stroke-[2]" />
                  </button>

                  <div className="text-6xl font-light tracking-tight text-[#191B1C] tabular-nums min-w-[90px]">
                    {cpd}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCpd((v) => Math.min(80, v + 1))}
                    className="btn-tactile flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D9D4] bg-transparent text-[#191B1C] hover:bg-[#E7E7E3] transition"
                    aria-label={locale === 'de' ? 'Zigaretten pro Tag erhöhen' : 'Increase cigarettes per day'}
                  >
                    <Plus className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>

                <p className="text-[11px] font-mono text-[#747779]">
                  {t('onboarding2CigUnit')} {locale === 'de' ? '/ Tag' : '/ day'}
                </p>
              </div>

              {/* Question 2: Years smoking */}
              <div className="py-2 text-center space-y-2">
                <div className="font-ui text-xs font-medium text-[#747779]">
                  {t('onboarding2YearsLabel')}
                </div>

                <div className="flex items-center justify-center gap-8 pt-1">
                  <button
                    type="button"
                    onClick={() => setYears((v) => Math.max(0, v - 1))}
                    className="btn-tactile flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D9D4] bg-transparent text-[#191B1C] hover:bg-[#E7E7E3] transition"
                    aria-label={locale === 'de' ? 'Raucherjahre verringern' : 'Decrease years smoking'}
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2]" />
                  </button>

                  <div className="text-5xl font-light tracking-tight text-[#191B1C] tabular-nums min-w-[80px]">
                    {years}
                  </div>

                  <button
                    type="button"
                    onClick={() => setYears((v) => Math.min(60, v + 1))}
                    className="btn-tactile flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D9D4] bg-transparent text-[#191B1C] hover:bg-[#E7E7E3] transition"
                    aria-label={locale === 'de' ? 'Raucherjahre erhöhen' : 'Increase years smoking'}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>

                <p className="text-[11px] font-mono text-[#747779]">
                  {t('onboarding2YearsUnit')}
                </p>
              </div>

              {/* Optional pack details */}
              <div className="pt-2 border-t border-[#D9D9D4] space-y-2">
                <span className="font-ui text-xs font-medium text-[#747779] block">
                  {t('onboarding2OptionalSection')}
                </span>
                <div className="flex items-center justify-between text-xs text-[#747779] gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <span>{t('onboarding2PackPriceLabel')}:</span>
                    <input
                      type="number"
                      value={packPrice}
                      onChange={(e) => setPackPrice(e.target.value)}
                      min="0.01"
                      max="1000"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="11"
                      aria-label={t('onboarding2PackPriceLabel')}
                      className="w-14 rounded-md border border-[#D9D9D4] bg-transparent px-2 py-1 text-xs text-[#191B1C] font-mono focus:outline-none focus:border-[#191B1C]"
                    />
                    <span>{t('onboarding2PriceUnit')}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span>{t('onboarding2PackSizeLabel')}:</span>
                    <input
                      type="number"
                      value={packSize}
                      onChange={(e) => setPackSize(e.target.value)}
                      min="1"
                      max="100"
                      step="1"
                      inputMode="numeric"
                      placeholder="20"
                      aria-label={t('onboarding2PackSizeLabel')}
                      className="w-14 rounded-md border border-[#D9D9D4] bg-transparent px-2 py-1 text-xs text-[#191B1C] font-mono focus:outline-none focus:border-[#191B1C]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="btn-baseline-continue"
                  onClick={() => setStep(3)}
                  className="btn-tactile w-full rounded-2xl bg-[#191B1C] py-3.5 text-xs font-semibold tracking-wider text-[#F2F1ED] uppercase hover:bg-[#232627] transition shadow-sm"
                >
                  {t('onboarding2Cta')} →
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: INTENT */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <span className="font-ui text-xs font-medium text-[#747779]">
                  {t('onboardingStepIntent')}
                </span>
                <h2 className="font-display text-3xl sm:text-[34px] font-normal tracking-tight text-[#191B1C]">
                  {t('onboarding3Headline')}
                </h2>
              </div>

              <div className="space-y-2.5">
                {/* Option 1: Understand my pattern */}
                <button
                  type="button"
                  onClick={() => setGoal('pattern')}
                  aria-pressed={goal === 'pattern'}
                  className={`btn-tactile w-full text-left rounded-xl p-4 transition ${
                    goal === 'pattern'
                      ? 'bg-[#E7E7E3] border border-[#191B1C] shadow-sm'
                      : 'border border-[#D9D9D4] bg-transparent hover:bg-[#E7E7E3]/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-ui text-sm font-semibold text-[#191B1C]">
                        {t('onboarding3Option1Title')}
                      </h4>
                      <p className="font-ui text-xs text-[#747779] leading-relaxed">
                        {t('onboarding3Option1Desc')}
                      </p>
                    </div>
                    {goal === 'pattern' && (
                      <Check className="w-4 h-4 text-[#17372E] shrink-0 mt-0.5 ml-2" />
                    )}
                  </div>
                </button>

                {/* Option 2: Smoke less */}
                <button
                  type="button"
                  onClick={() => setGoal('reduce')}
                  aria-pressed={goal === 'reduce'}
                  className={`btn-tactile w-full text-left rounded-xl p-4 transition ${
                    goal === 'reduce'
                      ? 'bg-[#E7E7E3] border border-[#191B1C] shadow-sm'
                      : 'border border-[#D9D9D4] bg-transparent hover:bg-[#E7E7E3]/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-ui text-sm font-semibold text-[#191B1C]">
                        {t('onboarding3Option2Title')}
                      </h4>
                      <p className="font-ui text-xs text-[#747779] leading-relaxed">
                        {t('onboarding3Option2Desc')}
                      </p>
                    </div>
                    {goal === 'reduce' && (
                      <Check className="w-4 h-4 text-[#17372E] shrink-0 mt-0.5 ml-2" />
                    )}
                  </div>
                </button>

                {/* Option 3: Quit smoking */}
                <button
                  type="button"
                  onClick={() => setGoal('quit')}
                  aria-pressed={goal === 'quit'}
                  className={`btn-tactile w-full text-left rounded-xl p-4 transition ${
                    goal === 'quit'
                      ? 'bg-[#E7E7E3] border border-[#191B1C] shadow-sm'
                      : 'border border-[#D9D9D4] bg-transparent hover:bg-[#E7E7E3]/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-ui text-sm font-semibold text-[#191B1C]">
                        {t('onboarding3Option3Title')}
                      </h4>
                      <p className="font-ui text-xs text-[#747779] leading-relaxed">
                        {t('onboarding3Option3Desc')}
                      </p>
                    </div>
                    {goal === 'quit' && (
                      <Check className="w-4 h-4 text-[#17372E] shrink-0 mt-0.5 ml-2" />
                    )}
                  </div>
                </button>
              </div>

              <p className="text-center text-[11px] text-[#747779] italic">
                {t('onboarding3Supporting')}
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  id="btn-goal-continue"
                  onClick={() => setStep(4)}
                  className="btn-tactile w-full rounded-2xl bg-[#191B1C] py-3.5 text-xs font-semibold tracking-wider text-[#F2F1ED] uppercase hover:bg-[#232627] transition shadow-sm"
                >
                  {t('onboarding2Cta')} →
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 4: SITUATIONS */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <span className="font-ui text-xs font-medium text-[#747779]">
                  {t('onboardingStepTriggers')}
                </span>
                <h2 className="font-display text-3xl sm:text-[34px] font-normal tracking-tight text-[#191B1C]">
                  {t('onboarding4Headline')}
                </h2>
                <p className="font-ui text-xs text-[#747779]">
                  {t('onboarding4Supporting')}
                </p>
              </div>

              {/* Minimalist Situation Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {situationOptions.map((opt) => {
                  const isSelected = selectedSituations.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleSituation(opt.key)}
                      aria-pressed={isSelected}
                      className={`btn-tactile min-h-[44px] whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-[#191B1C] text-[#F2F1ED]'
                          : 'bg-[#E7E7E3] text-[#191B1C] hover:bg-[#D9D9D4]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  id="btn-situations-continue"
                  onClick={() => setStep(5)}
                  className="btn-tactile w-full rounded-2xl bg-[#191B1C] py-3.5 text-xs font-semibold tracking-wider text-[#F2F1ED] uppercase hover:bg-[#232627] transition shadow-sm"
                >
                  {t('onboarding2Cta')} →
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 5: OBSERVATION MINDSET */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 text-left"
            >
              <div className="space-y-1">
                <span className="font-ui text-xs font-medium text-[#747779]">
                  {t('onboardingStepMindset')}
                </span>
                <h2 className="font-display text-3xl sm:text-[36px] font-normal tracking-tight text-[#191B1C] leading-tight">
                  {t('onboarding5Headline')}
                </h2>
              </div>

              <div className="space-y-3 font-ui text-xs sm:text-[13px] text-[#747779] leading-relaxed pt-2">
                <p className="whitespace-pre-line">{t('onboarding5Copy')}</p>
                <p className="text-[#191B1C] font-medium text-sm pt-2 border-t border-[#D9D9D4]">
                  {t('onboarding5Supporting')}
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  id="btn-finish-onboarding"
                  onClick={handleFinish}
                  disabled={isFinishing}
                  className="btn-tactile group w-full flex items-center justify-between rounded-2xl bg-[#191B1C] px-6 py-4 text-sm font-medium tracking-wide text-[#F2F1ED] shadow-[0_6px_24px_rgba(25,27,28,0.12)] hover:bg-[#232627] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="font-ui uppercase tracking-[0.08em]">{t('onboarding5Cta')}</span>
                  <ArrowRight className="w-4 h-4 text-[#B9BCBE] group-hover:translate-x-1 transition-transform stroke-[1.8]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
