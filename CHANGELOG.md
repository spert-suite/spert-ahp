# SPERT® AHP — Changelog

## v0.18.37 (September 3, 2026)

Release tooling only. Nothing about how you build or score a decision changed, and no stored decision data was altered.

The post-release check added two releases ago went out to the nine projects in the suite in two slightly different forms. Partway through that rollout one project's code-style tool objected to how a line in it was written, so the line was rewritten. The projects that had already received the file kept the first version.

### Why one line matters here
The two forms behave identically — the difference is that the corrected one computes a value before using it rather than nesting one expression inside another. These scripts are deliberately the same file in every project, so that none can quietly drift onto its own version of the release rules, and two forms in circulation is exactly the drift that arrangement exists to prevent. Every project now carries the corrected one.

### The lesson kept rather than the fix
A file that must be identical everywhere should be corrected at its source and re-sent, not corrected where the problem happened to surface. Fixing it in place is what produced two forms.

## v0.18.36 (September 3, 2026)

The changelog page showed the words "Invalid date" beside the two most recent versions. Both now show their real dates, and a check has been added so it cannot happen again.

### What went wrong
The page builds each date by splitting the stored text on hyphens and reading the pieces as year, month and day. Two entries had been written as "August 24, 2026" instead of "2026-08-24". Splitting those on a hyphen yields one piece, the arithmetic produces nothing usable, and the page prints "Invalid date" where the date should be.

### Why it happened twice
The newest entry is the natural template for the next one. The first malformed date shipped on August 24; the next release copied its shape ten days later. That is the shape of the trap — one bad entry reproduces itself, and the version most people look at is the one most likely to carry it.

### Why nothing caught it
The existing changelog check compares which versions appear in each of the two places the changelog lives. It says nothing about dates, so both entries passed every check.

### The new check
Every entry's date is now run through the page's own formatting function, and any that comes back as "Invalid date" fails the build. It calls the real function rather than a copy of it: a copy would have agreed with itself while the page went on showing the wrong thing. The check carries a deliberate counter-test proving it still rejects the old broken format, so it cannot quietly lose its power later.

## v0.18.35 (September 3, 2026)

Release tooling only. Nothing about how you build or score a decision changed, and no stored decision data was altered.

Releasing this app includes bringing the local copy of the project back into line with the copy on the server once a release has landed. Merging advances the server; it does not touch the local copy. If the local one is left behind, every report still reads as though the release arrived everywhere, and the next release is then built on the wrong starting point.

### Why nothing had caught it
Two mechanisms that look like they should have covered this could not. The pre-release check runs *before* a release is merged, so the condition it would be checking does not exist yet. The automated build cannot check it either, because it is a fact about the machine doing the release rather than about the project — a fresh automated copy has no view of anyone's working copy. The gap was invisible rather than merely unaddressed.

### Two checks, at the two moments
Before a release, the existing check now refuses to proceed if the local copy is behind the server, so a release is never cut on a stale starting point. Being *ahead* is normal and is not reported — that is what the release itself is.

After a release, a new command compares the local copy, the local record of the server, and the server's own answer, and reports which one disagrees. Three sources rather than two, because the first two can be stale together and agree with each other while both are wrong.

### What the pre-release check deliberately does not do
It does not require a clean working copy, and must not start to. It runs partway through a release, after the version and release-notes edits are made and before they are committed, so uncommitted work is expected at that exact moment. Requiring cleanliness there would fail every release. That check belongs to the after-the-merge command, where it is correct.

### Why it compares fingerprints instead of reading a command's output
The step had once been reported as done elsewhere in the suite on the strength of a command's closing message, where the informative line had been trimmed away. The message that remained — that everything was already current — cannot distinguish *checked, nothing to do* from *never checked*. Both checks read the resulting state and compare fingerprints instead. Running a command is not the same as checking its effect.

The release script is shared and deliberately identical across the suite; this repo now carries the same version as the others.

## v0.18.34 (August 24, 2026)

The time a decision records as "last changed" is now written as plain text, matching the rest of the SPERT® Suite. Nothing about how you build or score a decision changed, and no stored decision data was altered.

### Why
This app stored that time as a number of milliseconds while four of the seven suite apps store it as text, and the shared service that adds someone to a decision wrote a third form again. One of those apps reads decisions this one can share with, and formatting refuses rather than shrugs when handed the wrong form — so that app's project list could fail to draw a row after somebody was added.

All thirteen places this app writes that time now write plain text, and the field's declared type was changed to match.

### The obvious way to make this change would have quietly corrupted a second field
Three of the thirteen sit in functions where a single `now` value is calculated once and used for **both** the "last changed" time and the "created" time. Changing that one value — the tidy-looking edit — would have silently converted the creation date too, which is read, is not part of this change, and would then disagree with its own declared type.

The change was made at each of the thirteen fields instead, leaving the shared value alone.

⚠️ **The safeguard that was supposed to catch that mistake did not cover two of the three places.** The plan for this work said the type checker would reject the tidy edit because the creation date is still declared as a number. Measured: making that edit in the first two of the three functions **compiles cleanly**, because the expression feeding the creation date falls back to the shared value only when the existing one is missing — and since the existing one can never be missing, the type checker never looks at what it would have fallen back to. Only the third function was caught, and by a different field entirely.

Those three declarations are now written with their type stated explicitly, which turns the mistake into an error on the declaration line itself. Confirmed at all three.

### What was verified
- Each of the thirteen is checked separately rather than one check for the file. Twelve could be left unconverted and a single check would still pass — which is the shape of the fault this whole change fixes.
- The checks were run against the old code: reverting all thirteen fails thirteen of the fourteen, and reverting **one** fails exactly one. The fourteenth asserts the count itself, so it does not depend on the code.
- One check was found to pass while its subject never ran, and now fails in that case rather than passing on an empty result.

## v0.18.33 (August 23, 2026)

Security only — no functional, data, or interface changes. **This closes four advisories that the previous release introduced.**

### Security
- **Four advisories, all arriving with the previous release's own tooling, are closed.** Installing the mutation-testing tool added 112 supporting packages, and three of them carried advisories between them — one high, two moderate. None of the three had been present before that install. `fast-uri` 3.1.2 → 3.1.5 clears three; `qs` 6.15.1 → 6.15.2 clears the fourth and, with it, a third package that was only flagged for depending on the old `qs`. That last point was verified rather than assumed: no major version change was needed anywhere.
- **None of the three ever reached the application.** All are development-only dependencies of the mutation-testing tool, so none is part of the code served to a browser. That is why this is a correction rather than an incident — but it is still a correction, because the previous release reported a clean result and the result was no longer clean.

### Notes
- **The oldest fixed version was taken rather than the newest, and it mattered more here than anywhere.** The automatic tool would have installed `fast-uri` 3.1.6, published the same day this was written. The version taken, 3.1.5, is 23 days old and clears exactly the same three advisories. There was no fully settled option on that line, so this is recorded as an exception. **`qs` needed no exception at all**: 6.15.2 is 99 days old, the oldest that escapes and comfortably past the settling period — the outcome this rule exists to find.
- **How the gap happened, recorded because the reason is more useful than the fact.** The previous release did audit all 112 new packages — for *settling time*, checking every publish date against the 60-day boundary, and reported none inside it. It did not audit them for *advisories*. Those are two different questions over the same list, one instruction covered both, and only one was run. The result was reported as though it covered both. The mistake was caught by re-reading the previous release's own summary after it had shipped, which is the last and weakest place to catch anything.
- Both new pins carry written notes naming the specific advisories they escape and the range they must exceed, and the check added two releases ago — which fails the build if a pin and its note disagree — accepted them without modification.

## v0.18.32 (August 23, 2026)

Development tooling only — no functional, data, or interface changes. **No application code was altered.** This adds a second measurement and records what it found.

### Added
- **Mutation testing, and a recorded baseline of what it says about the calculation core.** The technique changes the code in small ways on purpose — flips a comparison, deletes a call, swaps an operator — and re-runs the tests. A change no test objects to is a change the tests cannot see. Run with `npm run mutate`; the full record, with every figure and the arithmetic behind it, is in `docs/mutation-baseline.md`.
- **The result: of 928 usable changes made to the five calculation files, 632 were caught and 277 were not.** That is a baseline, not a target. Nothing was fixed in response to it, no threshold is set, and the check deliberately cannot fail a release.

### Notes
- **The most useful thing it found is a limit on itself.** Four places in the calculation core hold the same one-line safety floor. Three of them were shown by hand, in the previous release, to be genuinely load-bearing; the fourth was shown to be redundant — a duplicate of another, either one sufficient. **This tool reports all four identically.** It only knows how to invert that line, not to remove it, and inverting it breaks everything either way. So a passing result on that kind of line means the inversion was caught, not that the safety floor is tested. Recorded so that a future reader does not mistake the one for the other.
- **It also found something the by-hand pass could not reach.** The iterative calculation that derives priority weights loops until it settles — 47 rounds on a deliberately inconsistent example. The loop runs, but the only thing checked about that example is a very loose bound that a single round would also satisfy. So the settling machinery is exercised without being checked. That is the same weakness the previous release fixed at the level of individual safety checks, found this time at the level of a loop, which is where hand inspection had not looked.
- **One of the five files scores far below the others** and is deliberately left unanalysed here: 78 uncaught changes against 46 caught. It is named in the record as the obvious first target for anyone continuing this work.
- **A setting was kept although it was measured to do nothing here.** A sister project found it changed that project's result dramatically; this project's version of the underlying tool differs by one patch release, and measuring it here — every individual change compared, not just the summary figure — found no difference at all. It stays because the failure it prevents is silent and reads as bad news about the tests rather than as a broken tool.
- **Three protections were added for the tool's working directory**, which holds a complete copy of the source with one file deliberately corrupted. It was excluded from version control (this project is public), from the code-style check, and from the scoped test run. The middle one was not a nicety: with the working directory present and unexcluded, the code-style check went from 42 findings to **254**, and every one was a failure to read the code at all — including the real files, not just the copies. The release check would have failed reporting new problems, while naming neither the cause nor the directory.

## v0.18.31 (August 23, 2026)

Tests only — no functional, data, or interface changes. **No application code was altered**, and the tests below were verified by deliberately breaking the code they cover.

### Added
- **Six defensive guards in the calculation core are now actually tested.** Each was already *executed* by the existing tests — it just made no difference to any of them whether it was there. Every one of the six was verified by removing it and confirming a test fails, and then by replacing it with a *plausible wrong version* rather than deleting it, and confirming a test fails again. Deletion alone is the weaker check: a test tuned only to deletion can be tuned to the check rather than to the behaviour.
- **What each of the six protects**, stated as behaviour rather than as code: a criterion nobody compared still receives a weight instead of vanishing from the consistency calculation · an unusable weight is excluded from that calculation instead of producing an infinite result · a weight set with nothing usable in it reports the value meaning "perfectly consistent" instead of reporting nothing at all · **a panel in which every voter is indifferent reports full agreement instead of showing the user the text "NaN"** · an alternative that scores zero against every criterion is still distinguishable from one that was deleted · and a criterion judged overwhelmingly less important than the rest cannot collapse to a weight 138 orders of magnitude below its neighbours.

### Fixed
- **A test that named a guard, asserted the guard existed, and could not fail.** It was called "all entries >= EPSILON" and it checked that the calculation's own lower bound was applied. It passed identically with that bound removed, because its example never came near it. Worse, the guarantee it claimed **is not one the design can offer**: the last entry of the vector is deliberately set to whatever makes the total come to exactly 1, so it is the one entry the bound cannot hold. The test asserted an impossibility for three years and passed, because its example happened to put the awkward value first. It has been replaced with one that fails when the bound is removed.

### Notes
- **Four further guards were examined and deliberately left alone**, because each turned out not to be testable rather than merely untested — and knowing which is which is the point of the exercise. Two are unreachable: one sits behind a table of constants that can never take the value it checks for, the other behind a connectivity check that rejects the input it guards against before it can arrive. Two more are redundant: a later check in the same calculation already rejects everything the earlier one would have caught, so removing either changes nothing. **Writing a test for any of the four would have produced a test that passes for a reason unrelated to what its name claims** — which is the specific failure this release exists to remove, not to add more of.
- **The count moved from 375 tests to 380**, and that is a smaller number than the work suggests because one existing test was replaced rather than added to. Leaving a misleading test in place beside a good one still leaves it passing and still leaves it asserting nothing.

## v0.18.30 (August 23, 2026)

Development tooling only — no functional, data, or interface changes. **This adds a measurement, not a fix.** Nothing in the application was changed in response to what it found.

### Added
- **A cognitive-complexity check, and a baseline of what it currently finds.** `eslint-plugin-sonarjs` is installed and exactly one of its rules is switched on: cognitive complexity, at a threshold of 15. It measures how hard a function is to follow — nesting, branching, and jumps in control flow — rather than how long it is. **Nineteen functions are over the threshold today**, ranging from 16 to 41, across twelve files. That number is now held steady by the release check.
- **A tool for measuring code that has not been written yet.** `npm run cc <file>` reports the complexity of *every* function in a file, not only the ones over the threshold — and given a line range, it reports what a block *would* measure if it were lifted into its own function. That second form lets a proposed restructuring be costed before a line moves. The check only ever reports failures, so on its own it cannot answer either question.
- **A guard on that tool, and an honest account of the half that could not come with it.** The tool computes complexity by running the linter over text; text that does not parse produces no findings at all, which is indistinguishable from "every function scored zero". It must fail loudly instead, and now there is a test proving it does. The sibling project this guard came from carries four further tests covering functions whose findings are deliberately silenced — those are tied to files that do not exist here, and **this project has no silenced findings to test against.** They were left out rather than adapted, with a note in the test file saying to bring them across the day the first one is added.

### Notes
- **These nineteen are a measurement, not a list of defects, and none of them is being fixed here.** A high score marks a function that is hard to hold in your head; whether that is worth changing is a separate judgement, made per function, and sometimes the answer is no. A sibling project finished a similar effort with three findings still standing, each with its reason written down beside it. **Zero was never the target.**
- **The release check now holds a count of 42** — the nineteen new findings plus the twenty-three advisory warnings that were already there. It fails in **both** directions: introducing a finding fails it, and so does removing one without updating the count. That second half is deliberate. A restructuring that moves complexity from one function into another rather than reducing it would otherwise pass silently.
- **One rule, not the whole set.** The plugin offers around 400 checks; this enables one. A sibling measured the difference on a single day: 10 findings from this rule alone against 103 from the recommended set, and the extra 93 were not simply more signal — roughly a fifth were wrong for that codebase. The two numbers are not comparable, so which was chosen is recorded in the configuration itself.
- **Not one of the nineteen is in a test file**, despite the check covering all 39 of them with no exclusion anywhere. The pre-existing twenty-three were also entirely outside the tests, so this is a clean result rather than a coincidence — anything found there would have been unambiguously new.

## v0.18.29 (August 23, 2026)

Dependency and tooling maintenance only — no functional, data, or interface changes. **The project now reports zero known security advisories**, down from fourteen at the start of this work.

### Security
- **The fourteenth and last advisory is closed.** `esbuild` moves to 0.28.1, reached by a small update to the build tool (`vite` 7.3.5 → 7.3.6) which widened the range of `esbuild` it accepts. That widening is the build tool's own statement that the newer line works, which is why this did not require a major version of anything. 0.28.1 was published on 11 June — **72 days old, and the only fix in this entire effort that had already passed the project's 60-day settling period.** 0.28.2 clears the same advisory and is 14 days old; taking the oldest version that escapes is what made this one compliant rather than another recorded exception.

### Changed
- **Every dependency is now pinned to an exact version.** Six were declared as "this version or any newer compatible one", which meant a fresh install could quietly pick up a release nobody had reviewed. One had already drifted three releases that way — declared at 6.6.3 and actually resolving to 6.9.1. All six are now fixed to the version that was already in use, so installs are reproducible and every future change is a visible edit.
- **No dependency was advanced for currency.** Each of the six was checked separately for a newer release worth taking: four are already the newest available, one has a newer release that is 34 days old and has not settled, and two have newer major versions that are out of scope for this pass and need a separate decision. **Closing the drift and advancing versions are different questions, and the answer to the second was "nothing, this time."**

### Fixed
- **An ignore-file heading described five patterns as one thing they were not.** It labelled them "TypeScript build output", when only one of the five is written by the TypeScript compiler, two match nothing and cannot (that compiler is configured to emit no files at all), and two were left over from an older build mechanism entirely. Measured before touching anything: 1 match, 0, 0, 0, 0 — with a known-good pattern checked alongside returning 107, because a pattern that matches nothing and a check that is broken both print zero. The two that could never match were removed; the two misfiled ones were moved to the section they actually belong to and left in place, since an unused ignore line costs nothing while a wrongly removed one can put a generated file into a public repository.

