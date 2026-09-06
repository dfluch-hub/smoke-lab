# SMOKE LAB v17 — Deployment

## Architecture
- **GitHub:** canonical source code and version history
- **GitHub Actions:** automatic release checks
- **Netlify:** dedicated production deployment from the GitHub repository

## Netlify settings
The repository already contains `netlify.toml`, so Netlify should detect:
- Build command: `npm run build`
- Publish directory: `dist`
- Node.js: 22

No runtime secret is required by the current local-first PWA.

## First production deployment
1. Create/use a dedicated GitHub repository for SMOKE LAB.
2. Upload/push the entire v17 project root, including dot-folders such as `.github`.
3. In Netlify, create a new site by importing the SMOKE LAB GitHub repository.
4. Keep the settings from `netlify.toml` rather than duplicating them manually.
5. After deploy, open the HTTPS URL and test normal navigation, reload, installability and offline reload.

## Rule for future releases
Do not edit production code in Netlify. Make changes in GitHub, let CI pass, then let Netlify deploy the commit.
