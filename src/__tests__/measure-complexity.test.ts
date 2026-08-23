// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { measure } from '../../scripts/measure-complexity.mjs';

/**
 * Guard for `npm run cc` (`scripts/measure-complexity.mjs`).
 *
 * PROVENANCE, AND WHAT IS DELIBERATELY MISSING
 * Adapted from `spert-scheduler`'s `src/integration/measure-complexity.test.ts`, which is
 * the only copy in the six repositories carrying the script — even though the script's own
 * header asserts that guard exists, as a fact, in all of them.
 *
 * That original carries a second `describe` block this file does NOT: four tests asserting
 * that a function carrying `eslint-disable-next-line sonarjs/cognitive-complexity` is still
 * measured and marked `[suppressed]`. They are bound to two Scheduler source files by path
 * and function name — `migrations.ts` / `migrateV5toV6` and `firestore-migration.ts` /
 * `migrateLocalToCloud` — neither of which exists here. Copied verbatim they fail, which is
 * how this was found rather than assumed.
 *
 * They are omitted rather than adapted because THIS REPOSITORY HAS NO SUPPRESSIONS OF THAT
 * RULE. Adapting them would mean inventing one purely to give a guard something to guard,
 * and the original's own reasoning forbids exactly that: it asserts each fixture's premise
 * first, precisely so that removing a suppression cannot leave the interesting assertion
 * passing green against a file that no longer exercises anything.
 *
 * ⚠️ SO: WHEN THE FIRST `eslint-disable-next-line sonarjs/cognitive-complexity` IS ADDED TO
 * THIS REPOSITORY, BRING THAT BLOCK ACROSS AND POINT IT AT THAT FUNCTION. It becomes both
 * possible and necessary at the same moment, which is later than it looked.
 *
 * WHAT THIS FILE DOES ASSERT — the half that is repo-independent, and a live risk here from
 * the first `npm run cc` run. `measure()` computes complexity via `lintText`. A region that
 * starts or ends mid-statement produces a fatal parse message and NO rule messages, which
 * is indistinguishable from "every function measures 0". The script must throw rather than
 * report that zero. This is the sixth "check that cannot fail" recorded against this
 * tooling, and like the others it fails in the safe-looking direction: a hot spot reads as
 * clean.
 *
 * This file is in `src/__tests__/` and not `src/integration/` deliberately. `tsconfig.json`
 * excludes `src/**\/__tests__/**` and nothing else, so at any other path under `src/` it is
 * compiled by `tsc -b`, and `types: ["vitest/globals"]` keeps `@types/node` out of global
 * scope — this repo does not declare `@types/node` at all — so `node:path` would fail to
 * resolve and `npm run build` would break. Same two reasons `copyright-headers.test.ts`
 * records for its own placement. The cost is that `tsc` never checks this file, so a type
 * defect here is latent rather than absent: typecheck it standalone if you edit it.
 */
const ROOT = process.cwd();

/** `lintText` never reads this path from disk; it only decides which config block applies. */
const PROBE = join(ROOT, 'src/core/_probe_measure.ts');

describe('measure-complexity — parse-failure guard', () => {
  it('throws on unparseable text instead of reporting zero', async () => {
    await expect(measure('function _region() {\n) : {\n}\n', PROBE)).rejects.toThrow(
      /PARSE ERROR/,
    );
  });

  it('measures a valid region without throwing', async () => {
    const rows = await measure(
      'function _region() {\n  if (a) { if (b) { return 1; } }\n  return 0;\n}\n',
      PROBE,
    );
    expect(rows.find((r) => r.line === 1)?.cc).toBeGreaterThan(0);
  });
});