### Added
- **A check that the notes on dependency pins cannot drift from the pins themselves.** Pins are recorded in a file format that allows no comments, so the explanations live in a neighbouring block — which creates a new way to go quietly wrong: a note describing a pin that no longer exists, or a pin with nothing explaining it. Both would look correct on the day they stopped being true. The build now fails if the two lists disagree in either direction, or if a note records a version without naming the advisory that justifies it. Each of the four assertions was verified by breaking it on purpose and confirming the named check failed.

## v0.18.28 (August 23, 2026)

Security only — no functional, data, or interface changes. Thirteen of the project's fourteen known security advisories are cleared; the fourteenth is deliberately deferred one release, for the reason given below.

### Security
- **Thirteen advisories closed across five packages.** `brace-expansion` 5.0.6 → 5.0.9 (3 advisories) · `undici` 7.28.0 → 7.29.0 (5) · `postcss` 8.5.15 → 8.5.23 (2) · `nanoid` 3.3.15 → 3.3.18 (2) · `protobufjs` 7.6.4 → 7.6.5 (1). Every one is a transitive dependency at a single install location; none is a package this project depends on directly, and none required a major version.
- **The count is of advisories, not packages.** Six packages were flagged, carrying fourteen distinct advisories between them. Counting packages would have reported "6 → 1" and hidden that one package accounted for five of them.

### Fixed
- **An existing safeguard had quietly stopped being one.** A pin on `protobufjs` was added in June to force a version above a then-critical advisory, and it did exactly that on the day it was written. A later advisory was published covering a *wider* range of versions — wide enough to include the one the pin had settled on. The pin did not fail and nothing reported it: it sat in the project file looking like the thing that had handled the problem, while resolving to a version inside the range it existed to escape. It is now pinned above the current range and carries a written note naming the advisory, because the version was never what moved — the advisory was.
- **A second pin was found to be doing nothing, and was kept anyway.** A pin on `@grpc/grpc-js` was added at the same time for the same reason. It was tested both ways: with the pin present and with it removed, a from-scratch install resolves the identical version and reports no advisory. It is inert. It is kept rather than deleted, because deleting it has no measurable benefit and an unmeasured risk, and it now carries a note saying plainly that it is not currently doing work.

### Notes
- **Every one of these five fixes is newer than the project's 60-day settling period, and there was no alternative.** For each package, every version that escapes its advisory was checked: `brace-expansion` 5.0.9 (23 days old), `nanoid` 3.3.18 (15), `postcss` 8.5.23 (29), `protobufjs` 7.6.5 (49), `undici` 7.29.0 (29). **No settled version escapes any of the five ranges.** That is not this project's bad luck — these advisories are recent, so the first version fixing each one is necessarily recent too. A security fix is unsettled at the moment it matters, by construction. Security takes precedence, and the exceptions are recorded here rather than passed over.
- **Where a choice existed, the oldest fixed version was taken rather than the newest.** `postcss` has four versions that escape its advisory; the automated tool selects the newest, 8.5.26, which is 16 days old. This release takes 8.5.23 — 29 days, the oldest that escapes, clearing the same two advisories with nearly twice the settling time behind it.
- **The fourteenth advisory is deferred on purpose.** Clearing `esbuild` requires a small bump to `vite`, which as of today is 59.84 days old and crosses the 60-day line on 24 August. The advisory itself is low severity, affects only the development server, and only on Windows, which nobody develops this project on. Waiting a day or two clears it with no unsettled package at all, rather than adding a sixth exception to the list above.
- Lockfile movement, measured rather than eyeballed: **5 entries changed, 0 added, 0 removed.**

## v0.18.27 (August 23, 2026)

Development and release tooling only — no functional, data, or interface changes.

### Added
- **The coverage census now counts every source file, not only the ones a test happens to load.** `vitest.config.ts` gains a `coverage` block declaring `include: ['src/**/*.{ts,tsx}']`. Without it, Vitest reports only files loaded during a run, so a file no test imports was *absent from the report* rather than listed at 0% — and absent and zero look identical to a human reading a table while being different things to a script joining on path. The census goes from 47 files to **83**, of which **36 newly appear**: 34 at 0%, and 2 that contain nothing executable at all.
- **A machine-readable summary.** The `json-summary` reporter writes `coverage/coverage-summary.json`. Both new reporters write `.json`, so neither adds a file the code-style step would read — the exclusion added in v0.18.26 stays sufficient.

### Fixed
- **The file counts published in v0.18.26 were wrong, and this entry carries the corrected pair.** That entry said *"34 of the repository's 81 non-test source files"* were absent from the census. The true figures are **36 of 83**, out of a tracked population of **84** — the third file is a one-line declaration that emits nothing, so it is excluded from coverage for the same reason it could never be covered.
- **The cause, because it will recur.** The population was counted with a file-matching pattern that silently drops everything sitting directly at the top of the source folder — three files, including the application root and its entry point. Both halves of the published sentence came from that same count, so they agreed with each other: 34 absent plus 47 present made 81, and the total looked right. All three dropped files were *also* missing from the census, so the arithmetic balanced and nothing flagged it. An error that is self-consistent is the kind that survives review. The v0.18.26 entry is deliberately left as written — it records what was believed at the time — and the correction lives here.
- **How to check this one rather than trust it:** 36 + 47 = 83, and 83 is the file count anyone can produce by running the coverage command. The earlier pair could not be checked that way, and that property — not the size of the error — is what makes the new figures better.

### Notes
- **The measured percentage fell from 69.87% to 50.98% of statements, and that fall is the point.** No test changed and no code got worse. Thirty-six files that were previously invisible are now counted, most of them untested. A number that had stayed put would have meant the setting did nothing.
- **Read counts and percentages from `coverage-summary.json`, never from the printed table.** The table is a filtered, abbreviated view: it omits every file scoring 100% on all four measures — twelve of them here — and it shortens long names from the left, so `ComparisonInput.tsx` prints as `...isonInput.tsx`. Forty-seven of its rows are abbreviated. Counting its rows gives 71 where the real figure is 83.
- **Two of the 83 files contain nothing to measure** — one is 476 lines of type declarations, the other a single re-export. Both compile to no runtime code. They are kept in the census deliberately, because that fact is worth knowing, but any calculation involving a *count* of files should first drop the ones with nothing to instrument.
- **A reporter changed another reporter's output, which is worth recording.** Whether the browsable HTML report is enabled alters what the machine-readable summary says about those two files: with it, they read 0%; without it, 100%. Measured four ways to isolate it, and it tracks the HTML reporter alone. The configuration that ships enables the HTML report, so those files read 0% — but it means a summary figure is only comparable against another produced with the same set of reports enabled.

## v0.18.26 (August 23, 2026)

Development and release tooling only — no functional, data, or interface changes.

### Added
- **Test coverage can be measured for the first time.** `@vitest/coverage-v8` is declared as an exact development dependency at `4.1.5`, and `npm run test:coverage` runs it. Neither existed before. Nothing reported the absence, either: `vitest` declares the provider as an *optional* peer dependency, so no command failed and no warning was printed — coverage was simply not a property this repository could measure. The sibling projects each had a coverage script that failed loudly with a missing-dependency error; this one had no script at all, so the gap was silent.
- **The version is pinned to `vitest`'s exact peer requirement, not to the newest release.** `vitest@4.1.5` requires `@vitest/coverage-v8@4.1.5` — an exact range rather than a floor — so a matched pair is a constraint, not a preference. Both were published nineteen seconds apart on 21 April 2026.
- **The first census: 70.03% of statements, 57.22% of branches, across 47 source files.** With no `coverage.include` configured, Vitest reports only the files a test run actually loads, so 34 of the repository's 81 non-test source files are absent from the report rather than listed at 0% — and a separate 5 are present at exactly 0%. Those are two different states that look identical in a printed table, and the distinction is deliberately left visible rather than configured away.

### Fixed
- **The generated coverage report is excluded from version control.** This repository is public, and the report directory is rewritten on every coverage run. Untracked and un-ignored, it was one bulk `git add` away from being committed and published. `/coverage` is now ignored.
- **The generated coverage report no longer fails the release check.** This one was live, not hypothetical. The report's HTML writer copies three JavaScript assets into the output directory and prepends `/* eslint-disable */` to each on the way out — the text is injected at write time and is not present in the files as shipped, so inspecting the installed package does not reveal it. The code-style step then reports each as an unused directive, taking the count from 23 to 26 against an agreed figure of 23, and the release check fails with "new problems were introduced" while naming coverage nowhere. Measured both ways: 26 without the exclusion, exactly 23 with it. Note that no style rule is involved — none of them apply to a JavaScript file here — so turning rules on or off could not have suppressed it.
- **A comment in the ignore file said a file that exists is not present.** It described `README.md` as "not present today"; the README was added in June and the comment was never updated. This is not a cosmetic fix: the stale comment was read as evidence during the preparation of this very change and produced a wrong conclusion that had to be caught and corrected.

### Notes
- The dependency was installed with `npm install --save-exact --save-dev @vitest/coverage-v8@4.1.5 --before=2026-06-24`. The date is a 60-day boundary, and it applies to the whole resolved set rather than only to the package named on the command line. It selected `magicast 0.5.3` over `0.5.4` and `ast-v8-to-istanbul 1.0.4` over `1.0.5`; the newer two were 22 and 39 days old. Thirteen packages were added, none removed, and no already-installed package changed version.

## v0.18.25 (August 22, 2026)

Development and release tooling only — no functional, data, or interface changes.

### Fixed
- **The shared release-checking script no longer says there is no automated checking.** That script is deliberately the same file in all nine SPERT® Suite projects. The note at the top of it said there was no automated checking anywhere in the suite — that a green tick on a proposed change meant only that a preview copy had been built, and that nothing ran the tests. That has not been true since the script existed. Automated checking runs on every one of the nine projects, on every proposed change and on every merge, and what it runs is this very script.
- **The statement did not go out of date — it was untrue on the day it was written.** The same set of edits that added the script also switched the automated checking on, so the file contradicted a change sitting beside it. That distinction decides the remedy: a statement that decays can be helped by writing down when it was made; a statement that was never true cannot. What went wrong was that a claim about the projects was written into an explanation without being checked against them, and an explanation is read as background rather than as an assertion somebody has to verify.

### Added
- **A note that automated checking and a check run by hand are complementary rather than ranked.** The automated one works from a clean copy, so it catches anything that quietly depends on a file existing only on the author's own machine; but it also has less of the project to look at, so certain checks step aside there and only a hand-run finds what those cover.
- **A note explaining how the code-style step is judged, and this project is the reason it had to be written carefully.** That step compares the number of reported issues against an agreed figure instead of reading pass or fail. In most projects the step reports failure at the agreed figure, so reading pass-or-fail would be too strict. In this one it reports success — all twenty-three are advisories rather than errors — so reading pass-or-fail would be too lenient and would let new issues through unnoticed. An earlier draft of the note stated only the first reason, which would have put the opposite of this project's own recorded rationale into this project's own file. The note now states the mechanism and lets both reasons sit under it.
- **A warning that the figure counts every kind of issue, not the one kind a project set it for**, and that when it reaches zero the setting must be removed rather than set to zero — at zero the tool prints no count at all, and the step then fails asking for a number that was never printed.

## v0.18.24 (August 20, 2026)

Internal safeguard only — no functional, data, or interface changes.

### Added
- **A safeguard now stops a future code change from silently breaking saving.** Decisions saved to the cloud are accepted only if every field they carry appears on a fixed list the server checks. Adding a new piece of information to a decision without also adding it to that list would have compiled cleanly, passed every existing check, and then failed for everyone the moment it shipped. The build now refuses to compile that mistake, and names the field responsible so it can be fixed in seconds rather than diagnosed from a server error.
- **Nothing changes for a user today.** No bug was fixed here — the app and the server agree on every field they exchange, and did before this release. The safeguard exists so they cannot quietly stop agreeing later.

## v0.18.23 (August 19, 2026)

Sign-in change — no functional, data, or interface changes beyond the Settings page wording.

### Changed
- **Microsoft sign-in now requires a work or school account.** Personal Microsoft accounts — outlook.com, hotmail.com, live.com — are no longer accepted, and are refused at the sign-in screen before any password is entered. Microsoft itself enforces this, not the app. The change was made for institutions evaluating the Suite, who reasonably expect "sign in with Microsoft" to mean an organisational account rather than any account at all.
- **Nothing changes for personal use — sign in with Google instead.** Google still accepts personal accounts, so anyone can still enable cloud storage. The Settings page now says so, rather than letting you choose Microsoft and discover the restriction from an error message.

## v0.18.22 (August 19, 2026)

Security headers only — no functional, data, or interface changes.

### Changed
- **The app now sends four security headers it was not sending before.** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` are now returned on every response. A live check across the SPERT® Suite found this app was the only one of eight serving none of them; the other seven already did, so this brings it into line rather than introducing anything new.
- **`X-Frame-Options` is the one that mattered.** Without it there was nothing stopping this app from being loaded invisibly inside a frame on another site, where a visitor could be induced to click controls they cannot see. It is set to `DENY`, matching six of the other seven apps.

## v0.18.21 (August 2, 2026)

Licensing only — no functional, data, or interface changes. The app behaves identically to v0.18.20.

`LICENSE` remains a byte-for-byte copy of the canonical file in the SPERT® Suite landing-page repository, differing only in the project repository URL on line 4. It goes from 726 lines to 756.

### Changed
- **The conditions attached to the licence now number six rather than four**, and each follows the wording of the standard licence itself rather than paraphrasing it. What the licence permits is unchanged: anyone may still use, study, modify and share this software freely. The wording matters because the standard licence lets whoever receives the software delete any added condition that strays outside the short list it allows — a condition worded too ambitiously protects nothing at all.
- **The condition covering on-screen credit was rewritten.** It used to require any modified version with a user interface to *display* a notice. The standard licence permits requiring that existing notices be *preserved*, not that new ones be created, and it says elsewhere in as many words that a modified work need not add such notices where the original had none. It now requires that where a modified version already shows legal notices, the original author's name is kept among them.
- **A modified version may no longer misrepresent where this software came from**, and the trademark condition now says plainly that naming this project in order to describe honestly what a fork was derived from is not itself prohibited, provided it does not suggest this project endorses the result.

### Added
- **The author's name may not be used to endorse or promote a product built from this software** without permission. Nothing else in the licence covered this: the project's trademarks are protected whether the licence mentions them or not, but a personal name has no such protection, and another condition requires that name to stay in the source code.
- **Anyone who resells this software with a warranty or support contract of their own covers any liability those promises impose on the original author.** The standard licence already permits a reseller to make such promises; this makes clear they are theirs to stand behind.

## v0.18.20 (July 31, 2026)

The version in the footer was the literal JSX text `Version 0.18.11`, hardcoded, derived from nothing. It was hand-bumped at every release through v0.18.11 on June 26 and then never again, so it stood still across eight releases while the app shipped 0.18.19. The disagreement was on screen the entire time: the footer said one number and the Changelog page, two clicks away, said another.

This is the first user-visible change since v0.18.16 — v0.18.17 through v0.18.19 were tooling and comments only.

### Fixed
- **The footer renders `CHANGELOG[0].version`**, the same source `AboutPage` and `ChangelogPage` already read. `APP_VERSION` in `src/core/models/constants.ts` was deliberately *not* used: it is the provenance stamp written into exported models, not a display value, and it has been stale before — it sat at 0.12.1 while the app shipped 0.18.15. Deriving from the changelog keeps one source of truth rather than making the footer the first consumer of a second one.

### Added
- **`src/__tests__/footer-version.test.tsx`.** Two assertions, because they fail at different moments. The render check fails when the footer stops agreeing with the changelog data. The source check fails the moment a version literal reappears in `AppFooter.tsx` at all — which is the assertion that matters, because a freshly hardcoded literal is correct on the day it is written and would not fail the render check until the *next* bump. That is precisely how this defect survived being written.

### Changed
- **`shipgate.config.json` no longer records a false premise.** Its `_versionConstant` note read that "AboutPage and ChangelogPage both render `CHANGELOG[0].version`" and concluded from that enumeration that the displayed version was covered transitively. The enumeration was incomplete, so the conclusion was wrong. The note now names all three surfaces and carries the correction beside it. No `extraVersionSurfaces` entry was added for the footer: there is no literal left in it to match, and adding one would re-introduce the second source of truth this release removes.

### Why the gate could not see it
The gate checks the surfaces it is told about, and both guards that might have caught this were pointed elsewhere. `changelog-surfaces.test.ts` ties the two changelog files to each other and never reads a component. The gate's version-surface block was told, in config, that no component displays a version — so it did not look. Transitive coverage is only ever as strong as the enumeration it rests on, and nothing was checking the enumeration. It was found by loading the built app in a browser during the v0.18.19 release, which is the one check that reads what is actually on screen.

## v0.18.19 (July 31, 2026)

Comments and tooling only — no functional, data, or interface changes. The app behaves identically to v0.18.18.

### Added
- **Every source file now carries the SPERT® Suite copyright header, and a test keeps it that way.** 118 files had none: 113 under `src/`, plus `src/index.css`, `eslint.config.js`, `vite.config.ts`, `vitest.config.ts` and `index.html`. Only five files already carried it, all added since v0.18.14. This repository was never a deliberate holdout — it simply did not exist yet on 2026-03-10, when one coordinated pass stamped roughly 1,300 files across six of the nine suite repositories. Its first commit was 2026-04-05.
- **`src/__tests__/copyright-headers.test.ts`.** It strips comment framing so one comparison covers `//`, `/* */` and `<!-- -->`, and requires all three lines. It also requires the comment to close: `index.html` and `src/index.css` are parsed by neither TypeScript nor the test runner, so an unclosed `<!--` would swallow the whole document with nothing else to notice. It reads untracked files as well as committed ones, so a missing header fails before the commit rather than after, and it asserts both a file-count floor and the exact set of directory categories it expects, so it cannot quietly degrade into a check of nothing.
- **`vite.config.*.timestamp-*` is now gitignored.** Vite leaves those at the project root if it is killed while bundling a TypeScript config, and the guard would scope one as a root config file and fail for a reason its message could not explain.

