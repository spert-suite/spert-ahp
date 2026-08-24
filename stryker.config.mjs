// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// stryker.config.mjs
// Mutation testing configuration — scoped to the AHP calculation core.
// Run with: npm run mutate   (never `npx stryker run` directly — see scripts/mutation-run.mjs)
// Do NOT commit Stryker output directories to source control.
//
// Scope fixed by item 03's candidacy gate: it passed all five questions for
// src/core/math and FAILED Q4 for src/core/models, whose shape is expressed four
// times over (the TS type, the keyof-subset compile guard, the 23-key server
// allowlist, and the editor field restriction). Mutation buys least where a rule
// is stated more than once. Do not widen this without re-running that gate.

/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  packageManager: "npm",
  // "json" writes reports/mutation/mutation.json — the machine-readable survivor
  // list (line, mutator, status), which is how a run is compared against a recorded
  // baseline rather than eyeballed. It is bundled in @stryker-mutator/core, no
  // plugin install. NOTE: a CLI `--reporters` flag REPLACES this list rather than
  // adding to it — same semantics as `--mutate`.
  reporters: ["html", "clear-text", "progress", "json"],
  testRunner: "vitest",
  checkers: ["typescript"],
  // ⚠️ AHP has ONE tsconfig.json — structurally the Next.js shape, not the split
  // tsconfig.app.json / tsconfig.node.json the Vite siblings use. The checker
  // crashes on the first mutant if a --mutate target is excluded by this file;
  // the exclude here is only `src/**/__tests__/**`, so the five targets are in.
  tsconfigFile: "tsconfig.json",
  // Whole files, never line ranges — ranges drift under every subsequent edit and
  // the drift is silent.
  mutate: [
    "src/core/math/aggregation.ts",
    "src/core/math/consistency.ts",
    "src/core/math/eigenvector.ts",
    "src/core/math/matrix.ts",
    "src/core/math/synthesis.ts",
  ],
  // Run only the tests that cover the mutated files via a scoped vitest config.
  vitest: {
    configFile: "vitest.stryker.config.ts",
  },
  // REQUIRED — do not remove. With unlimited test-runner reuse, mutant activation
  // in the reused vitest workers goes stale on this toolchain (Stryker 9.6.1 +
  // vitest runner + Node 24): the run exits 0 but nearly every mutant "survives",
  // including mutants whose covering tests directly assert the mutated behaviour.
  // Measured at spert-scheduler 2026-07-31: monte-carlo.ts scored 10.07% with
  // default reuse against 84.21% with reuse 1.
  //
  // ⚠️ That site runs Vitest 4.1.6 and spert-forecaster, on 4.1.5, did NOT
  // reproduce it. This repo is on 4.1.5, so it sits with the non-reproducing site
  // — but n=2 does not establish which variable drives it, and the cost is
  // asymmetric: absent the setting, a stale run reports mass survival at exit 0,
  // which reads as "the tests are weak" rather than as a broken harness.
  //
  // If scores ever look like mass survival of obviously-killable mutants, suspect
  // runner staleness first — and delete reports/mutation/.stryker-incremental.json
  // so a poisoned incremental cache does not replay old false "Survived" results.
  // Known recovery for a sandbox "ENOENT ... chdir" crash at startup:
  // rm -rf .stryker-tmp
  maxTestRunnerReuse: 1,
  // Exclude type-only constructs that cannot be meaningfully mutated
  mutator: {
    excludedMutations: [
      "StringLiteral",   // string content changes produce equivalent mutants
      "ObjectLiteral",   // empty object mutations rarely affect behavior
    ],
  },
  // Concurrency: use half available CPUs to avoid thrashing
  concurrency: 2,
  // Timeout: generous for the iterative eigenvector / LLSM loops, which run to
  // EIGENVECTOR_MAX_ITER (1000) when a mutant breaks their convergence test.
  timeoutMS: 10000,
  timeoutFactor: 2.5,
  // Output directory
  htmlReporter: {
    fileName: "reports/mutation/mutation-report.html",
  },
  // Incremental mode: cache results between runs
  incremental: true,
  incrementalFile: "reports/mutation/.stryker-incremental.json",
};
