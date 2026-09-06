import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '0.19.0', 'package version must be 0.19.0');
assert(pkg.scripts['test:engine'].includes('v19-ux-rebuild.test.ts'), 'v19 regression test must run in release checks');

const nav = read('src/components/navigation/BottomNavigation.tsx');
for (const id of ['today', 'smoking', 'pattern', 'progress']) {
  assert(nav.includes(`id: '${id}'`), `main navigation is missing ${id}`);
}
assert(!nav.includes("id: 'more'"), 'v19 main navigation must expose exactly four product areas');

const app = read('src/App.tsx');
assert(app.includes('Ich will gerade rauchen') && app.includes('I want to smoke right now'), 'acute craving help must be app-wide and bilingual');

const smoking = read('src/components/smoking/QuickSmokingLogModal.tsx');
assert(smoking.includes("type QuestionId = 'trigger' | 'intensity' | 'place' | 'decision' | 'enjoyment'"), 'smoking log must be step-based');
assert(smoking.includes('existingCount >= 3') && smoking.includes('existingCount >= 7') && smoking.includes('existingCount >= 12'), 'smoking questions must unlock progressively');
assert(smoking.includes('questions[step]'), 'only the current question should be rendered');

const today = read('src/components/today/TodayDashboard.tsx');
assert(today.includes('Tracken') && today.includes('Verstehen') && today.includes('Verändern'), 'Today must explain the product loop');
assert(today.includes('btn-open-todays-step'), 'Today must keep one dominant next action');

const patterns = read('src/components/patterns/PatternDashboard.tsx');
assert(patterns.includes('DAS HABEN WIR GELERNT') && patterns.includes('DESHALB ALS NÄCHSTES'), 'insight and action must be connected');
assert(patterns.includes('PatternEngine.getLiveInsight'), 'insights must come from real engine data');

const progress = read('src/components/progress/ProgressDashboard.tsx');
assert(progress.includes('GoalSupportEngine.baselineComparison'), 'progress must use evidence-backed comparison logic');
assert(!progress.includes('Control Score'), 'Control Score must not be visible in the primary progress UI');

const css = read('src/index.css');
assert(!css.includes('@fontsource/instrument-serif'), 'editorial serif font must be removed');
assert(css.includes('.v19-card') && css.includes('.v19-primary-button'), 'v19 card-based app design tokens must exist');

console.log('Smoke Lab v19 UX rebuild regression: PASS');