### Answered
- **`CLAUDE.md` had carried an open question since v0.18.14** — *"Copyright headers are inconsistent here — decide before bulk-editing"* — asking that the remaining files not be retrofitted without a deliberate call, because it is a large diff. That call has now been made, and the section records the decision rather than deferring it.

### Why the third line of the header matters
`LICENSE` adds four terms under GPL v3 Section 7 — attribution preservation, UI notice preservation, trademark reservation, and marking of modified versions. Section 7 requires a source file carrying such terms to either state them or say where they are found. The line `See LICENSE file in the project root for full license text.` is that notice. A file with no header at all gives a recipient no route to those clauses.

### Note on the guard
`tsconfig.json` excludes `src/**/__tests__/**`, so this guard is the one file in the repository the compiler never checks — confirmed by its absence from `tsc --listFiles`. It must stay in that directory, and it was typechecked standalone under full strictness instead. Every failure path was verified by mutation before it was trusted: a removed header, a two-line header, a deleted scope category, a stale exemption and an unclosed HTML comment each fail it by name.

## v0.18.18 (July 31, 2026)

Tooling only — no functional, data, or interface changes to the app itself. It behaves identically to v0.18.17.

The ship gate could only ever be told about **one** changelog file, so the in-app version history was invisible to it. That matters more here than in most of the suite: this app has no separate displayed version constant. `AboutPage` and `ChangelogPage` both render `CHANGELOG[0].version` from `src/components/shell/changelogData.ts`, so the newest entry in that file **is** the version users see on screen. A stale entry there is a wrong version displayed, not merely a missing note.

`shipgate.config.json` now declares that file as a `changelog.extraSurfaces` entry in `firstVersion` mode, so the gate fails if its newest entry parts company with `package.json`. This is deliberately redundant with `changelog-surfaces.test.ts`, which already ties the two together; both are kept, because the gate reports the disagreement at the release boundary with the fix named.

Each failure path was verified by mutation before the change was accepted — a drifted copy, a removed entry and a deleted file each fail the gate.

### Changed
- **The ship gate now checks the in-app changelog.** `changelog.extraSurfaces` added to `shipgate.config.json`; `scripts/shipgate.mjs` gains support for it and stays byte-identical across all nine suite repositories.

## v0.18.17 (July 31, 2026)

Tooling only — no functional, data, or interface changes to the app itself. It behaves identically to v0.18.16.

The ship gate added in v0.18.16 was told to run on "Node 24", written directly into the workflow file. That is not the same as the version this repository pins: it resolves to whichever 24.x release the runner happens to have, and the `.nvmrc` kept alongside the source was never consulted. The workflow now reads that file via `node-version-file`, so the version is stated in exactly one place instead of two that were free to drift apart — the same class of duplication that let `APP_VERSION` sit six minor versions stale until v0.18.16 caught it.

The version actually selected here is unchanged, because this `.nvmrc` names the `24` line rather than an exact release; that line-level pin is deliberate, so each build takes the newest secure patch. What changes is that `spert-admin-tool`, which caps at `24.15.x - 24.17.x` on purpose to avoid a Node ≥24.18 regression that breaks server-rendered pages, will have that cap honoured when it gains the same gate rather than silently overridden.

### Changed
- **CI resolves Node from `.nvmrc` rather than a hardcoded major.** `shipgate.yml` stays byte-identical across all nine suite repositories — `setup-node` resolves the path per repository, so no per-repo divergence was needed.

## v0.18.16 (July 29, 2026)

Release-process hardening, and a real defect it found. `APP_VERSION` in `src/core/models/constants.ts` read `0.12.1` while the app shipped 0.18.15 — six minor versions of drift. It is not displayed anywhere, which is why it went unnoticed: `AboutPage` and `ChangelogPage` both render `CHANGELOG[0].version`, so the visible version was always right. What `APP_VERSION` actually does is get stamped into every exported model as `appVersion`, by both `exportModel` and `exportAllModels` — so it is the provenance record on user data, and every model exported since v0.12.2 carries a version stamp naming a release it was not produced by. Files already exported cannot be corrected retroactively; exports from this release forward are correct, and `npm run shipgate` now fails if the constant ever parts company with `package.json` again. Separately, v0.13.0 existed in the in-app changelog but had never been written into `CHANGELOG.md`, so the repository's own record skipped from v0.13.1 to v0.12.2 for nearly three months; it has been backfilled verbatim from the data file. This release also adds the SPERT® Suite ship gate: `npm run shipgate` locally and the same script in CI on every pull request and push to `main` — the first continuous integration this repository has ever had. Until now a green check meant Vercel had built a preview, not that the tests had run, because nothing ran them. Three guards were added to the always-run suite, each verified to fail against the real defect before being trusted to pass. No functional, data, or interface changes to the app itself. Build clean, all 360 tests pass (up from 351), ESLint at its 23-warning baseline.

### Fixed
- **Exported models carried a stale version stamp.** `APP_VERSION` was `0.12.1` against a shipping 0.18.15. It is stamped into every export as `appVersion` (`exportModel.ts`, `exportAllModels.ts`), so the provenance line on exported files named the wrong release. Now `0.18.16`, and held to `package.json` by the ship gate.
- **v0.13.0 was missing from `CHANGELOG.md`.** The entry existed in `changelogData.ts` and rendered in the app, but the repository's changelog jumped from v0.13.1 to v0.12.2. Backfilled verbatim from the in-app data, and the two surfaces are now held together by a test.

### Added
- **`npm run shipgate` — the release gate.** Checks that `package.json`, both version fields in `package-lock.json`, `APP_VERSION` and the newest `CHANGELOG.md` entry all agree, then runs lint, tests and build. It reports every disagreement in one run rather than failing on the first.
- **Continuous integration.** `.github/workflows/shipgate.yml` runs the same `npm run shipgate` on every pull request and push to `main`, so the local gate and the automated gate cannot drift apart. Installs with `npm ci`, which refuses to run at all if the lockfile and `package.json` disagree.
- **A guard that the two changelog surfaces agree**, in both directions, and that no entry or section renders empty. This is what would have caught the missing v0.13.0.
- **A guard that `LICENSE` matches the canonical suite licence** — one SHA-256 of the licence body, normalised for the repository URL on line 4, which is the only line that legitimately differs across the nine repositories.
- **A guard that every static asset linked from source exists in `public/`.** A source scan rather than a component render, so it covers every link rather than only the ones a test happens to mount.

### Internal
- **Replaced a placeholder test that asserted nothing.** `e2e.test.ts` carried `it('CHANGELOG.md exists')` implemented as `expect(true).toBe(true)`, with a comment claiming the build verified it. The build never reads `CHANGELOG.md`. Real assertions now live in `changelog-surfaces.test.ts`.
- **ESLint is gated on its warning count, not its exit code.** `eslint .` reports 23 warnings and 0 errors here, so it exits 0 and a new warning would have slipped through unnoticed. The gate now holds the number at 23.

## v0.18.15 (July 29, 2026)

Licensing — the `LICENSE` file now reserves the SPERT® brand explicitly, and this repository's copy has been brought back into line with the suite original. The license has always required that the original author attribution be preserved, but it said nothing at all about the brand, which left room to read the GNU GPL v3's redistribute-and-modify freedom as carrying the *name* along with the code; that was never the intent. Two clauses were added to the ADDITIONAL TERMS section: a **Trademark Reservation** under GPL v3 §7(e), naming "SPERT", "Statistical PERT" and "Estimation Made Easy" as trademarks registered with the USPTO and "GanttApp" and "MyScrumBudget" as unregistered common-law marks, and granting no right to use any of them — whether alone, in combination with other words such as "SPERT Suite", or as a logo — and a **Marking of Modified Versions** clause under GPL v3 §7(c), requiring any fork to adopt a name that cannot reasonably be confused with those marks. Together they draw the line the license always meant to draw: the code is free to take, change and redistribute, the author attribution has to travel with it, and the brand stays behind. Both clauses fall inside the categories GPL v3 Section 7 permits, which matters — Section 7's closing paragraph lets a recipient strip any additional term falling *outside* that list, as a "further restriction" — and the section header now cites Section 7 rather than Section 7(b), because the terms draw on 7(b) for attribution, 7(c) for renaming modified versions and 7(e) for the trademark reservation. Two defects in this repository's copy were fixed in the same pass: line 1 read "Statistical PERT® Software Suite", the pre-v1.4 brand name, rather than "SPERT® Suite"; and the additional terms were still the original numbered `1.`/`2.` wording, which omitted both the prohibition on removing, obscuring or *replacing* the author attribution with another name and the requirement that the user-interface notice appear in a visible and accessible location with a link to the original repository where feasible. The GNU GPL v3 text itself was already verbatim and complete here and is unchanged. The file is now a byte-for-byte copy of the canonical license in the SPERT® Suite landing-page repository, its single source of truth, differing only in the project repository URL on line 4; of the nine suite repositories audited, only MyScrumBudget was an exact copy beforehand. No functional, data, or interface changes — the app behaves identically to v0.18.14. Build clean, all 351 tests pass, ESLint clean.

## v0.18.14 (July 29, 2026)

Bug fix — the collaborator list showed a truncated internal account ID instead of a name. `useProfiles` resolved display names against `spertahp_profiles` only; that document is written on *this* app's sign-in, whereas the cross-app invitation Cloud Function resolves an invitee **by** their `spertsuite_profiles` document and then writes only `members.{uid}`, never seeding a per-app profile. Anyone who had used another SPERT® app but never opened SPERT AHP therefore had no per-app profile, and `SharingSection` fell through to `` `${c.userId.slice(0, 8)}…` `` — a truncated raw Firebase Auth UID. The hook now falls back to `spertsuite_profiles/{uid}` when the per-app document is absent; both carry the same payload, and `firestore.rules` already permits `get` on the suite mirror for any authenticated user, so no rules change and no data backfill were required — affected collaborators render correctly on next load. Strictly a fallback: the per-app document still wins and the mirror is not read when it is present, and the existing current-user short-circuit still issues no Firestore read at all. Guarded by four new cases in `src/hooks/__tests__/useProfiles.test.ts`; two fail with the fix reverted. Suite-wide defect rather than an AHP quirk — first found in SPERT Story Map v0.49.3.

## v0.18.13 (July 26, 2026)

Repository maintenance — removes this repository's local copy of `firestore.rules`. Firestore security rules are deployed from the Firebase Console and mirrored in the SPERT® Suite landing-page repository, which is their single source of truth; the copy kept here was never deployed from and could only drift out of date. It was never bundled into the app, so cloud behaviour is unchanged. Also resynchronises `package-lock.json`, which had been left at 0.18.11 while `package.json` read 0.18.12 — both now read 0.18.13. No functional, data, or interface changes. Build clean, all 347 tests pass.

> Note: v0.18.12 shipped without a changelog entry; this entry does not attempt to reconstruct it.

## v0.18.11 (June 26, 2026)

Tooling — upgrade ESLint to 10.2.1, matching the suite standard (SPERT Story Map). ESLint 10 requires Node ≥20.19 / 22.13 / 24, which the v0.18.10 Node 24 adoption unlocked. Bumps `eslint` 9.39.4 → 10.2.1, `@eslint/js` → 10.0.1, `eslint-plugin-react-hooks` → 7.1.1 (adds the ESLint 10 peer), and `globals` → 17.5.0; `typescript-eslint` stays pinned at 8.62.0 for TypeScript 6. The stricter react-hooks 7.1.1 `recommended` set surfaced pre-existing patterns as warnings (11 → 23) — the gate fails on errors only, so all remain non-blocking. Build clean, all 347 tests pass.

