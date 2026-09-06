import type { UserProfile } from '../../types';

export interface RawOnboardingBaseline {
  typicalCigarettesPerDay: number;
  yearsSmoking: number;
  pricePerPack?: string | number;
  cigarettesPerPack?: string | number;
}

const finiteNumber = (value: string | number | undefined): number | null => {
  if (value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Normalizes onboarding inputs before they become long-lived baseline data.
 * This prevents malformed numeric input (for example pack size 0) from
 * propagating into later cost/baseline calculations.
 */
export class OnboardingBaselineEngine {
  static normalize(input: RawOnboardingBaseline): UserProfile['baseline'] {
    const rawCpd = finiteNumber(input.typicalCigarettesPerDay) ?? 1;
    const rawYears = finiteNumber(input.yearsSmoking) ?? 0;
    const rawPrice = finiteNumber(input.pricePerPack);
    const rawPackSize = finiteNumber(input.cigarettesPerPack);

    const typicalCigarettesPerDay = Math.min(80, Math.max(1, Math.round(rawCpd)));
    const yearsSmoking = Math.min(60, Math.max(0, Math.round(rawYears)));
    const cigarettesPerPack = rawPackSize === null
      ? 20
      : Math.min(100, Math.max(1, Math.round(rawPackSize)));
    const pricePerPack = rawPrice !== null && rawPrice > 0
      ? Math.min(1000, Math.round(rawPrice * 100) / 100)
      : undefined;

    return {
      typicalCigarettesPerDay,
      yearsSmoking,
      pricePerPack,
      cigarettesPerPack,
    };
  }
}
