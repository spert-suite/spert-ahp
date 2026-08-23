// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Skip build output, generated coverage reports, and any nested git worktrees
  // under .claude/ — Claude Code creates those for parallel feature work and their
  // built dist/ bundles would otherwise be scanned as tens of thousands of
  // minified-bundle errors.
  //
  // coverage/ is not merely noise: istanbul's HTML reporter prepends
  // `/* eslint-disable */` to each of the three .js assets it writes
  // (istanbul-reports lib/html/index.js, the `assetHeaders` map), and ESLint
  // reports each as an unused disable directive. That is not a rule firing — no
  // rule below applies to a .js file — so enabling or disabling rules cannot
  // suppress it. Measured: lint 23 -> 26, which fails the shipgate ratchet.
  { ignores: ['dist', 'coverage/**', '.claude/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Honour the `_`-prefix convention for intentionally-unused bindings
      // (destructure-to-strip patterns, reserved props on extracted contracts).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'react-hooks/set-state-in-effect': 'warn',
      // react-hooks 7.1's compiler-based `refs` rule taints any hook return value
      // that bundles a ref alongside other fields (e.g. useImportState returns
      // `fileInputRef` next to `phase`/`importError`), then flags ordinary member
      // access on that object during render as "accessing refs during render".
      // Those are false positives, so this stays a warning — matching how
      // `set-state-in-effect` is handled. The gate fails on errors only.
      'react-hooks/refs': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