### Internal — tooling
- **ESLint 9.39.4 → 10.2.1** (`@eslint/js` 10.0.1, `eslint-plugin-react-hooks` 7.1.1, `globals` 17.5.0). `typescript-eslint` kept at 8.62.0 (TypeScript 6 support — Story Map's 8.59.0 would regress it). Unlocked by the Node 24 runtime adopted in v0.18.10.
- **`react-hooks/refs` set to `warn`:** react-hooks 7.1's compiler-based rule taints hook return objects that bundle a ref (e.g. `useImportState` returns `fileInputRef` alongside `phase`/`importError`) and false-flags ordinary member access during render. Downgraded to a warning, matching how `set-state-in-effect` is handled.
- **One `no-useless-assignment` suppression** in `useImportState.ts`, where a variable initializer is required for TypeScript definite-assignment but ESLint 10's flow analysis can't see the throw-before-assign path and flags it as useless.
- ESLint 10 enables `reportUnusedDisableDirectives` by default — stale disable comments now surface as warnings.

## v0.18.10 (June 26, 2026)

Infrastructure — adopt Node.js 24 LTS. Declares the runtime explicitly for the first time: a new `engines.node` of `24.x` and a new `.nvmrc` pinned to `24`. No application logic or dependencies changed; `@types/node` is left at its transitively-resolved version, and Vercel's build runtime is set to 24.x in the dashboard alongside this release. Build clean, lint clean, all tests pass.

### Infrastructure — runtime
- **Adopted Node.js 24 LTS:** added `engines.node` `"24.x"` (was unset) and created `.nvmrc` = `24`. Runtime declaration only — no source or dependency changes.

## v0.18.9 (June 23, 2026)

Tooling — ESLint added to the project, bringing AHP in line with the other SPERT Vite apps (SSV, Scheduler, Story Map), which all lint. The flat config mirrors that suite baseline — `typescript-eslint` (recommended) plus the React Hooks and React Refresh plugins — and adds a `lint` script (`eslint .`, errors-fail-only). `typescript-eslint` is pinned to 8.62.0 rather than the suite's 8.57.x because AHP is the first app on TypeScript 6.0.3, which 8.57's peer range (`<6.0.0`) excludes; 8.58+ widened it to `<6.1.0`. The first lint run surfaced 14 errors, all resolved in this patch. Build clean, all 347 tests pass.

### Internal — tooling
- **Added ESLint 9.39.4 (flat config) with the suite-standard lean base:** `typescript-eslint` 8.62.0, `eslint-plugin-react-hooks` 7.0.1, `eslint-plugin-react-refresh` 0.5.2, `globals` 17.4.0. New `"lint": "eslint ."` script; `dist/` and `.claude/**` (Claude Code worktrees) are ignored. The DevOps dashboard's presence-derived ESLint badge now reads 9.39.4 for AHP.
- **`typescript-eslint` pinned to 8.62.0 for TypeScript 6 support.** The suite-wide 8.57.x caps its TypeScript peer at `<6.0.0`; AHP runs TS 6.0.3. 8.58.0 widened the peer to `<6.1.0`, so 8.62.0 (latest in the 8.x line) installs cleanly without `--force`.
- **Cleared 14 lint errors from the first run.** Removed two inert `@next/next/no-img-element` disable comments in AppHeader (AHP is Vite, so the Next rule does not exist); suppressed `react-hooks/refs` on the intentional latest-value ref syncs in `useMatrix` and `useBufferedField` (a documented stable-mutable-ref pattern whose `useEffect` alternative would stale the refs in synchronous cleanup); suppressed one `react-hooks/purity` false positive on a click-handler `Date.now()` in ThresholdConfigurator; replaced five `as any` casts in `LocalStorageAdapter.test.ts` with typed casts (`DisagreementConfig`, `Partial<SynthesisBundle>`, narrow shapes); and removed a dead test helper plus a now-unused `exhaustive-deps` directive.
- **11 React Hooks / React Refresh warnings left visible (non-blocking).** `react-refresh/only-export-components` (context files), `react-hooks/set-state-in-effect`, and `react-hooks/exhaustive-deps` remain as warnings for later cleanup; the `lint` gate fails on errors only.

## v0.18.8 (June 23, 2026)

Maintenance — React upgraded across a major version, 18.3.1 → 19.2.5. The five React packages (react, react-dom, react-is, @types/react, @types/react-dom) moved atomically. The app already uses the React 19-correct `createRoot` API with no legacy call sites, so the only source change was a single ref-type annotation — `tsc -b` and all 347 tests pass unchanged.

### Internal — framework
- **React upgraded 18.3.1 → 19.2.5 (major).** `react`, `react-dom`, `react-is` → 19.2.5; `@types/react` → 19.2.14; `@types/react-dom` → 19.2.3 (atomic). One type-only change — `useImportState`'s `fileInputRef` is now `RefObject<HTMLInputElement | null>` to match React 19's `useRef(null)` return. The app already uses `createRoot`, with no `ReactDOM.render`, `findDOMNode`, string refs, or no-argument `useRef`. `@vitejs/plugin-react` 4.7.0 imposes no React peer; `@testing-library/react` 16.3.2 supports React 19.

## v0.18.7 (June 23, 2026)

Maintenance — recharts upgraded across a major version, 2.15.4 → 3.8.1. recharts 3 drops its bundled lodash dependency (replaced internally by es-toolkit), removing that transitive lineage entirely; the lodash advisory itself was already cleared via a patched release in v0.18.3. `react-is` is added as a direct dependency to satisfy recharts 3's new peer requirement. The two consuming charts (SensitivityChart, VoterRadarChart) use only stable public props.

### Internal — charting
- **recharts upgraded 2.15.4 → 3.8.1 (major).** Drops bundled lodash (→ es-toolkit); adds a redux-toolkit-based internal state layer (no app-level `<Provider>` needed). Production bundle is slightly smaller (1,190 → 1,157 kB).
- **Added react-is 18.3.1 as a direct dependency** to satisfy recharts 3's required `react-is` peer (matches the React 18 runtime).
- **SensitivityChart Tooltip formatters coerced via `Number(v)`.** recharts 3 widens the Tooltip `formatter` value to `ValueType` and `labelFormatter`'s label to `ReactNode`; the two callbacks now coerce with `Number(v)` for type compatibility (behavior unchanged). The LineChart (with crossover ReferenceDots) was verified rendering under recharts 3.

## v0.18.6 (June 23, 2026)

Maintenance — TypeScript upgraded across a major version, 5.9.3 → 6.0.3. The build (`tsc -b`) and all 347 tests pass unchanged. The single side-effect CSS import in `main.tsx` is covered by Vite's ambient client types, so no tsconfig changes were needed. TypeScript is a dev/build-time tool with no runtime footprint.

### Internal — tooling
- **TypeScript upgraded 5.9.3 → 6.0.3 (major).** `tsc -b` builds clean with the existing strict tsconfig; no `ignoreDeprecations` shim or new ambient declarations required.

## v0.18.5 (June 23, 2026)

Maintenance — jsdom (the test-only DOM environment) upgraded across a major version, 25 → 29. jsdom 29 replaces its bundled `ws` and `form-data` dependencies with `undici`, removing that transitive lineage entirely. The `ws`/`form-data` advisories themselves were already cleared via patched releases in v0.18.3; this upgrade removes the dependencies so the lineage cannot reappear. No application code changed; jsdom is a devDependency.

### Internal — test environment
- **jsdom upgraded 25.0.1 → 29.1.0 (major).** Drops the bundled `ws` and `form-data` transitive dependencies (replaced by `undici`). All 30 test files / 347 cases pass unchanged under jsdom 29.

## v0.18.4 (June 23, 2026)

Version tag — the vitest and Tailwind upgrades that pre-landed in the v0.18.3 lockfile regen are tagged to this release for changelog attribution. No dependency or application code changed since v0.18.3.

### Internal — maintenance
- **Version tag for vitest 4.1.4 → 4.1.5 and tailwindcss / @tailwindcss/vite 4.2.2 → 4.2.4.** These versions were pre-pinned and installed in v0.18.3 (ahead of the lockfile regen); this release is their canonical changelog attribution.

## v0.18.3 (June 23, 2026)

Dependency security — Firebase moved to 12.12.1 and the Firestore transitive cluster (protobuf.js, `@grpc/grpc-js`) was cleared via npm overrides and a full lockfile regeneration. Four soaking-version pins were applied ahead of the regen so it could not float any caret-ranged dependency to an unsoaked release. No application code changed.

### Dependency security
- **Firebase upgraded 12.11.0 → 12.12.1.** Advances `@firebase/firestore` 4.13.0 → 4.14.0.
- **npm overrides added (`protobufjs` ≥7.6.3, `@grpc/grpc-js` ~1.9.16) plus a full lockfile regen.** Clears the critical protobuf.js advisory cluster, the high `@grpc/grpc-js` crash advisories, and the moderate `@protobufjs/utf8` overlong-UTF-8 advisory from the Firestore subtree. `@protobufjs/utf8` is not overridden directly — protobuf.js 7.6.4 depends on the patched `@protobufjs/utf8` ^1.1.1, so the override pulls it through the dependency chain.
- **Remaining transitive advisories refreshed.** The full regen also floated `postcss`, `@babel/core`, `ws`, `form-data`, and `lodash` to patched releases; `npm audit` now reports only the chronically-deferred `esbuild` low advisory (Windows dev-server only).

### Internal — dependency pre-pins
- **Pre-pinned vitest 4.1.4 → 4.1.5, tailwindcss 4.2.2 → 4.2.4, @tailwindcss/vite 4.2.2 → 4.2.4** ahead of the lockfile regen (these versions are tagged in v0.18.4).
- **Pinned @types/react to exact 18.3.28** (ceiling-pin; stays on React 18 types until the React 19 upgrade).

## v0.18.2 (June 23, 2026)

Security patch — Vite moved to 7.3.5 to close the two Windows-only, dev-server-only advisories deferred in v0.18.1. No application code changed; Vite is a devDependency and is never shipped to production.

### Dependency security
- **Vite upgraded 7.3.2 → 7.3.5.** Clears GHSA-v6wh-96g9-6wx3 (`launch-editor` NTLMv2 hash disclosure via UNC paths) and GHSA-fx2h-pf6j-xcff (`server.fs.deny` bypass on Windows alternate paths), both affecting Vite 7.0.0–7.3.3. Vite 7.3.4 was never published, so 7.3.5 is the first patched 7.x release. `@vitejs/plugin-react` stays at 4.7.0; Vite 8 (Rolldown major) is deferred as a separate decision.

## v0.18.1 (June 19, 2026)

Dependency security update — Vite and Vitest moved to current major versions to pick up upstream security fixes. The upgrade ran in two isolated steps (Vitest 2→4 first, then Vite 6→7) so any regression would be attributable to a single jump. No application code changed and the production runtime is untouched; both packages are devDependencies.

### Dependency security
- **Vitest upgraded 2.1.9 → 4.1.4.** The two-major jump (2→3→4) cleared with zero test changes — all 30 test files and 347 cases pass unchanged, including the heavy mock and fake-timer usage (`vi.fn`, `vi.mock`, `vi.spyOn`, `vi.useFakeTimers`, `mockRestore`) that the v3 behavioral changes (stricter `toEqual`/`toThrow` error equality, `mockReset()` restoring original implementations, fake timers mocking `performance.now()`) could have affected.
- **Vite upgraded 6.4.1 → 7.3.2.** The production build was re-verified clean on Vite 7. `@vitejs/plugin-react` was deliberately held at 4.7.0, which already supports Vite 7 — its 6.x line was avoided because it requires Vite 8.
- **Duplicate Vite 5.4.21 removed from the dependency tree.** Vitest 2's `vite-node` pulled a second Vite into the tree; Vitest 4's module runner eliminates it, leaving a single deduplicated Vite.
- **Two Windows-only Vite advisories remain deferred to a follow-up around July 31, 2026.** GHSA-v6wh-96g9-6wx3 (`launch-editor` NTLMv2 hash disclosure via UNC paths) and GHSA-fx2h-pf6j-xcff (`server.fs.deny` bypass on Windows alternate paths) affect Vite 7.0.0-7.3.3. Both are dev-only (Vite is never shipped to production) and Windows-only; closing them requires moving past 7.3.3, which is scheduled separately.

### Internal — test infrastructure
- **`vitest.config.ts` now excludes `dist/` and `.claude/` from test discovery.** Vitest 4 relaxed its default excludes to only `node_modules` and `.git`; without an explicit exclude the runner picked up build output and local Claude Code worktree copies under `.claude/`, inflating the suite from 30 files to 126. No test logic changed.

## v0.18.0 (May 25, 2026)

Cloud storage correctness — sign-out cleanup, real-time matrix sync, focus-guarded text fields, access-revoked eviction, and synthesis generation guard.

### Cloud storage correctness
- **External sign-out (token expiry, server-side revoke, account deletion in another tab) now runs the same cleanup pipeline as user-initiated sign-out.** Previously, the `onAuthStateChanged(null)` branch only set user to null, leaving PII in localStorage and the storage mode at cloud.
- **Cloud sign-out clears local project data (`ahp/modelIndex`, `ahp/models/*`).** Previously a prior cloud user's decisions remained and could appear in the next user's migration prompt.
- **Comparison saves flush immediately on `pagehide` and `beforeunload`.** Previously a user who closed the tab within the debounce window would silently lose their last judgment.
- **Comparison save debounce is cancelled explicitly via the sign-out registry**, ensuring cancellation regardless of whether ComparisonPanel is currently mounted.
- **Matrix comparisons update in real time when a collaborator's snapshot arrives.** Previously `useMatrix` seeded state once on mount and ignored all subsequent prop changes.
- **Title, goal, and item-label inputs are protected by a focus guard** — a collaborator's snapshot no longer clobbers text the user is actively typing. Navigating to another tab while a field is focused commits the in-progress draft. Enter now commits item labels without requiring blur.
- **When a collaborator's access is revoked while they have a decision open, the snapshot error now triggers a state reset** removing the revoked model from memory.
- **Synthesis computation checks a generation counter after each storage await** — a sign-out during a multi-voter synthesis no longer writes to a revoked session.
- **`updateModel` and `updateStructure` now include `schemaVersion` in every Firestore update payload.**

## v0.17.0 (May 24, 2026)

Cloud import readiness gate, import defensive hardening, and legacy cleanup.

### Import — cloud hydration gate
- **Cloud decisions gate the Import button until the initial Firestore fetch completes.** Previously, signing in and immediately picking an import file would call `listModels()` against an empty local cache, silently missing all conflicts. The Import button is now disabled with an amber hint banner ("Cloud decisions are still loading…") until the first `listModels()` resolves. Mid-preview storage changes continue to abort the import flow as before.
- **Confirm Import and Confirm Replace now check cloud readiness as a secondary guard.** If the cloud fetch has not completed when the user confirms, they receive a clear error rather than proceeding against a stale conflict map.
- **`StorageContext` resets cloud-readiness atomically with the adapter swap.** No render window exists between "new adapter" and "Import button disabled."

### Import — defensive hardening
- **`runApply` exit logic moved to `finally` block.** `applyActiveRef` and `runApplyEnteredRef` resets are now guaranteed to run regardless of throw.
- **`aria-busy` added to Import button during `applying` and `parsing` phases.** Screen readers announce in-progress states correctly.
- **Result and error banners use `role="alert"` (errors) or `role="status"` (success).** Screen readers announce import outcomes without requiring navigation to the banner.

### Import — legacy cleanup
- **`importModel()` removed.** The pre-v0.16.0 single-shot import function had no production callers after v0.16.0's `applyImportMerge` introduction. Its 9 tests have been migrated to the current `parseAndClassifyImport + buildBundleFromEnvelope` path or deleted where already covered. Consolidates the duplicated UID-remap logic behind `buildBundleFromEnvelope`.

## v0.16.1 (May 24, 2026)

About page polish — renames the QRG download button to match the canonical label shared across all SPERT® Suite apps.

### About page
- Renamed the QRG download button from `Open PDF` to `Open Quick Reference Guide (PDF)` so the label matches the convention used by SPERT® Forecaster, MyScrumBudget, and the rest of the suite.

## v0.16.0 (May 19, 2026)

Level 4 import upgrade. Closes a live incompatibility where the Export All button produced files the Import button refused to read, adds a per-model conflict-resolution preview, and hardens the cloud-side replace path with transaction-level owner enforcement.

### Import — Level 4 upgrade
- **Bundle format now imports.** Previously, importing a file produced by Export All failed with `Missing required field 'spertAhpExportVersion'` because bundles carry the distinct top-level field `spertAhpBundleVersion`. `parseAndClassifyImport` now recognizes both formats; the same Import button handles single-decision and bundle files transparently.
- **Bundles with invalid envelopes no longer abort the entire import.** Each invalid envelope (untitled drafts, oversized payloads, malformed shape) is surfaced as a red row in the preview with a specific error message, while valid envelopes can still be imported.
- **One-click vs. two-click by storage mode.** In local mode, a conflict-free single-decision import completes in one click with no confirmation. In cloud mode, the preview panel is always shown because Firestore's local cache may return an empty `listModels()` immediately after sign-in.
- **Per-model conflict detection.** ID match and normalized-title name match. All conflicts default to `skip`; the user must affirmatively select `add` or `replace`. `Replace` is gated on ownership — `Cannot replace … — you are not the owner` for editor/viewer roles; `Cannot replace … — multiple existing decisions share this name` when normalized-title matches are ambiguous.
- **Replace-All confirmation modal.** Final guard before destructive writes. If two selections target the same existing decision, only the first applies (disclosed in modal). Modal Cancel returns to the preview panel.
- **Replace preserves sharing and identity.** Cloud editors/viewers remain members. Collaborators' prior judgments are not carried over (the new structure may not align with their existing comparisons). Original `createdAt`, `createdBy`, and `_originRef` are preserved. Pre-replace `_changeLog` is replaced by the imported model's provenance — known limitation noted in the implementation plan.
- **Owner-only replace enforced in the Firestore transaction**, not just the UI. An editor or viewer calling `replaceModelFromBundle` directly will be rejected at the database layer with `Only the project owner can replace this decision.`
- **Byte-accurate size enforcement.** 10 MB outer cap, 900 KB per envelope, measured in UTF-8 bytes via `TextEncoder`. The previous character-count approach could let non-ASCII payloads (CJK titles, emoji) exceed Firestore's 1 MB document limit.
- **Result banner.** Per-action counts (added, replaced, skipped, failed) plus per-model error reasons. When exactly one decision is written with no errors or skips, the imported decision auto-opens without a banner. All-skip shows the count rather than silently closing the import flow.
- **New `parsing` phase** covers the file-pick + Layer-1-detect window; the Import button is disabled across `parsing`, `preview`, `replace-confirm`, and `applying`, closing the silent-drop window when a user re-clicks Import mid-read.
- **Mid-apply storage swap surfaces a banner.** If sign-in triggers a storage flip during an in-flight import, the user now sees an explicit "Storage mode changed during import — verify your decisions list" rather than the apply silently completing against the prior storage. Auto-load and `spert:models-changed` are suppressed in this path.
- **`ModelIndexEntry.role`** added as a required field. Local mode emits `'owner'`; cloud mode resolves from the doc's `members.{uid}` map.
- **StrictMode mount-ref fix.** Caught during live-UI verification: the `isMountedRef` cleanup callback used a setup-returns-cleanup pattern that never re-set `current = true`. Under React.StrictMode's dev double-invoke (mount → cleanup → mount), the ref stayed `false`, silently swallowing the `setPhase(banner)` at runApply exit. Live UI appeared stuck on "Importing…" with no banner even after the write completed. Fixed: setup now explicitly sets `current = true`. Regression test added under `useImportState — StrictMode mount safety`.

### Known cloud-mode limitation
- Immediately after sign-in, the cloud model list may not be fully populated. Importing during this window can miss conflicts that exist server-side. Wait a moment after sign-in before importing if you have many shared decisions. A hydration-aware fix (FirestoreAdapter exposing a hydration signal) is planned for v0.17.0.

### Tests
- New `src/storage/__tests__/import-utils.test.ts` (33 tests) — parse classification, byte-accurate size caps, conflict detection (single match / multi-candidate / role gating / empty-title exclusion), `conflictMapsEqual` field coverage, `applyImportMerge` add/skip/replace/dedup/Layer-2-abort/all-skip.
- New `src/storage/__tests__/FirestoreAdapter.replace.test.ts` (9 tests) — `runTransaction` owner gate, snap-not-found rejection, identity-field preservation, fresh response slot creation with bundle's `structureVersionAtSubmission`.
- New `src/hooks/__tests__/useImportState.test.tsx` (13 tests) — phase machine end-to-end, **C1 regression** (AD-9 fast-path actually writes — not falsely blocked by reentrancy guard), C2 bundle parse-error surfacing, banner dismiss, cancel-from-replace-confirm, **StrictMode mount regression** (covers the `isMountedRef` cleanup-only bug below).
- `LocalStorageAdapter.test.ts`: 5 new tests for `replaceModelFromBundle` (existence check, identity preservation, collaborator/response replacement, modelIndex update).
- `exportImport.test.ts`: 5 new tests for bundle round-trip, the v0.15.x bundle-rejection regression, empty-title parse-error surfacing, and oversized per-envelope enforcement.

### Architecture
- New file `src/storage/import-utils.ts` — pure functions for parse/classify/conflict-detect/apply.
- New file `src/hooks/useImportState.ts` — phase-based discriminated union with separated `applyActiveRef` and `runApplyEnteredRef` (the latter prevents external pre-sets from falsely tripping the reentrancy guard).
- New file `src/components/setup/ImportPreviewSection.tsx` — preview / replace-confirm / banner / parsing / applying rendering with a shared `PerModelDecisionRows` subcomponent.
- New adapter method `replaceModelFromBundle(existingModelId, bundle)` on both `LocalStorageAdapter` and `FirestoreAdapter`. Firestore variant wraps a `runTransaction` matching the v0.15.0 audit-finding-#2 pattern.
- New exports on `importModel.ts`: `buildBundleFromEnvelope`, `generateModelId`. The single-shot `importModel()` retains its current UID-remap logic unchanged; consolidation tracked for v0.17.0.

## v0.15.0 (May 9, 2026)

Independent v0.14.0 security and code-quality audit produced 7 actionable findings; v0.15.0 ships 6 targeted fixes plus a comment-only doc update for the deferred trade-off. No new dependencies, no structural changes to auth, storage, or the invitation state machine.

### Fixed
- **Cross-user migration disclosure copy.** The migration-confirmation panel previously read "You have N local decisions. Upload to cloud?" — ambiguous on a shared browser, where local decisions persist across sign-out and could have been created by a previous user. New copy explicitly discloses that local decisions are device-scoped, not identity-scoped: "This device has N local decisions stored in your browser. Local decisions are not linked to any account — they may have been created by you or by a previous user of this browser. Upload them to your cloud account?" UI-only; no logic change.
- **`addCollaborator` and `updateCollaborator` now wrap caller-is-owner `runTransaction`s.** Mirrors the v0.14.0 three-guard pattern from `removeCollaborator`. `addCollaborator` adds Guard 1: caller-must-be-owner. `updateCollaborator` adds Guard 1: caller-must-be-owner; Guard 2: target-must-not-be-owner (the owner role is a fixed point). Both guards throw plain `Error` so `SharingSection` surfaces `err.message` directly. The transactional wrapper also eliminates the previous read-modify-write race where two concurrent owner-side adds could each clobber the other's `collaborators[]` write.
- **`reorderModels` now filters caller-supplied `orderedIds` against actual membership.** Previously a malformed or maliciously-constructed list would hit the `writeBatch` and fail partway as Firestore rules rejected foreign writes. The client-side filter (using the same `where('members.{uid}', 'in', […])` query as `listModels`) reduces this to a clean no-op for unauthorized ids.
- **`performSignOutWithCleanup` now clears the sessionStorage invite token.** Previously `spert:pendingInviteToken` survived sign-out, so the next user on the same tab could see a spurious "you've been added" banner driven by the previous user's invite-link landing. Imports `INVITE_SESSION_KEY` from `captureInviteTokenFromUrl.ts` and `removeItem`s inside a try/catch (sessionStorage may be unavailable in private/embedded contexts).
- **`registerSignOutCleanup` now returns a deregister handle.** The module-level callbacks array previously grew on every remount (StrictMode double-invoke, route reset, error-boundary recovery) and accumulated closures over stale React state. Both production registrations (`App.tsx` for `closeModel`, `StorageContext.tsx` for storage-mode reset) now return the deregister from their `useEffect` cleanup.
- **`'ahp/hasUploadedToCloud'` consolidated behind `migration.ts` exports.** The literal previously appeared as a duplicated `const HAS_UPLOADED_KEY` in both `migration.ts` and `performSignOutWithCleanup.ts`, plus a bare string in `StorageSection.tsx`. `migration.ts` now exports `HAS_UPLOADED_KEY` and a new `setHasUploadedFlag()` helper; the other two sites import from there. Renaming the key now requires editing one source-of-truth instead of three.

### Documented (intentionally not changed)
- **`useAHP.saveComparisons` non-rollback on storage failure.** The optimistic local dispatch is intentionally not rolled back — the `SET_ERROR` dispatch ("Save failed — you may have been signed out. Reload to continue.") is the user-visible signal, and rolling back would require snapshotting prior response state and reverting on catch. New comment near the optimistic dispatch in `useAHP.ts` documents the trade-off explicitly.

### Tests
- New `performSignOutWithCleanup` test asserting `INVITE_SESSION_KEY` is cleared on sign-out.
- New `signOutCleanupRegistry` tests covering the deregister handle: removes only the specified callback, idempotent under double-deregister, does not affect callbacks registered after deregistration.
- `beforeEach` in `performSignOutWithCleanup.test.ts` now clears `sessionStorage` for hermetic runs.

### Out of scope (flagged, not done)
- No FirestoreAdapter unit tests added for the new transactional guards. The codebase has no FirestoreAdapter test infrastructure; the `removeCollaborator` precedent (also unguarded by unit tests) is matched. Manual smoke during the verification pass exercises the owner / non-owner / target-is-owner branches.
- No server-side change. The deployed Firestore rules already enforce owner-only mutations at the database layer; the new app-side guards add UX (clear error messages) and defense-in-depth.
- `checkReturningUserConsent` fail-open behavior unchanged — already documented in source.
- `subscribeModel` silent permanent-failure surface unchanged — carry-forward from v0.13.1, blocked on the notification provider gap.
- `writeUserProfile` per-load writes unchanged — out of scope for this release.
- No dependency upgrades.

## v0.14.0 (May 8, 2026)

Bulk-sharing retrograde audit — three-PR series closing 11 confirmed gaps against the canonical Story Map / MyScrumBudget references. Touches `removeCollaborator` data-integrity guards, the entire invitation-landing hook state machine, the `parseBulkEmails` return shape, the callable wrapper layer, and the InvitationBanner visual treatment.

### Fixed
- **`removeCollaborator` now wraps a three-guard `runTransaction`** (Lesson 50). Previously a single `getDoc` + `updateDoc` with zero guards. Guard 1: self-removal pre-check fails fast before the transaction. Guard 2: caller-must-be-owner check inside the transaction (defense-in-depth — UI is owner-gated, this catches a gating bypass). Guard 3: target-must-not-be-owner — prevents removing the project owner. Guards throw plain `Error` and `SharingSection.handleRemove` surfaces `err.message` directly. Atomic write preserves prior behavior — prunes embedded `collaborators` array, drops `members[userId]`, bumps `updatedAt`; response slot intentionally left intact so a re-added collaborator's prior judgments are preserved.
- **`useInvitationLanding` rewritten to match the canonical Story Map 3-state machine** (Lessons 7, 27, 59). The hook now has four explicit effects: URL capture (Effect 1), sessionStorage rehydrate (Effect 2), `spert:models-changed` listener with **SESSION_KEY gate** (Effect 3), and **30-second grace timer** with consume-before-transition (Effect 4). The prior immediate `pre_auth → idle` on user sign-in is replaced by the 30s timer, giving the claim CF time to resolve (cold start ≈5–15s) before stranding the banner. SESSION_KEY gate prevents a returning user with cached pending invitations from seeing a spurious "you've been added" banner on normal sign-in. AHP's discriminated-union state shape (`{tokenId}` on `pre_auth`, `{modelNames}` on `claimed`) preserved so `InvitationBanner`'s render contract is unchanged.
- **Cloud auto-flip on invite-link landing now gates on `hasLocalProjects()`** (Lessons 28, 53). Previously, clicking `?invite=` unconditionally called `switchMode('cloud')`, silently orphaning any existing local projects on the device. New `StorageAdapter.hasLocalProjects(): Promise<boolean>` capability — implemented on both adapters, both reading `localStorage['ahp/modelIndex']` (local-project presence is mode-independent). Hook Effect 1 wraps `switchMode` in a fire-and-forget `hasLocalProjects` check; flip is skipped when the device already has any local projects.
- **`parseBulkEmails` returns `{valid, invalid}` with `EMAIL_RE` validation** (Lessons 42, 43). Previously returned `string[]` with no format validation — invalid-format tokens silently passed through to the CF. The shape change is coupled with `SharingSection`: nothing valid → no CF call (textarea retained); after the call → textarea clears only when `added + invited > 0`; invalid-format tokens surface as "Invalid N: …" alongside Added / Invited / Skipped in the existing result summary.
- **`SharingSection` now renders an explicit error state when the collaborators fetch fails** (Lesson 60). Previously a failed model load left `ahpState.collaborators` empty and the section disappeared silently — users couldn't tell whether they lacked permission or whether the load broke. Four-state `OwnerStatus` (`loading` / `owner` / `not-owner` / `error`) derived from existing `ahpState` fields with no reducer changes; the `error` state renders a visible "Couldn't load sharing details. Refresh the page to try again." alert.
- **Post-send refresh in `SharingSection` now uses `Promise.allSettled` instead of sequential awaits** (Lesson 64). Previously a `loadModel` rejection skipped the `refreshPending` call entirely; either list could be stale but never both updated independently. Per-rejection `console.warn` surfaces the cause without blocking the other refresh.
- **`InvitationBanner` restyled to a centered card** (Lesson 56). `max-w-lg` + `mx-auto` + `p-5` + `rounded-lg` + `shadow-sm`; dismiss button anchored `absolute top-2 right-2` with `pr-6` inner content offset so text never runs under it at narrow widths.

### Added
- **`src/lib/callables.ts`** — centralized callable wrapper layer with `requireFunctions()` that throws a meaningful error when Firebase Functions is not configured (Lesson 61). Replaces the five `getXxx` factory exports + per-site null checks pattern. Each `call*` wrapper unwraps `r.data` so callers consume the result directly. Five wrappers: `callSendInvitationEmail`, `callClaimPendingInvitations`, `callRevokeInvite`, `callResendInvite`, `callUpdateInvite`.
- **`src/lib/captureInviteTokenFromUrl.ts`** — extracted from `useInvitationLanding`'s Effect 1 for testability (Lesson 58). Optional `enabled` override, preserves URL fragment + non-`?invite=` query params on strip, idempotent. Six unit tests covering happy path, `enabled=false`, no-`?invite=`, idempotency, fragment preservation, and other-query preservation.
- **`src/lib/profileWrites.ts`** — extracted from `AuthContext`'s inline closure (Lesson 62). Two named exports: `writeSpertahpProfile` and `writeSpertsuiteProfile`, sharing a single `buildPayload()` helper. `updatedAt` placed last in the literal so a future spread cannot overwrite `serverTimestamp()` (Lesson 29). Seven smoke tests covering field shape, lowercased email, null fallbacks, `serverTimestamp` positioning, fire-and-forget contract, and cross-collection payload symmetry.

### Tests
- 251 passing across 24 test files (was 231 across 22). New: `parseBulkEmails` partition / all-invalid / malformed cases (3), `useInvitationLanding` SESSION_KEY gate / 30s grace timer / cleanup-races-claim / `hasLocalProjects` gate (4), `LocalStorageAdapter.hasLocalProjects` (2), `captureInviteTokenFromUrl` (6), `profileWrites` (7). `vi.mock('../callables')` surface added to `performSignOutWithCleanup` test as a forward-compat template (Lesson 21).

### Out of scope (flagged, not done)
- No server-side change. Firestore security rules already block owner self-removal at the database layer; the new app-side guards add UX (clear error messages) and defense-in-depth, not new safety.
- AHP's voting model (`isVoting` / `updateInvite`) is orthogonal to all changes in this series — verified untouched.
- No React 19 migration. AHP stays on React 18.3.1; lazy `useState` initializer (Lesson 66) does not apply.
- No dependency upgrades.

## v0.13.3 (May 3, 2026)

Suppress benign-but-noisy `claimPendingInvitations failed: functions/failed-precondition` console error fired on every page load for accounts whose IdP did not stamp `email_verified=true` on the token (Microsoft personal MSA accounts: `outlook.com` / `hotmail.com` / `live.com`).

### Fixed
- **`claimPendingInvitationsAndNotify` now gates on `firebaseUser.emailVerified`.** The Cloud Function (`spert-landing-page/functions/src/claimPendingInvitations.ts`) throws `HttpsError("failed-precondition", …)` whenever `request.auth.token.email_verified !== true` — Firebase callable v2 surfaces that as HTTP 400 with `code = "functions/failed-precondition"`, which `AuthContext.tsx` was logging as `console.error` on every auth resolution. The client now early-returns before the call when `emailVerified` is false, skipping the doomed network round-trip and the resulting console noise. All three call sites (consent-write branch, fast path, slow-path validated) updated to pass `firebaseUser` through. Google and Microsoft work/school accounts (the ones that *can* claim invitations) are unaffected — they still fire the call exactly as before.

### Out of scope (flagged, not done)
- No server-side change. The Cloud Function's `failed-precondition` defense is correct (invitation lookup is by email; an unverified email shouldn't claim) and stays.
- No dependency upgrades.

