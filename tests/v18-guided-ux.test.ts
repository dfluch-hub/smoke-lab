import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '0.18.0', 'package version must be 0.18.0');

const today = read('src/components/today/TodayDashboard.tsx');
assert(today.includes("'JETZT'"), 'Today must expose a clear NOW/JETZT orientation');
assert(today.includes('Was ist gerade der Fall?'), 'Today must explain the immediate decision');
assert(today.indexOf('Guided orientation') < today.indexOf('Striking Data Composition'), 'Guidance must appear before analytics');

const tabs = read('src/components/tabs/TabViews.tsx');
assert(tabs.includes("'ALS NÄCHSTES'"), 'Lab must expose a clear next-step card');
assert(tabs.includes('Heutigen Schritt öffnen'), 'Lab must provide a direct mission CTA');

const nav = read('src/components/navigation/BottomNavigation.tsx');
assert(nav.includes('max(0.8rem,env(safe-area-inset-bottom))'), 'Bottom navigation must preserve stronger iPhone safe-area spacing');

console.log('v18 guided UX regression: PASS');
