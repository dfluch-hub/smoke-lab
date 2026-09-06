import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '0.18.2', 'package version must be 0.18.2');

const today = read('src/components/today/TodayDashboard.tsx');
assert(today.includes("'Du bist'"), 'Today must show the current day and phase');
assert(today.includes("'Dein Ziel'"), 'Today must show the current goal');
assert(today.includes("'Heute'"), 'Today must show today’s task');
assert(today.includes("'Jetzt'"), 'Today must expose a clear NOW/JETZT orientation');
assert(today.includes('btn-open-todays-step'), 'Today must have one clear next-step action');
assert(!today.includes('ControlScoreEngine'), 'Analytics must not compete on the Today screen');

const tabs = read('src/components/tabs/TabViews.tsx');
assert(tabs.includes("'ALS NÄCHSTES'"), 'Lab must expose a clear next-step card');
assert(tabs.includes('Heutigen Schritt öffnen'), 'Lab must provide a direct mission CTA');
assert(tabs.includes('Plan und weitere Optionen'), 'Detailed plan content must be progressive disclosure');

const nav = read('src/components/navigation/BottomNavigation.tsx');
assert(nav.includes('max(0.8rem,env(safe-area-inset-bottom))'), 'Bottom navigation must preserve stronger iPhone safe-area spacing');
assert(nav.includes("id: 'today'") && nav.includes("id: 'plan'") && nav.includes("id: 'more'"), 'Navigation must have only Today, Plan, and More destinations');

const app = read('src/App.tsx');
assert(app.includes('global-want-to-smoke'), 'The acute craving action must be available app-wide');
assert(app.includes('global-i-smoked'), 'The smoking quick-log must be available app-wide');

console.log('v18 guided UX regression: PASS');