## v0.13.2 (May 3, 2026)

Form-hygiene residual sweep. After v0.13.1 added the two strictly-required `autoComplete` props, this pass closes the rest of the Chrome DevTools Issues panel form-field warnings — every `<input>`, `<textarea>`, and `<select>` in the app now carries an `id` or `name`, every visible `<label>` is associated with its control via `htmlFor`+`useId()` or implicit wrapping, and every form control without a visible label has an `aria-label`.

### Fixed
- **Every form control now has `id` or `name`.** Added `name` (semantic camelCase) to 17 inputs/textareas/selects across `GlobalSettingsPanel`, `DecisionPanel`, `ItemBuilder`, `ThresholdConfigurator`, `SharingSection`, `ManagePanel`, `PendingInvitesList`, `DashboardPanel`, `ConsentModal`, and `ComparisonInput`. Reused `name` values across visually distinct inputs are documented (`itemLabel` per SortableItem, `newItemLabel` across both ItemBuilder instances, pre-existing `storage-mode` for the radio group) — none coexist inside a real `<form>`.
- **Every visible `<label>` is now associated with its input.** Added `htmlFor` + `id` pairs (generated via `React.useId()`) on six label/input couples: `GlobalSettingsPanel` Name + Identifier, `DecisionPanel` Title + Goal, `ThresholdConfigurator` Agreement + Mild range sliders. The codebase had zero prior `htmlFor` usage, so the new pattern is established cleanly.
- **Decorative `<label>` in `ItemBuilder` converted to `<div>`.** The group heading "Decision Factors (N)" / "Alternatives (N)" was rendered as `<label>` despite labelling no specific input — Chrome flagged this as "No label associated with a form field." Now a `<div>`.
- **`aria-label` added to controls without visible labels** (in passing while touching them for `name`/`id`): legacy invite email + role select in `SharingSection`, per-collaborator role select + voting checkbox, both `ItemBuilder` add-item inputs and the SortableItem rename input (passed `itemLabel` prop down so the aria-label can read e.g. "Decision Factor 1 label"), and the `ComparisonInput` range slider (uses existing `mode`/`itemA`/`itemB` props for "Importance comparison: Cost vs Schedule").

### Out of scope (flagged, not done)
- No new shared `Field`/`FormField` wrapper component. The codebase has none, and per-call-site edits are the lighter touch.
- App-domain text inputs (decision titles, criterion/alternative names, threshold values, mixed-format identifier hints) deliberately did not get `autoComplete` — they don't collect a personal-data category the browser knows how to autofill.
- No dependency upgrades.

## v0.13.1 (May 3, 2026)

Hardening pass — three latent issues identified, two fixed in code and one documented.

