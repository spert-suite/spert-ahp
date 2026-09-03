// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * Every changelog date must actually render.
 *
 * WHAT WENT WRONG, AND WHY NOTHING NOTICED
 *
 * `formatDateLong` in ChangelogPage.tsx splits on "-" and feeds the pieces to
 * `new Date(year, month - 1, day)`. A date written as "August 24, 2026" splits
 * into one piece, `Number` turns it into NaN, and the page renders the literal
 * words "Invalid date" next to the version.
 *
 * Two entries shipped that way — v0.18.34 written on 2026-08-24, and v0.18.35
 * on 2026-09-03 which copied the format from the entry directly above it. That
 * is the trap: the newest entry is the natural template, so one malformed entry
 * reproduces itself in the next release, and the version most people look at is
 * always the one most likely to be wrong.
 *
 * The existing changelog guard compares VERSIONS across the two surfaces and
 * says nothing about dates, so both defects passed every check for ten days.
 *
 * WHY THIS IMPORTS THE REAL FUNCTION
 *
 * It asserts against `formatDateLong` itself rather than a regex standing in
 * for it. A re-implementation would have agreed with itself while the page went
 * on showing "Invalid date" — the failure mode this whole file exists to catch.
 */

import { describe, it, expect } from 'vitest';
import { CHANGELOG } from '../components/shell/changelogData';
import { formatDateLong } from '../lib/formatChangelogDate';

describe('changelog dates render', () => {
  it('every entry formats to a real date, not "Invalid date"', () => {
    const broken = CHANGELOG.filter((e) => formatDateLong(e.date).includes('Invalid')).map(
      (e) => `v${e.version} → ${JSON.stringify(e.date)}`,
    );

    expect(
      broken,
      'these entries render the literal words "Invalid date" on the changelog page. ' +
        'Dates must be ISO (YYYY-MM-DD); the renderer splits on "-".',
    ).toEqual([]);
  });

  it('the check has power — a long-form date is still rejected (positive control)', () => {
    // Without this, a change that made formatDateLong return something harmless
    // for any input would leave the test above passing on genuinely broken data.
    expect(formatDateLong('August 24, 2026')).toContain('Invalid');
    expect(formatDateLong('2026-08-24')).toBe('August 24, 2026');
  });
});
