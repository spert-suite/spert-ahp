// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { CHANGELOG } from '../components/shell/changelogData';

/**
 * SPERT AHP keeps its changelog in two places and they are easy to let drift:
 *
 *   - `src/components/shell/changelogData.ts` is what the app renders, and is
 *     also where the displayed version comes from. This repo has no APP_VERSION
 *     constant behind the UI — `AboutPage` and `ChangelogPage` both render
 *     `CHANGELOG[0].version`, so *the changelog entry is the version bump*.
 *   - `CHANGELOG.md` is the record in the repository.
 *
 * Nothing has ever held the two together. v0.13.0 was written into the data
 * file and never into `CHANGELOG.md`, so the repository's own changelog skipped
 * from v0.13.1 straight to v0.12.2 for roughly three months. It was backfilled
 * in v0.18.16, when this test was written. SPERT Scheduler has the same defect
 * at a much larger scale — 34 versions present in-app and absent from its root
 * file — so this is a suite-wide failure mode, not an AHP quirk.
 *
 * An entry with no sections, or a section with no items, renders as a bare
 * heading with nothing beneath it. That failure has no other symptom: the data
 * file is valid TypeScript, the build succeeds, types check and lint passes.
 *
 * If this fails, fix the data — do not relax the assertion.
 */
describe('changelog surfaces agree', () => {
  const markdown = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');

  const markdownVersions = [...markdown.matchAll(/^## v([\d.]+)\s*\(/gm)].map((m) => m[1]);
  const dataVersions = CHANGELOG.map((e) => e.version);

  it('both surfaces carry entries', () => {
    expect(dataVersions.length).toBeGreaterThan(0);
    expect(markdownVersions.length).toBeGreaterThan(0);
  });

  it('every in-app entry also exists in CHANGELOG.md', () => {
    const missing = dataVersions.filter((v) => !markdownVersions.includes(v));

    expect(
      missing,
      `these versions render in the app but are absent from CHANGELOG.md: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('every CHANGELOG.md entry also exists in the app', () => {
    const missing = markdownVersions.filter((v) => !dataVersions.includes(v));

    expect(
      missing,
      `these versions are in CHANGELOG.md but never render in the app: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('both surfaces agree on the newest entry', () => {
    expect(dataVersions[0]).toBe(markdownVersions[0]);
  });

  it('gives every entry at least one section', () => {
    const empty = CHANGELOG.filter((e) => e.sections.length === 0).map((e) => e.version);

    expect(
      empty,
      `these versions render as a bare heading with no content: ${empty.join(', ')}`,
    ).toEqual([]);
  });

  it('gives every section at least one item', () => {
    const empty = CHANGELOG.flatMap((e) =>
      e.sections.filter((s) => s.items.length === 0).map((s) => `v${e.version} → "${s.title}"`),
    );

    expect(
      empty,
      `these sections render as a heading with nothing beneath it: ${empty.join('; ')}`,
    ).toEqual([]);
  });
});
