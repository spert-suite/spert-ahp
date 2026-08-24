# Mutation baseline — v0.18.32 (2026-08-24)

First mutation run in this repository. **This is a recorded baseline with classified survivors, not
a score target.** No survivor was remediated, no threshold is set, `thresholds.break` is untouched,
and `npm run mutate` is deliberately **not** a ship-gate step: a measurement must not be able to fail
a release.

```
Command   npm run mutate          (wraps npx stryker run — never call Stryker directly)
Scope     src/core/math/*.ts      5 files, 1,022 lines
Stryker   9.6.1 · checkers: ["typescript"] · maxTestRunnerReuse: 1
          excludedMutations: StringLiteral, ObjectLiteral
Tests     vitest.stryker.config.ts — the five src/core/__tests__ suites only
Wall      ~13 min at concurrency 2
```

**Scope was fixed by the item-03 candidacy gate**, which passed all five questions for
`src/core/math` and **failed Q4 for `src/core/models`**, whose shape is expressed four times over
(the TypeScript type, the `keyof ModelDoc ⊆ keyof FirestoreModelDoc` compile guard, the 23-key
server allowlist, and the editor field restriction). Mutation buys least where a rule is already
stated more than once.

## Result

| file | Killed | Timeout | Survived | NoCov | CompileError | Ignored | valid | score |
|---|---|---|---|---|---|---|---|---|
| `aggregation.ts` | 210 | 16 | 99 | 8 | 40 | 22 | 333 | 67.87% |
| `consistency.ts` | 46 | 6 | 78 | 0 | 58 | 22 | 130 | **40.00%** |
| `eigenvector.ts` | 61 | 7 | 14 | 0 | 2 | 0 | 82 | 82.93% |
| `matrix.ts` | 153 | 20 | 32 | 1 | 25 | 17 | 206 | 83.98% |
| `synthesis.ts` | 99 | 14 | 54 | 10 | 7 | 2 | 177 | 63.84% |
| **TOTAL** | **569** | **63** | **277** | **19** | **132** | **63** | **928** | **68.10%** |

**Arithmetic, stated because the denominator is easy to get wrong.** 1,123 mutants generated.
`valid = Killed + Timeout + Survived + NoCoverage = 569 + 63 + 277 + 19 = 928`. `CompileError (132)`
and `Ignored (63)` are excluded from it. `score = (Killed + Timeout) / valid = 632 / 928 = 68.10%`.

⚠️ **`Timeout` counts on the killed side.** 63 of the 632 are timeouts, not kills. The iterative
eigenvector and LLSM loops run to `EIGENVECTOR_MAX_ITER` (1000) when a mutant breaks their
convergence test, so a slower machine could reclassify some of those.

⚠️ **`Ignored` is easy to omit and it changes the denominator.** All 63 are the two
`excludedMutations` — `StringLiteral` (31) and `ObjectLiteral` (32) — excluded because string
content and empty-object mutations are equivalent for this code.

**The score is interpretable at this denominator.** At n = 928 the 95% lower bound for a perfect
score would be `0.025^(1/928)` ≈ 99.6%, so the small-denominator rule does not bind. ✅ **The
corollary matters more anyway: a survivor is a specific mutant a specific suite failed to kill, and
that is as valid at n = 9 as at n = 900. The survivors are the result; the score is context.**

## ⚠️ The validation set — twelve guards with known answers, checked before the number was read

This repository had something no sibling rollout had: the item-03 guard census, twelve sites whose
verdicts were predictable before Stryker ran. **The first run validated the harness rather than
merely producing a figure.**

**Two-step control, in order: (1) a mutant EXISTS at the site, read from `mutation.json`, never
inferred from the score; (2) its verdict.** Without step one, a no-survivor result is ambiguous
between *misconfigured* and *no mutant existed*, and the comfortable reading wins.

**Step 1 passed at all twelve sites.** Step 2:

| guard | site | mutants | verdicts |
|---|---|---|---|
| G1 | `eigenvector.ts:30` | 1 | Killed 1 |
| G2 | `eigenvector.ts:54` | 4 | Killed 4 |
| G3 | `eigenvector.ts:63` | 5 | Killed 5 |
| G4 | `aggregation.ts:131` | 1 | **Killed 1** |
| G5 | `aggregation.ts:170` | 4 | Killed 3 · Survived 1 |
| G6 | `aggregation.ts:264` | 4 | Killed 3 · Survived 1 |
| G7 | `synthesis.ts:25` | 1 | Killed 1 |
| G8 | `synthesis.ts:118` | 4 | Killed 2 · **Survived 2** |
| G9 | `matrix.ts:186` | 4 | NoCoverage 1 · Killed 2 · **Survived 1** |
| G10 | `matrix.ts:203` | 1 | Killed 1 |
| G11 | `consistency.ts:50` | 5 | Killed 2 · **Survived 3** |
| G12 | `synthesis.ts:122` | 11 | Killed 7 · Survived 4 |

**G8 and G9's surviving mutants are `ConditionalExpression → false` — the removal-equivalent, and
exactly what the hand census found.** Stryker independently reproduced item 04's finding that G8 is
subsumed by G12 and that G9's guarded arm is unreachable. G11's survivors include
`ConditionalExpression → true`, the ternary's removal-equivalent, matching the same census.

## ⚠️ THE FINDING THAT MATTERS MOST: four sites are indistinguishable in this report

`G1`, `G7`, `G10` were converted to load-bearing by hand in item 04. `G4` was found **redundant** —
mutually subsumed with `G10`, so neither is individually falsifiable through `aggregateIP`.

All four are `Math.max(x, EPSILON)`. **All four generate exactly one mutant — `MethodExpression`,
`Math.max → Math.min` — and all four are Killed.**

`Math.min(x, EPSILON)` clamps every weight *down* to EPSILON, which is catastrophic everywhere. So
the verdict is evidence that inverting max→min breaks things; **it is not evidence that the floor is
tested.** Stryker never generates the removal-equivalent mutant for these sites, so it never tests
the property the hand census measured.

**Consequence: a `Killed` verdict on a clamp cannot distinguish a load-bearing guard from a
redundant one.** The hand method separated them; this instrument cannot. That is a limit of the
tool, recorded here so the next reader does not take a green clamp for a tested one.

## Survivor shape — 277 survivors, and what they are

⚠️ **Not every survivor is classified, and claiming otherwise would be false.** 277 is beyond
hand-classification, and the SUBSUMED category's separating procedure needs human code-reading per
candidate. What follows is the twelve validation sites classified exhaustively, one whole file
classified exhaustively, and the population's shape.

**By mutator**, which is the informative cut:

```
EqualityOperator      92 (33%)     of 277 generated -> 33% survive
ConditionalExpression 90 (33%)     of 260           -> 35% survive
ArithmeticOperator    38 (14%)     of 125           -> 30% survive
BlockStatement        18 ( 7%)     of 137           -> 13% survive
MethodExpression      11 ( 4%)     of  33           -> 33% survive
remainder             28 (10%)
```

**`eigenvector.ts` classified exhaustively — all 14 survivors, one file:** every one sits on the
power-iteration convergence machinery (`L17` loop bound, `L38` `l1Diff` accumulation, `L42` the
`l1Diff < EIGENVECTOR_TOLERANCE` break) or on scale-invariant initialisation (`L15` `1/n`, `L13` the
`n === 1` early return).

**These are GAP, not EQUIV, and the difference was measured rather than assumed.** Iterations to
convergence:

```
[[1,1,1],[1,1,1],[1,1,1]]            1 iteration
[[1,2,4],[1/2,1,2],[1/4,1/2,1]]      2
[[1,5],[1/5,1]]                      2
[[1,9,1],[1/9,1,9],[1,1/9,1]]       47      <- the inconsistent fixture
```

