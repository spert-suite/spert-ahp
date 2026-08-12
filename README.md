# SPERT® AHP

A browser-based decision-making tool built on the Analytic Hierarchy Process (AHP), developed by Thomas L. Saaty. Break a decision into criteria and alternatives, compare them pairwise on a 1–9 ratio scale, and get a ranked result with consistency checking, group aggregation, and sensitivity analysis. Part of the SPERT® Suite.

**Live:** https://ahp.spertsuite.com

## Getting Started

```bash
npm install
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm test           # Vitest
npm run lint       # ESLint
npm run shipgate   # Release gate — lint, test, build, and version-surface checks
```

Data is stored in the browser's localStorage. Cloud storage (Firebase) is optional and stays off unless the `VITE_FIREBASE_*` variables are set — see `.env.local.example`.

## Legal

Reference copies of the Terms of Service and Privacy Policy are in `/legal`. The canonical versions used by the app at runtime are hosted at:

- https://spertsuite.com/TOS.pdf
- https://spertsuite.com/PRIVACY.pdf

## License

GNU General Public License v3.0, with additional terms under Section 7 — see [LICENSE](LICENSE) for full text.