### Fixed
- **`onSnapshot` listener now logs Firestore stream errors.** `FirestoreAdapter.subscribeModel` previously passed only a success callback to `onSnapshot`, so a transient permission revocation, network failure, or rules-eval rejection on the live model document would terminate the subscription silently with no diagnostic. Added an error callback that logs the Firebase error code and message with a `[FirestoreAdapter] subscribeModel error for {modelId}:` prefix matching the existing console-error style in `AuthContext.writeUserProfile`. No tracking-set cleanup was needed — the single subscription is owned by `useAHP`'s `useEffect` and torn down via React cleanup, not via a `Set` of active doc IDs.
- **`autoComplete` props on two form inputs.** Added `autoComplete="off"` to the collaborator-email input in `SharingSection.tsx` (the field collects *another* user's email, so the signer-in's saved email should not autofill). Added `autoComplete="name"` to the Export Attribution name input in `GlobalSettingsPanel.tsx` (the field collects the user's *own* name for export-metadata stamping). All other text inputs in the codebase carry app-domain labels (decision titles, criterion names, alternative names, identifier example-format hints) and are correctly excluded.

### Out of scope (flagged, not done)
- **Centralized error-notification surface.** A handful of Firestore writes — specifically the fire-and-forget profile updates in `AuthContext.writeUserProfile` (lines 123 and 126) — log failures to console only and never reach the user. Wiring them to a user-visible toast/banner would require introducing a notification provider that does not currently exist anywhere in the app (every other surfaced error is held in component-local React state and rendered as an inline banner). Building one as a side effect of a hardening pass is out of scope; logged for future work.
- No dependency upgrades.

## v0.13.0 (May 2, 2026)

### Changed
- Tab bar restructured: Dashboard | Decision | Compare | Results | Manage | Settings | About. The old Decisions tab — which shape-shifted between a hub and a workspace depending on whether a model was open — has been split into Dashboard (always-visible hub) and Decision (always-visible workspace). The Project tab has been renamed Manage and still appears only when a decision is open
- Dashboard redesigned as a responsive card grid with a + New Decision button in the header, mirroring the MyScrumBudget layout. Untitled drafts render with an italic "Untitled decision" placeholder so they are still browsable and deletable
- Title and Goal moved from the Dashboard create-form into editable inputs at the top of the Decision tab. Inputs commit on blur via updateModel; they remain editable at any point in the decision lifecycle (owner discretion — small typos and refinements should not require a new decision)
- Project Settings panel renamed to Decision Settings (Manage tab heading). Invitation-banner copy now reads "invited to a SPERT AHP decision" and "added to a shared decision" instead of "project"

### Added
- Auto-navigation when a decision is opened: clicking + New Decision, clicking a saved-decision card (including the currently-loaded one), or importing a JSON model now jumps the user straight to the Decision tab. Navigation is fired explicitly by DashboardPanel via an onDecisionOpened callback rather than a modelId-transition useEffect, so re-clicking the already-loaded card still navigates instead of silently no-op-ing
- Empty-state guidance on Decision tab when no decision is open: "No decision open" heading plus a Go to Dashboard button. The previous bounce-on-empty guard was removed so the user can land on Decision without a model and see this guidance instead of being redirected away

### Internal
- Deleted ModelSetup.tsx and split it into DashboardPanel.tsx (hub: card grid, create/import/export) and DecisionPanel.tsx (workspace: editable title/goal, tier selector, criteria/alternatives builders). Each new component now has a single responsibility and a smaller surface
- Renamed ProjectSettingsPanel.tsx → ManagePanel.tsx and updated its component/interface names to match. Updated the stale "any mounted ModelSetup re-runs listModels" doc-comment in AuthContext to point at DashboardPanel
- Simplified the App.tsx auto-advance useEffect from a two-job transition detector (open + close) to a close-only fallback (truthy → null while on a model-scoped tab). Forward navigation is now handled by an explicit callback prop, which is more predictable and easier to reason about

## v0.12.2 (May 2, 2026)

Security audit pass. No exploitable vulnerabilities in the deployed surface; three application-side hardening fixes shipped here. Two lower-severity findings in the landing-page Cloud Functions (invitation-token and modelId logged at info/warn) are tracked separately and will ship in a landing-page release.

### Fixed
- **Cross-user invitation-roster leak on shared browsers (audit F2, Medium).** `SharingSection.lastResult` (the blue success panel showing every email in `added`/`invited`/`failed`) was held in component-local React state and survived the sign-out → sign-in transition because the component returns null on sign-out without unmounting. The next signer-in who opened a model they own would briefly see the previous user's invitation list. Added a `useEffect` keyed on `user?.uid` that resets `lastResult`, `bulkEmails`, `email`, `error`, and `pendingInvites` whenever the signed-in user changes. Restores the `signOutCleanupRegistry` invariant established in v0.7.2.

### Internal
- **Replaced `firestore.rules` with a pointer comment, deleted `firestore.rules.merged` (audit F1, defense-in-depth High).** The checked-in rules file held a stale partial copy of the AHP-specific rules and was missing the entire suite-wide invitation infrastructure (`spertsuite_invitations`, `spertsuite_profiles`, `spertsuite_rate_limits`, `spertsuite_notification_throttle`). Anyone treating it as the source of truth and paste-replacing it into the Firebase Console would have silently erased the suite-wide rules. Replaced with a comment-only pointer naming the canonical file (`spert-landing-page/firestore.rules`) and the Firebase Console as the live source of truth.
- **Documented intentionally-preserved `localStorage` keys in `performSignOutWithCleanup` (audit F5, Low).** `ahp/sessionUserId` and `ahp/workspaceId` are random browser-scoped opaque identifiers used as `_originRef` fingerprints by `migration.ts`; clearing them would break workspace continuity for repeated local→cloud migrations on the same device. Added an inline comment so a future contributor doesn't "fix" them away.

### Out of scope (flagged, not done)
- Audit findings F3 (invitation `tokenId` logged at info/warn in `claimPendingInvitations`, `resendInvite`, `revokeInvite`, `updateInvite`) and F4 (`modelId` in throttle debug log) live in the `spert-landing-page` repo Cloud Functions and ship via a separate landing-page release. Both are Low — the `tokenId` is not a bearer credential by itself (claim requires `email_verified == inviteeEmail`); the leak is social-graph info disclosure to anyone with Cloud Logs read access.
- No dependency upgrades.

## v0.12.1 (May 2, 2026)

### Fixed
- **Accurate error copy on pending-invitation voting toggle.** Toggling the voting flag on a pending invite previously surfaced the resend-flow message ("This invitation has reached its resend limit (5)…") for unrelated failures, because `handleTogglePendingVoting` shared the `'resend'` error context with `handleResendInvite`. New `'updateVoting'` context covers `permission-denied`, `failed-precondition` (most likely real-world hit), `not-found`, and `resource-exhausted` with action-appropriate copy.
- **`useAHP.loadModel` stale-userId closure.** The `useCallback` dependency array omitted `userId`, so re-rendering `useAHP` with a new `userId` left `loadModel` operating on the old user — most visibly the response-slot self-heal touching the wrong slot. Brought into alignment with `createModel`, which already had the correct deps. Adds a regression test that re-renders the same hook instance with a new userId.
- **Stuck `pre_auth` invitation banner after silent claim failure.** If `claimPendingInvitations` failed inside `AuthContext` (logged + swallowed by design), the dismissible banner previously stranded a signed-in user on a "You've been invited" message with non-functional sign-in CTAs. `useInvitationLanding` now clears `pre_auth` → `idle` the moment the user becomes non-null, while still honoring the `spert:models-changed` claim event when it arrives. Functional `setState` avoids stomping a `'claimed'` state under any race ordering.

### Internal
- Pulled `mapInvitationError` + `InvitationErrorContext` out of `SharingSection.tsx` into `src/lib/invitationErrors.ts`. Existing test cases moved verbatim into a new sibling test file alongside the new `'updateVoting'` cases.
- Pulled `parseBulkEmails` out of `SharingSection.tsx` into `src/lib/parseBulkEmails.ts`. Existing test cases moved verbatim.
- Extracted `PendingInvitesList` from `SharingSection.tsx` into its own component (data-in via two props, actions out via three callbacks; `formatDate` moved with it). `SharingSection.tsx` drops to under 400 LOC.
- Extracted `mapToPendingInvite` as a module-level helper in `FirestoreAdapter.ts`, alongside the existing `tsToMillis` helper. `listPendingInvites` is now a thin loop over the helper.

### Out of scope (flagged, not done)
- No dependency upgrades. Every available bump is either inside the 60-day freeze window (firebase 12.12.x, tailwindcss 4.2.4, typescript 6.0.x) or a major-version step (vite 8.x, vitest 4.x, @vitejs/plugin-react 6.x, react 19.x, recharts 3.x, jsdom 29.x). All remain pinned.

## v0.12.0 (May 2, 2026)

### Added
- **"Can vote" checkbox at invite time.** Owners now decide whether an editor invitee will have voting rights *before* the invitation is sent. The invitee's collaborator record lands with the correct `isVoting` flag from the moment of acceptance, closing the gap where a freshly-accepted editor could submit pairwise comparisons before the owner had a chance to toggle voting off post-acceptance. Defaults to `true` (preserves v0.11.0 behavior); hidden when role is Viewer (viewers never vote).
- **Voting toggle on pending invitations.** Owners can flip the voting flag on a pending (not yet accepted) editor invite directly from the Sharing section, without revoking and re-inviting. Routes through the new `updateInvite` Cloud Function with inviter-only authorization and `status=pending` precondition.

### Changed
- The pending-invite list shows an interactive **Voting** checkbox in place of the static "voting" badge for editor invites.
- Bulk and legacy invite forms now pass the chosen `isVoting` value through to the `sendInvitationEmail` callable instead of hardcoding it to `true` for all editors.

### Infra
- New **`updateInvite`** Cloud Function on `spert-suite` (us-central1, callable v2, `cors: true`, allUsers Cloud Run invoker). Validates `tokenId` + `isVoting` boolean, requires auth, requires `inviterUid === request.auth.uid`, requires `status === 'pending'`. Updates only `isVoting` + `updatedAt = serverTimestamp()`. Lives in the `spert-landing-page` repo alongside `revokeInvite` / `resendInvite`.
- `StorageAdapter` gained `updateInvite(tokenId, isVoting)`; `FirestoreAdapter` calls the new callable; `LocalStorageAdapter` is a no-op (cloud-only feature, mirrors revoke/resend pattern).

## v0.11.0 (May 2, 2026)

### Added
- **Email-based bulk invitations.** Owners can now invite collaborators by pasting a comma/semicolon/newline-separated list of email addresses into the Sharing section of an owned decision. Existing SPERT users are added immediately; new emails receive a one-time invitation link (Resend-delivered, 30-day expiration) that they claim by signing in with the matching email. Up to 25 invitations per UTC day per inviter, enforced server-side.
- **Resend & Revoke on pending invitations.** Each pending-invitation row in the Sharing section now has Resend and Revoke buttons. Resend re-delivers the invitation email (capped at 5 sends per invitation, server-enforced); Revoke soft-revokes the invitation (`status: revoked`) so the link can no longer be claimed. Row metadata shows current send count as `(N/5)` for cap visibility.
- **Pre-auth invitation banner.** First-time recipients clicking an invitation link land on AHP and see a dismissible blue banner with branded "Sign in with Google" / "Sign in with Microsoft" CTAs. After sign-in, the freshly-claimed shared decision appears in their Decisions list and the banner transitions to a "you've been added to {decision name}" confirmation.
- **Auto-switch to cloud mode on `?invite=` detection.** New users landing from an email link are unambiguously opting into shared-cloud, so AHP now flips storage mode from local to cloud automatically (cloud-availability gated). Without this, post-signin invitees would land in local mode and the shared decision would be invisible.

### Changed
- **`SharingSection` error mapping is context-aware.** `mapInvitationError(err, context)` now takes a `'send' | 'resend' | 'revoke'` discriminator so shared Firebase error codes (`resource-exhausted`, `permission-denied`, `failed-precondition`, `not-found`) render appropriate copy per call site. Without the discriminator, e.g. the per-day send cap message would leak into resend-cap errors.
- **`removeCollaborator` routed through the StorageAdapter.** The previous inline `updateDoc` bypass in `SharingSection.handleRemove` is gone; both the embedded collaborators array and the `members` map are now updated atomically through the adapter. Behavior is unchanged in cloud mode; local mode keeps its no-op-safe stub.
- **Suite-wide profile mirror.** `AuthContext.writeUserProfile` now writes to both `spertahp_profiles/{uid}` and `spertsuite_profiles/{uid}`, enabling cross-app email-to-uid lookups for invitations sent from any SPERT app.

### Infra
- **Five Cloud Functions live in `us-central1` of `spert-suite`** — `sendInvitationEmail`, `claimPendingInvitations`, `revokeInvite`, `resendInvite` (all callable v2 with `cors: true` and `allUsers` Cloud Run invoker), plus the scheduled `expireInvitations` (daily 03:00 UTC). Source canonicalized in the `spert-landing-page` repo.
- **Origin-aware invitation URLs.** Cloud Functions read the request's Origin header against a strict allowlist (prod + known dev ports) and embed the matching URL base in invitation emails. Localhost calls produce localhost URLs; prod calls produce prod URLs; spoofed origins fall back to prod.
- **Microsoft AD name normalization.** "Last, First Middle" displayName format from Microsoft work accounts is now normalized to "First Middle Last" before flowing into RFC 5322 email headers or the `inviterName` Firestore field. Without normalization, email From-line was malformed and rendered inconsistently across mail clients.
- **Sender renamed `noreply@` → `invitations@spertsuite.com`** for deliverability. Reply-To still routes to the inviter; only the From local-part changed. Resolves Gmail-side `noreply` heuristic that silently dropped first-time deliveries to fresh inboxes.

## v0.10.1 (May 1, 2026)

### Changed
- **About link moved from the right side of the header into the tab bar**, positioned to the right of the Settings tab. Matches the placement used by other SPERT Suite apps. The header right-side cluster is now **Theme → AuthChip**.

## v0.10.0 (May 1, 2026)

### Added
- **Drag-to-reorder for the Saved Decisions list.** A new 6-dot grab handle on each tile lets you drag decisions into any order; the new ordering persists across sessions in both local and cloud modes via a new `StorageAdapter.reorderModels` method and an `order` field on each `ModelIndexEntry`. Existing v0.9.x rows without an `order` field sort to the bottom by `createdAt` until reordered.
- **Export All button** on the Decisions tab. Bundles every saved decision into a single JSON file for backup or migration; complements the existing single-decision export now living in Project Settings.
- **"Project" tab for project-scoped settings.** Sharing/collaborators, results visibility, disagreement thresholds, single-decision export, and the danger zone live here. The tab only appears when a decision is loaded; closing a decision while on the Project tab redirects to Decisions.

### Changed
- **Settings tab is now global-only** — cloud storage and export attribution. The previous gear-icon modal has been retired in favor of a proper full-page Settings panel, matching every other SPERT Suite app.
- **"Setup" tab renamed to "Decisions"** to match what users actually do there. The internal `Page` union and switch case are also renamed; the directory and `ModelSetup` component name are intentionally kept to preserve git history.
- **Header logo and SPERT® AHP wordmark are now clickable** — clicking either closes any open decision and returns the user to the Decisions list. Header right-side icon order standardized to About → Theme → AuthChip; the gear button is removed.
- **Pairwise comparison intensity bars are now directly clickable.** Hovering a bar previews the selection in full color (bars + label both update with the previewed value); clicking commits. The slider thumb still works for keyboard input.
- **Decision tiles got a UX overhaul** matching the rest of the suite: tile body is the click target (no more separate Load button), trash icon replaces the Delete text button, and the Import button moved out of the create-row into the Saved Decisions header alongside the new Export All button.

### Fixed
- **Consistency Advisor and CR badge no longer appear after only 2 comparisons.** Both are now suppressed until you complete every required pair for your tier — the Harker matrix estimation produces unreliable CR values on sparse data, so showing them early was misleading.
- **Voter Radar Chart legend now displays voter display names** instead of raw Firebase UIDs. Falls back to a truncated UID when no profile is available.

## v0.9.2 (May 1, 2026)

### Added
- **Branded favicon and header icon.** New `spert-favicon-ahp.png` (192×192 PNG, sunflower gold `#f59e0b` panels with rounded corners) is now the browser tab favicon and appears to the left of the SPERT® AHP wordmark in the header. A charcoal dark-mode variant (`spert-favicon-ahp-dark.png`) swaps in automatically when the dark theme is active.

## v0.9.1 (April 28, 2026)

### Tests
- **Regression coverage for the v0.8.2 collaborator-response-slot fix.** Added three tests on `LocalStorageAdapter` (verifies `addCollaborator` creates a response slot, that `saveComparisons` immediately works for a newly-added collaborator without an explicit `createResponse`, and that re-adding a collaborator preserves their existing judgments) plus one `useAHP` test that simulates legacy data with a missing slot and verifies `loadModel` self-heals by creating one. Without this coverage the v0.8.2 bug — shared collaborators' judgments silently failing to reach Firestore — could have regressed under refactoring.

### Changed
- **`LocalStorageAdapter.addCollaborator` now also initializes a response slot**, mirroring the v0.8.2 fix in `FirestoreAdapter`. Local mode is single-user in practice (per architecture), so this is not user-visible — but it lets the same regression contract test run identically against both adapters.

## v0.9.0 (April 28, 2026)

### Changed
- **Unified auth chip behavior.** All three chip states (signed-out, signed-in + local, signed-in + cloud) now open the same modal on click. The two positioned popovers (`AccountPopover`, `AccountPopoverLocal`) have been removed in favor of a single, predictable surface — the Cloud Storage modal — that handles sign-in, storage-mode selection, identity display, and sign-out from one place.
- **Settings modal renamed to "Cloud Storage."** The modal title now reflects that the modal is the single home for sign-in, storage mode, and account management.
- **Suite-standard sign-in buttons.** Sign-in buttons are now blue branded buttons with native-color Google G and Microsoft four-square logos, rendered side-by-side at normal viewport (wraps below ~320px). Replaces the previous white outlined buttons.
- **Clearer storage radio labels.** "Local" → "Local (browser only)" and "Cloud" → "Cloud (sync across devices)".
- **Suite-standard identity card.** When signed in, the modal shows a normalized display name on top, email below, and a red "Sign out" link on the right — replacing the previous inline "Signed in as Name · email" treatment.
- **Export Attribution placeholders refreshed.** Name placeholder is now "e.g., Jane Smith"; identifier placeholder is now "e.g., student ID, email, or team name" to better hint at acceptable values.

### Added
- **"Keep using local storage" button.** Visible only to signed-in users currently on local mode — a clear escape hatch from the modal that closes it without changing storage mode. Not shown when on cloud mode.
- **Auto-close after sign-out.** The Cloud Storage modal closes automatically when sign-out succeeds. If sign-out throws, the modal stays open so the error banner remains visible to the user.
- **`normalizeDisplayName` utility (`src/lib/userDisplay.ts`).** Swaps Microsoft Entra "Last, First MI" into natural reading order; passes other providers through unchanged. Used by the new identity card in the Cloud Storage modal.

### Removed
- **`AccountPopover` and `AccountPopoverLocal` components.** Both replaced by the unified Cloud Storage modal flow. The auth chip is now a pure trigger; all account actions live inside the modal.

## v0.8.2 (April 25, 2026)

### Fixed
- **Shared collaborators' judgments now reach synthesis.** Critical bug: `FirestoreAdapter.addCollaborator` wrote the new collaborator into the `collaborators` array and `members` map but never initialized a `responses[userId]` slot for them. When the collaborator opened the model and tried to save a pairwise judgment, `saveComparisons` threw `Response for {userId} not found`, which surfaced to the user as the misleading *"Save failed — you may have been signed out"* error. From the owner's side, no shared collaborator's data ever landed in Firestore, so synthesis silently aggregated only the owner's responses — producing global priority scores that ignored every student/teammate while the "comparisons changed — re-run synthesis" banner kept firing without changing the result. Fix: `addCollaborator` now writes an empty response slot at the same time as adding the collaborator.
- **Self-heal for legacy shared models.** Existing models that were shared before v0.8.2 still have collaborators with no response slot. `useAHP.loadModel` now detects this — when the current user is in the collaborators array but has no response slot, it lazy-creates one. Firestore rules permit editors to write `responses.{theirOwnUid}` since `responses` is not in the blocked-fields list, so the heal works for owners and editors alike. No manual remediation needed — every existing collaborator gets fixed the next time they open a shared model.

## v0.8.1 (April 25, 2026)

### Fixed
- **Clearer error message when an email is already registered with a different sign-in provider.** Users who previously signed in with Google and then tried Microsoft (or vice versa) on the same email saw an unhandled `auth/account-exists-with-different-credential` error fall through as a generic failure. The popup catch in `AuthContext.initiateSignIn` now surfaces a plain-English banner: *"An account with this email already exists using a different sign-in method. Please use the other provider (Google or Microsoft) — whichever you signed in with the first time."* No account-linking work — just a targeted error case so the user knows which button to press.

## v0.8.0 (April 20, 2026)

### Security
Second security audit pass, focused on the auth / cloud-storage subsystem. Seven Critical and seven Medium findings fixed through a single centralized sign-out architecture plus targeted patches. All sign-out paths now route through one helper so in-memory state, per-user PII, and storage mode reset atomically on every sign-out.

- **Sign-out now clears in-memory decision state.** The `useAHP` reducer state (modelId, model, structure, collaborators, responses, synthesis) lives as a `useReducer` inside `App.tsx`. Previously, sign-out only called `firebaseSignOut` plus `switchMode('local')` — nothing cleared the in-memory state. A second user on the same browser saw the prior user's decision title, goal, criteria, alternatives, and responses rendered across Settings / Compare / Results until they manually clicked "All Decisions". Fix: a module-level `signOutCleanupRegistry` bridges the provider-nesting gap; `App.tsx` registers `ahpState.closeModel()` into it; `performSignOutWithCleanup` invokes the registry before revoking Firebase credentials (audit findings A1, A1-structural, F1, D4)
- **Export Attribution PII now cleared on sign-out.** The `ahp/exportAttribution` localStorage key stores the user's name and identifier (email or student ID) embedded in every exported JSON. Previously never cleared — a second user would see the prior user's identity pre-filled in the Export Attribution inputs and silently embedded in any export they produced. Now removed by `performSignOutWithCleanup` (audit finding A2-PII)
- **Cross-user Firestore contamination via migration closed.** `StorageSection.handleMigrate` and `handleSwitchToCloud` constructed a fresh `new LocalStorageAdapter()` and fed it to `uploadLocalToCloud`. The fresh adapter reads raw localStorage — shared across users on the same browser. If User A's localStorage was not cleared on sign-out (per suite-wide design, local-mode decisions are intentionally a shared-browser workspace), User B signing in and initiating migration could upload User A's decisions into User B's Firestore account with actor fields rewritten to User B's uid. Fix: migration now reads from the in-context adapter retrieved via `useStorage()`, guarded by an `instanceof LocalStorageAdapter` check. The read path is the same adapter instance the app has been writing through — cannot silently consume a stale fresh-read of another user's localStorage (audit finding C3)
- **ToS-mismatch sign-out now does full cleanup.** The `onAuthStateChanged` Branch B's version-mismatch forced-sign-out called `clearLocalConsent()` and `firebaseSignOut(auth)` directly, skipping the same cleanup that the user-initiated path did (which was itself incomplete). All three sign-out entry points — `StorageSection`, `AccountPopover`, and the ToS-mismatch branch — now route through a single zero-argument `performSignOutWithCleanup()` helper that clears consent state, PII, the has-uploaded flag, runs the registry (state reset + mode reset), then calls Firebase sign-out (audit findings A5, A6)
- **Storage mode now resets to `local` on every sign-out path.** Previously `ahp/storageMode` was reset only by two of the three sign-out paths. Now consistent across all paths via the centralized registry callback registered by `StorageProvider` (audit finding A4)
- **Local consent flag now cleared on every sign-out.** `ahp/tos-accepted-version` was cleared only on the version-mismatch path, not on the user-initiated path. Now uniformly cleared (audit finding A2-consent)
- **`ahp/hasUploadedToCloud` cleared on sign-out so the next user gets the migration prompt.** Previously the flag persisted forever after the first user's migration, suppressing the prompt for any subsequent user on the same browser (audit finding A2-HasUploaded)
- **ToS Firestore write now blocks local acceptance on failure.** `writeConsentRecord` previously swallowed Firestore errors internally and unconditionally set `ahp/tos-accepted-version`. On failure the local flag claimed acceptance while no Firestore record existed — other SPERT suite apps would re-prompt. Fix: `writeConsentRecord` now throws on failure; the caller surfaces a user-visible `signInError` banner via the new `AuthContext` `signInError` / `clearSignInError` slots, leaves `ahp/tos-write-pending` set so the next sign-in retries, and performs a full sign-out. The local flag is only set after the Firestore write has succeeded (audit finding A7)
- **Popup sign-in error handling overhauled.** Previously, `auth/popup-closed-by-user` and `auth/cancelled-popup-request` were re-thrown to `StorageSection` which surfaced them as generic "Sign-in failed" errors — closing the popup or double-clicking the button produced a confusing error banner. `auth/popup-blocked` had no recovery path. Fix: closed-by-user and cancelled-popup-request now return silently; `auth/popup-blocked` surfaces a specific "Sign-in was blocked by your browser. Please allow popups for this site and try again." banner via `signInError`; all other errors propagate normally. `setWritePending()` moved inside the try block and the catch clears the pending flag so a failed popup doesn't orphan the flag (audit finding D1)
- **Orphaned `modelId` on cloud → local switch fixed.** Previously, switching from cloud to local mode while viewing a cloud-only decision left `state.modelId` pointing to an inaccessible cloud ID; `LocalStorageAdapter.subscribeModel` is a no-op so the UI rendered stale Title/Goal from memory and save attempts silently failed. Fix: `App.tsx` now watches mode transitions and dispatches RESET when mode flips to `local` with a model open. The user lands cleanly on the Setup tab's local decisions list. Per spec, no keep-local-copy prompt in this release (audit findings C4, C5)
- **Unhandled rejection in `saveComparisons` during sign-out race.** `useAHP.saveComparisons` did not wrap the awaited `storage.saveComparisons` call. If a user clicked Sign Out while a save was in flight, the resulting Firestore `PERMISSION_DENIED` surfaced as an unhandled promise rejection. Wrapped in try/catch; on error, dispatches a SET_ERROR with a user-visible "Save failed — you may have been signed out" message (audit finding A3)

### Added
- **Signed-in + local chip state.** The auth chip previously had only two branches: signed-in + cloud (avatar + cloud icon → account popover) and everything-else (lock icon + "Sign in" pill). A user signed in but in local mode fell through to the signed-out pill — rendering a misleading "Sign in" prompt to an already-authenticated user. New `AccountPopoverLocal` component handles the signed-in + local state (state d) with its own pill (avatar + name + lock icon) and popover offering two actions: "Switch to Cloud Storage" (navigation-only; opens Settings so the upload/skip prompt can appear in the visible Storage section) and "Sign Out" (routes through `performSignOutWithCleanup`). `AuthChip`'s `onClick` prop renamed to `onOpenSettings` for unambiguous intent (audit finding F2(d))
- **`signInError` / `clearSignInError` on `AuthContext`.** New context slots surface sign-in errors from `AuthContext` (where A7 and D1 errors originate) to `StorageSection` (which owns the error banner). `StorageSection` renders `signInError ?? error` in the existing red banner

### Infrastructure
- **`signOutCleanupRegistry` module.** Bridges the `AuthProvider → StorageProvider → App` provider nesting so `AuthContext` sign-out can reach `App`-scoped `useAHP` state and `StorageProvider`'s mode preference without prop drilling or hoisting state into a third context. `App.tsx` registers `ahpState.closeModel()`; `StorageProvider` registers the mode-to-local reset; `performSignOutWithCleanup` invokes `runSignOutCleanup()` before Firebase credential revocation
- **`performSignOutWithCleanup` helper.** Zero-argument `async` function that is the single entry point for every sign-out: clears consent state, Export Attribution, hasUploaded flag, runs the registry, then calls `firebaseSignOut(auth)`. All three previous sign-out paths (`StorageSection.handleSignOut`, `AccountPopover.handleSignOut`, `AuthContext` ToS-mismatch branch) now call this helper
- **`peekWritePending` and `clearWritePending` helpers** on `src/lib/consent.ts`. `peekWritePending` reads the flag without consuming it (used by the A7 Branch A refactor); `clearWritePending` removes the pending flag only (used by the D1 popup-failure catch path)
- **7 new tests** covering the cleanup registry and the centralized sign-out helper. All 170 existing + new tests pass

## v0.7.3 (April 18, 2026)

### Changed
- **"CR" acronym spelled out as "Consistency Ratio" in user-facing surfaces where the term is introduced or where space permits.** New users had no in-context way to know what "CR" stands for — it appeared bare on the consistency badge tooltip, advisor heading and body copy, tier selector, and the synthesis confidence badge. Affected strings: `ConsistencyBadge` fallback tooltip (tier/no-value case), `ConsistencyAdvisor` heading + partial-comparison caveat + per-row "Expected … drop" label, `TierSelector` tier-card subheadings, `SynthesisConfidenceBadge` "Avg …" row, and the two `confidenceLabel` constants produced by `consistencyRatio`. Compact "CR" retained in space-constrained displays where the term has already been established nearby: the badge pill itself, the per-voter row in `VoterBreakdownCard`, and the advisor progress-bar caption

## v0.7.2 (April 18, 2026)

### Security
First security audit pass on the codebase. Six findings fixed; four deferred with explicit justification.

- **Firestore rules — editors can no longer write owner-governed fields.** The deployed `spertahp_projects` update rule previously guarded only `owner` and `members` against non-owner writes, leaving `resultsVisibility`, `synthesis`, `publishedSynthesisId`, and `collaborators` writable by any editor. The UI gated these to owners, but a determined editor could bypass via direct adapter or Firestore SDK calls — flipping `showAggregatedToVoters` to see other voters' data, republishing synthesis, or changing anyone's `isVoting` flag. Tightened the rule to forbid editor writes to all four keys (audit finding 3.3)
- **Firestore rules — profile enumeration blocked.** The deployed `spertahp_profiles` rule granted read access to any authenticated Firebase user (shared auth tenant across the SPERT suite), permitting bulk listing of every SPERT AHP user's displayName + email. Replaced `allow read` with `allow get` + a `list` rule constrained to `request.query.limit <= 1`. The share-by-email flow in SharingSection still works because its query is now `limit(1)`-constrained. Does not stop one-email-at-a-time probing — deliberate tradeoff for share-by-email UX without a Cloud Function (audit finding 3.6, Option B)
- **Export is now owner-only in cloud mode.** Previously any collaborator with project access (including viewers) could click "Export as JSON" and receive a file containing every voter's raw comparison matrices and all collaborator UIDs — bypassing the owner's `showAggregatedToVoters = false` privacy control. Added `mode !== 'cloud' || isOwner` gate on the Export UI in `SettingsPanel`. Local mode is unaffected (local user is always sole owner) (audit finding 8.2)
- **Import now whitelist-copies fields.** `importModel` previously spread `envelope.meta`, `envelope.structure`, `envelope.collaborators[]` items, and the original owner's response through to storage, which in local mode meant unknown/rogue fields on the uploaded JSON survived round-trips via `setJSON` → `getJSON`. Cloud mode was already safe because `FirestoreAdapter.createModelFromBundle` picks whitelisted fields explicitly. Defense-in-depth: every imported object now goes through explicit per-field pickers (`pickString`, `pickNumber`, `pickStatus`, `pickCompletionTier`, `pickDisagreementConfig`, `pickResultsVisibility`, `pickChangeLog`, `pickStructuredItem`, `pickStructure`, `pickComparisonMap`, `pickAlternativeMatrices`, `pickResponse`) (audit finding 1.3)
- **Import now enforces a 2 MB size cap.** `importModel` rejects raw JSON input over 2 MB before `JSON.parse`, and the test harness covers the error path. A legitimate AHP export at Complete tier with 50 voters is under 500 KB; 2 MB is generous headroom for authentic use while stopping malformed or malicious huge payloads that would hang the main thread (audit finding 1.4)
- **Checked-in firestore.rules now mirrors the deployed suite ruleset.** Previous repo file declared only the AHP-specific block; the canonical deployed rules cover all SPERT apps plus `/users/{uid}` for ToS records (which uses a `hasOnly()` whitelist of allowed fields — no consent-record forgery possible). Full suite rules now in the repo for diff-against-console verification (audit finding 7.1)

### Docs
- `SynthesisBundle` type comment documents the point-in-time-snapshot semantics: removing a collaborator after synthesis does NOT retroactively redact them from the stored bundle until synthesis is re-run. Expected behavior worth documenting so consumers don't assume retroactive redaction

### Audit items deferred with justification
- **7.2** (consent-bypass via localStorage) — cosmetic only. The Firestore consent record at `users/{uid}` is the authoritative artifact and is protected by a uid-matched `hasOnly()` whitelist
- **3.7** (spertahp_settings lacks `hasOnly()`) — path is currently unused by the AHP app. Will add hasOnly when AHP starts persisting settings to Firestore
- **v0.7.1 flagged bug** (state.responses lingering after collaborator removal) — re-assessed in this audit as correctness debt, not a security exposure. No render path surfaces other-user responses from state; exports read fresh from storage
- **Synthesis snapshot retention** — documented in the SynthesisBundle type comment per above; no code change

## v0.7.1 (April 18, 2026)

### Fixed
- **Cloud sync of Results Visibility settings.** When an owner toggled "show aggregated results to voters" or "show own rankings to voters" on one device, the change was dropped on other subscribed devices. The Firestore subscription handler rebuilt the model record field-by-field and omitted the `resultsVisibility` block, so `SET_MODEL` replaced the meta with one that silently lost the setting. Fix: preserve `resultsVisibility` (with defaults when absent) in the subscription decode path. Local mode was never affected — subscriptions are a no-op there and `loadModel` already backfills via the adapter's own meta unwrapper

### Refactor
First refactor pass on the codebase — no behavior change. All 153 pre-existing tests still pass; 8 new tests added for the extracted modules and the visibility bug fix. Three decompositions:

- **Firestore synthesis codec** ([src/storage/firestoreSynthesisCodec.ts](src/storage/firestoreSynthesisCodec.ts)). Firestore does not support nested arrays, so `summary.localPriorities` and `individual.individualLocalPriorities` are JSON-stringified on write and parsed on read. That workaround was duplicated across four sites: `FirestoreAdapter.saveSynthesis`, `FirestoreAdapter.getSynthesis`, `FirestoreAdapter.createModelFromBundle`, and the `useAHP` subscription handler. All four now share one `serializeSynthesisForFirestore` / `deserializeSynthesisFromFirestore` pair
- **Synthesis math pipeline** ([src/hooks/synthesisPipeline.ts](src/hooks/synthesisPipeline.ts)). `useAHP.runSynthesis` was 243 lines that interleaved storage I/O, voter-data gathering, AIJ aggregation, eigenvector/LLSM computation, per-voter priorities, confidence signals, and hashing. Extracted to `computeSynthesis(inputs)` which returns `{ synthesisId, bundle }`. The hook becomes a thin orchestrator: compute → persist → dispatch. `useAHP.ts` went from 533 to 301 lines
- **PairwiseComparisonLayer component** ([src/components/comparison/PairwiseComparisonLayer.tsx](src/components/comparison/PairwiseComparisonLayer.tsx)). The criteria-layer render block and the per-criterion alternatives-layer render block in `ComparisonPanel` were ~80% duplicated — ConsistencyBadge, advisor, convergence/connectivity warnings, owner matrix details, pairs list, weights display. Extracted to a shared component consumed by both. `ComparisonPanel.tsx` went from 405 to 188 lines
- Minor cleanup: removed a dead `void serverTimestamp` suppression in `FirestoreAdapter.ts` (import was unused)

## v0.7.0 (April 18, 2026)

### JSON Export/Import
- Export any decision as a portable JSON file from the Settings tab. The envelope includes meta, structure, collaborators, responses, and the currently published synthesis, plus an `_exportedBy` attribution block pulled from app-level Export Attribution
- Import a previously exported decision from the Setup screen via a new "Import from JSON" button. The importer automatically becomes the owner; the app navigates into the imported model after a successful load
- On import, foreign collaborators and their responses are dropped. The original owner's response is remapped to the current user — the importer becomes the sole voter. Synthesis is stripped and `status: 'synthesized'` reverts to `'open'` so the imported model recomputes against its new voter set
- `_originRef` is preserved across import (provenance stays with the file), and an `imported` entry is appended to `_changeLog`
- Export Attribution copy in the global Settings modal is no longer marked "(future feature)" — the fields are wired into the export envelope

### Architecture
- New `AHPExportBundle` and `AHPExportEnvelope` types in `src/types/ahp.ts`
- `createModelFromBundle` promoted from a `FirestoreAdapter`-only method to the `StorageAdapter` interface. `LocalStorageAdapter` gains an implementation that composes existing `createModel` / `addCollaborator` / `createResponse` / `saveSynthesis` calls. `FirestoreAdapter.createModelFromBundle` now inlines synthesis into the monolithic document (single write) using the same JSON-string serialization that `saveSynthesis` applies to nested arrays
- `FirestoreAdapter.ModelBundle` is now a type alias for `AHPExportBundle` — `migration.ts` continues to work with a single-line `synthesis: null` addition
- New `APP_VERSION` constant in `src/core/models/constants.ts`, stamped into the export envelope
- New `src/storage/exportModel.ts` and `src/storage/importModel.ts` utilities keep export/import logic out of the adapters themselves
- `ATTRIBUTION_KEY` exported from `AppSettingsModal.tsx` so the export utility imports the canonical constant instead of duplicating the string

### Tests
- New `src/__tests__/exportImport.test.ts` with four groups: schema round-trip, end-to-end local round-trip through `useAHP`, version/shape guard, and UID-remap + synthesis-strip behavior (8 tests)

## v0.6.2 (April 18, 2026)

### Fixed
- Consistency Advisor no longer suggests targets outside the Saaty scale. The raw eigenvector-implied ratio `w[i] / w[j]` is unbounded and could produce values like `1/15x` or `12x` on severely inconsistent matrices — the advisor would render these in the spotlight and the ghost slider marker would render off the track. `rankJudgments` now clamps `impliedValue` to `[1/9, 9]` before returning, so the advisor always points to a Saaty-valid target the user can physically set
- CR-improvement math is unaffected: `buildMatrix` clamps to the same range internally, so `crDelta` already reflected the improvement achievable at the Saaty bound. Only the displayed target and ghost position are affected
- New test: `rankJudgments` invariant that `impliedValue` always lands in `[1/9, 9]`

## v0.6.1 (April 18, 2026)

### Consistency Advisor Polish
- Advisor language now matches the layer: "more preferred" on alternative-layer rankings, "more important" on the decision-factor layer. Previously the advisor always said "important" even when the comparison slider below it said "preferred"
- Fallback strings for out-of-range values ("Equally important" / "Equally preferred") are also mode-aware now
- Transitivity prose ("A is Xx more important than B...") uses the same mode-dependent phrasing

### Ghost Consistency Indicator
- New passive marker on each comparison slider: a muted downward arrow plus dashed vertical line at the slider position that would make the judgment consistent with the user's other answers. Rendered only when the advisor has a CR-improvement target for that pair and it differs from the current thumb position
- The ghost is visual only — it does not move the thumb or apply any value
- Hover tooltip describes which side the consistency target favors
- Ghost is `aria-hidden` since the spotlight row above conveys the same information accessibly

### Architecture
- `rankJudgments` and `findTransitivityViolations` computation lifted from `ConsistencyAdvisor` up to `ComparisonPanel` / `AlternativeLayer`, so the advisor spotlight and the per-row ghost share one `RankedJudgment[]` source of truth (no duplicate computation, guaranteed agreement)
- `ConsistencyAdvisor` is now a pure view component taking `ranked`, `violations`, and `mode` as props
- `ComparisonInput` accepts a new optional `impliedValue?: number` prop

## v0.6.0 (April 17, 2026)

### Consistency Advisor
- New inline advisor below the CR badge (Compare tab) when CR exceeds 10%, ranking the judgments most likely to be driving inconsistency
- Each spotlight row shows the user's current answer, the eigenvector-implied value, and the expected CR drop if reconsidered
- Reconsider button scrolls to and highlights the relevant comparison with an amber ring; respects `prefers-reduced-motion`
- Row cap of 3 with a small-n floor (`totalPairs - 1`) so the advisor never surfaces every judgment as a top offender
- Collapsible transitivity explanations (Complete tier only), in plain English, for triples whose stored values materially contradict their implied product
- CR progress bar renders current ratio against the 10% target

### Compare Tab Scroll Context
- Layer tabs are sticky at the top of the Compare panel while scrolling
- New collapsible "Reminder: decision goal" below the sticky tab row
- Context banners above each comparison section name the goal (criteria layer) or criterion (alternatives layer) being ranked against

### Results Chart
- `PriorityChart` rewritten with CSS bars — long factor/alternative labels now wrap cleanly instead of overflowing or colliding with adjacent bars
- Kept the original props interface; both consumers (ResultsPanel, VoterBreakdownCard) need no changes
- Re-run Synthesis button demoted to a small outlined secondary control in the Results header row

### Copy
- Consistency badge tooltip strings simplified — partial-comparison modes (tier 2/3) now read "CR estimate — based on partial comparisons"; Complete tier reads "Full confidence CR"
- Internal `Harker` references retained in code comments documenting the math; no longer surfaced in user-facing UI

### Math Layer
- New `rankJudgments(n, comparisons, tier)` — ranks observed judgments by CR-improvement potential; powers the Consistency Advisor spotlight
- New `findTransitivityViolations(n, comparisons, tier)` — detects (i, j, k) triples where stored values contradict the implied product; tier-gated internally and filters near-zero (<0.1 log magnitude) and out-of-scale (>9 or <1/9 implied) cases

## v0.5.0 (April 14, 2026)

### Individual Voter Breakdown
- Synthesis pipeline now computes per-voter factor weights, alternative scores, and global rankings
- New "Individual Voter Rankings" section in Results with expandable per-voter cards showing factor weights, alternative scores, and CR
- Grey "incomplete" badge flags factors where a voter had no alternative comparisons (uniform fallback applied)
- VoterRadarChart now renders when 2+ voters have individual priority data

### Results Visibility Controls
- New owner-only "Results Visibility" section in Settings (cloud mode)
- "Allow voters to see aggregated results" toggle (default: off) — owner decides when to share group results
- "Allow voters to see their own rankings" toggle (default: on) — voters can review their individual breakdown
- Non-owners see a placeholder message when aggregated results are hidden

### Architecture
- Extracted shared `useProfiles` hook from SharingSection for reuse across voter breakdown and sharing UI
- `SynthesisIndividual` extended with `individualAlternativeScores`, `individualLocalPriorities`, and `individualIncompleteCriteria`
- `ModelDoc` extended with optional `resultsVisibility` field (backward-compatible defaults)
- Firestore serialization handles nested array fields in individual synthesis data

## v0.4.1 (April 13, 2026)

### Fixed
- Fixed "Nested arrays are not supported" error when running synthesis in cloud mode — `localPriorities` (a 2D array) is now serialized as JSON before writing to Firestore and deserialized on read

## v0.4.0 (April 13, 2026)

### Language
- Renamed "criteria" / "criterion" to "decision factors" / "factor" across all UI surfaces — more accessible for non-AHP-specialists while avoiding the goal/objective collision identified in terminology review
- "Decision Factors" used in headers and tab labels; "factors" in tight spaces like placeholders and chart labels
- About page retains "criteria" for AHP methodology accuracy

## v0.3.0 (April 13, 2026)

### Sharing
- Collaborator list now displays user names and emails instead of truncated Firebase UIDs — profiles are fetched from Firestore on render with graceful fallback

### UX
- Redesigned comparison slider with intensity bars — 17 vertical bars grow taller toward the edges to communicate preference strength, color fills outward from center (blue left, amber right)
- Fixed slider direction — dragging toward an item now means you prefer that item (previously inverted)
- Slider thumb repositioned below the intensity bars for clearer visual separation
- Fixed bug where editing existing criteria or alternative names would swallow keystrokes — inputs now use local state with blur-to-save
- Long item labels now wrap instead of truncating with ellipsis in both comparison sliders and Current Weights charts
- Current Weights bar chart enforces a minimum bar width so small percentages remain visible

### Comparison Matrix
- Comparison matrix table is now hidden for non-owner collaborators
- For owners, the matrix is collapsed behind a "Show comparison matrix" toggle (default closed)

### Language
- Renamed "Criteria weights" tab to "Objectives" for more accessible language
- Renamed "Criteria Weights" chart in Results to "Objective Weights"

### Maintenance
- Removed stale compiled `.js`/`.js.map` artifacts from `src/` that were shadowing `.tsx` sources and causing Vite to serve outdated code
- Version display in Changelog and About pages now derived dynamically from changelog data

## v0.2.4 (April 9, 2026)

### Documentation
- Added Quick Reference Guide PDF to the About page — click "Open PDF" to view in a new browser tab

## v0.2.3 (April 9, 2026)

### Cloud Storage
- AuthChip is now a single click target in both signed-in and signed-out states — the whole pill (avatar, name, divider, cloud icon) is one button
- Clicking the signed-in chip opens a lightweight account popover with the user's name, email, and a Sign Out button — no more navigating to the Settings tab to sign out
- Popover dismisses via Escape, outside click, or Cancel; Sign Out shows a "Signing out…" loading state and guards against re-entry

### Maintenance
- Removed stale compiled `.js`/`.jsx` artifacts from `src/` that were shadowing `.tsx` sources and causing Vite to serve stale code

## v0.2.2 (April 7, 2026)

### Cloud Storage
- Added explicit Terms of Service and Privacy Policy consent before cloud sign-in — first-time users (and users on an outdated ToS version) must check a box and click "Enable Cloud Storage" before any Firebase Auth popup is opened
- Consent is recorded both locally (fast path on subsequent sign-ins) and in Firestore at `users/{uid}` with the current ToS version
- Outdated consent versions force a sign-out and re-consent

## v0.2.1 (April 7, 2026)

### Fixed
- Cloud storage sign-in flow replaced with the standard pattern used by other SPERT Suite apps — sign-in buttons are now always visible when cloud storage is available, and the Local/Cloud radio only becomes active after signing in
- Removed the "radio-first" UX that caused a deadlock where clicking Cloud while signed out did nothing
- StorageContext reverted to the canonical single-mode shape from ARCHITECTURE.md §4.4

## v0.2.0 (April 7, 2026)

### Cloud Storage
- Optional Firebase-backed cloud storage — sign in with Google or Microsoft
- Global Settings modal (gear icon in header) for storage mode, sign-in, and export attribution
- Auth chip in header: split pill showing account status and quick access to settings
- Local → Cloud one-way migration with userId rewrite and provenance preservation
- Real-time sync across devices and tabs via Firestore onSnapshot
- Per-decision sharing (cloud mode, owner only) — add collaborators by email as editor or viewer
- Owner-controlled voting participation toggle for editors

### Architecture
- StorageAdapter interface converted to async — all methods return Promises
- Context-injected storage adapter (LocalStorageAdapter / FirestoreAdapter)
- AuthProvider + StorageProvider with storage-ready gate to prevent auth-loading race
- Monolithic Firestore document per decision (`spertahp_projects/{modelId}`)
- Lightweight fingerprinting: `_originRef` (workspace UUID) and `_changeLog` on ModelDoc
- Simplified CollaboratorRole: owner / editor / viewer

## v0.1.1 (April 5, 2026)

### Legal
- Updated Terms of Service and Privacy Policy to v04-05-2026
- Added SPERT® AHP to list of covered apps
- Updated effective date to April 5, 2026

## v0.1.0 (April 5, 2026)

### Features
- AHP decision-making framework with pairwise comparisons
- Four comparison tiers: Quick, Balanced, Thorough, Complete
- LLSM+RAS weight computation for incomplete matrices
- Principal eigenvector for complete matrices
- Consistency ratio with Harker Option A for incomplete matrices
- Suggest repair for inconsistent comparisons
- Global synthesis with weighted criteria and alternatives
- Sensitivity analysis with crossover detection

### Group Decision Support
- AIJ and AIP group aggregation methods
- Kendall's W concordance with tie-corrected average ranking
- Disagreement analytics (CV, nMAD, band classification)
- Cosine similarity pairwise agreement
- Synthesis confidence badge (RED/AMBER/GREEN)

### UX
- Tab-based navigation (Setup / Compare / Results / Settings)
- Drag-and-drop reordering for criteria and alternatives (@dnd-kit)
- Dual-color comparison sliders — blue fills toward left item, amber fills toward right item, with smooth animated transitions
- Context-aware slider labels ("more important" for criteria, "more preferred w.r.t. [criterion]" for alternatives)
- Disagreement threshold configuration (strict/standard/exploratory presets)
- Dark mode with three-state toggle (light/dark/system) — persisted in localStorage
- About page with AHP methodology, data security, licensing, and warranty sections
- Changelog page with categorized version history

### Legal
- GNU GPL v3.0 license with attribution preservation terms (Section 7(b))
- Terms of Service and Privacy Policy (linked to spertsuite.com)
- SPERT® Suite branding in footer

### Infrastructure
- LocalStorage-based persistence
- Firebase adapter stub (Phase 2 ready)
- TypeScript strict mode with noUncheckedIndexedAccess
- Tailwind CSS v4 with @tailwindcss/vite plugin
- Vite 6, React 18, Vitest test framework
- Deployed on Vercel