The loop **is** exercised — 47 iterations on the inconsistent matrix. But the only assertion on that
path is `expect(lm).toBeGreaterThan(3.0)`, which a one-iteration approximation also satisfies. So
the convergence machinery is **covered and not discriminated** — the same shape item 03 found by
hand at the guard level, now found by the tool at the loop level, which the hand census did not
reach.

⚠️ **`consistency.ts` at 40.00% is the outlier and is not analysed here.** 78 survivors and 58
CompileError against 46 kills. It is the largest single body of unclassified findings in this
repository and it is the obvious first target for anyone continuing this work.

## Route matters, and a classification without one is not reproducible

`G10` is individually falsifiable through a **direct `llsmWeights` call**, where `G4` is not in the
path — and subsumed through `aggregateIP`, where it is. **The same guard resolves differently
depending on which route the suite takes.** Every classification above is relative to
`vitest.stryker.config.ts`'s five suites; a different `include` would give different answers.

## Settings whose purpose is invisible

**`maxTestRunnerReuse: 1` measured nothing here, and stays in anyway.** A/B on `eigenvector.ts` with
the incremental cache cleared between arms: **84 mutants each side, zero verdict differences**,
compared per-mutant rather than by score (two offsetting differences would cancel in an aggregate).

spert-scheduler measured this setting moving `monte-carlo.ts` from 10.07% to 84.21% on Vitest 4.1.6;
spert-forecaster on 4.1.5 did not reproduce it, and **this repo is on 4.1.5, with the non-reproducing
site.** n = 2 does not establish which variable drives it. The setting stays because the cost is
asymmetric: absent it, a stale run reports mass survival at exit 0, which reads as *"the tests are
weak"* rather than as a broken harness.

**`.stryker-tmp` and `reports/` are ignored in three places and all three were absent before this
change** — `.gitignore` (both entries; this repo is public and the sandbox holds deliberately
corrupted source), `eslint.config.js`, and `vitest.stryker.config.ts`.

⚠️ **The ESLint one is not cosmetic and the failure is not what it looks like.** Measured A/B with a
real sandbox on disk:

```
ignore ABSENT   ->  254 problems (254 errors, 0 warnings)
ignore PRESENT  ->   42 problems ( 19 errors, 23 warnings)   <- baseline restored exactly
```

Every one of the 254 is `Parsing error: No tsconfigRootDir was set, and multiple candidate
TSConfigRootDirs are present`. **127 of them are the sandbox copies and 127 are the REAL `src/`
files** — because `@typescript-eslint/typescript-estree` keeps candidate roots in a **process-global
`Set`**, and `createParseSettings` consults it on every parse whenever `tsconfigRootDir` is unset,
independently of `projectService` (which is off here). Once two roots are registered, nothing in the
repository parses.

**So this is collapse, not duplication**: the 23 baseline warnings do not double, they vanish, and
the ship gate would fail at 254 saying *"new problems were introduced"* while naming neither the
sandbox nor the cause.

## Provenance

`scripts/mutation-run.mjs` is copied from **spert-forecaster** (`md5 234c72b1…`). It is **not**
byte-identical across the suite: spert-scheduler carries a 146-line variant, Forecaster a 185-line
one that documents its own divergence. The two repositories carrying that runner are **not** the four
carrying `docs/mutation-baseline.md`, the location convention having changed on 2026-08-17 — so the
record location here follows the later practice and the runner comes from the earlier pair.

⚠️ **A known defect in that runner is deliberately not fixed here:** an all-`NoCoverage` run **passes**
its guard, because `executed = killed + survived + timeout + noCoverage` is non-zero when every
mutant is `NoCoverage`. **Do not read a green guard as a valid run** — the validation set above is
what actually protects this one. Fixing a shared artifact inside a rollout item is how a third
variant gets created without propagation.
