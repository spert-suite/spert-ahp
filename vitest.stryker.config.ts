// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// Scoped vitest config for Stryker mutation testing.
// Only includes tests that exercise src/core/math/ — the five suites that import
// from it directly. This repo uses relative imports throughout, so there are no
// path aliases to mirror from vitest.config.ts.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**', '**/.stryker-tmp/**'],
    include: [
      'src/core/__tests__/aggregation.test.ts',
      'src/core/__tests__/consistency.test.ts',
      'src/core/__tests__/eigenvector.test.ts',
      'src/core/__tests__/matrix.test.ts',
      'src/core/__tests__/synthesis.test.ts',
      // ⚠️ DELIBERATELY EXCLUDED: src/__tests__/e2e.test.ts and
      // src/hooks/__tests__/useMatrix.test.ts both reach this code indirectly via
      // synthesisPipeline / useMatrix. They are slow, they mount React, and their
      // killing power would be attributed to the calculation core's own suites in
      // the baseline. They run in `npm test`, which is where they belong.
    ],
  },
});
