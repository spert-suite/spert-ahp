// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
    coverage: {
      // `include` is what makes an untested file report at 0% instead of vanishing.
      // Without it Vitest reports only files a test run actually loaded, so 36 of
      // this repo's 83 instrumentable source files were absent from the census
      // rather than listed at zero — and absent and 0% are the same thing to a
      // human reading the table and different things to a script joining on path.
      //
      // These are Vitest globs, where `**` is a globstar. That is NOT how git
      // pathspecs read the same characters: `git ls-files 'src/**/*.tsx'` silently
      // drops everything directly under src/. Enumerate with
      // `git ls-files -- src | grep -E '\.tsx?$'` instead.
      include: ['src/**/*.{ts,tsx}'],
      // Exclusions are for things that are not code — not for things we have
      // decided not to test. `vite-env.d.ts` is a one-line declaration that emits
      // nothing; `main.tsx` and `changelogData.ts` ship, so they stay in.
      exclude: ['src/**/__tests__/**', 'src/vite-env.d.ts'],
      // `json-summary` writes coverage-summary.json, which is the only file any
      // consumer should read a count or a percentage from. The text table is a
      // filtered, left-truncated view: it omits every file at 100% on all four
      // metrics (12 of 83 here) and prints `ComparisonInput.tsx` as
      // `...isonInput.tsx`. Both reporters write .json, so neither adds a file
      // ESLint would lint — see the `coverage/**` ignore in eslint.config.js.
      reporter: ['text', 'html', 'json-summary', 'json'],
    },
  },
});
