import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const pkg = JSON.parse(read('package.json'));
assert(Number(pkg.version.split('.')[1]) >= 17, 'package version must remain v17 or newer');
assert(pkg.scripts?.['check:release']?.includes('npm run build'), 'release check must include production build');

const netlify = read('netlify.toml');
assert(netlify.includes('command = "npm run build"'), 'Netlify must build via npm run build');
assert(netlify.includes('publish = "dist"'), 'Netlify must publish dist');
assert(netlify.includes('to = "/index.html"'), 'Netlify must provide an SPA fallback');
assert(netlify.includes('for = "/sw.js"'), 'service worker cache policy missing');
assert(netlify.includes('no-cache, no-store, must-revalidate'), 'service worker must not be CDN-cached');

const workflow = read('.github/workflows/release-checks.yml');
assert(workflow.includes('npm install --no-audit --no-fund'), 'CI must install dependencies');
assert(workflow.includes('npm run lint'), 'CI must type-check');
assert(workflow.includes('npm run test:engine'), 'CI must run behavioral regressions');
assert(workflow.includes('npm run build'), 'CI must build production bundle');

const vite = read('vite.config.ts');
assert(vite.includes("registerType: 'prompt'"), 'controlled PWA update strategy must remain enabled');
assert(vite.includes('skipWaiting: false'), 'service worker must not force-skip waiting');
assert(vite.includes('clientsClaim: false'), 'service worker must not force client takeover');

console.log('v17 deployment/release policy: PASS');
