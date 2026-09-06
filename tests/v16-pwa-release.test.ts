import { PWAReleasePolicy, PWA_UPDATE_CHECK_INTERVAL_MS } from '../src/services/PWAReleasePolicy';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(
  PWAReleasePolicy.shouldCheckForUpdate({ online: true, visibilityState: 'visible' }),
  'PWA should check for a new version when online and visible',
);
assert(
  !PWAReleasePolicy.shouldCheckForUpdate({ online: false, visibilityState: 'visible' }),
  'PWA must not waste update checks while offline',
);
assert(
  !PWAReleasePolicy.shouldCheckForUpdate({ online: true, visibilityState: 'hidden' }),
  'PWA must not trigger update checks while hidden',
);
assert(
  PWAReleasePolicy.updateCheckIntervalMs() === 60 * 60 * 1000,
  'PWA update polling should stay at one hour rather than aggressively polling',
);
assert(
  PWA_UPDATE_CHECK_INTERVAL_MS >= 60 * 60 * 1000,
  'PWA release policy must not poll more frequently than hourly',
);

console.log('Smoke Lab v16 PWA release tests: OK');
