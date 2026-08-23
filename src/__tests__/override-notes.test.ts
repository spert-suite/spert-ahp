// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * `package.json` carries two structures that must agree and that nothing else
 * checks: `overrides`, which npm enforces, and `_overrideNotes`, which npm
 * ignores entirely.
 *
 * Why the notes exist: an override records WHAT it pins and never WHY. Both
 * overrides this repo carried before v0.18.28 had silently stopped being
 * security floors, in opposite ways, and both looked correct in the file the
 * whole time:
 *
 *   - `protobufjs ^7.6.3` was added at v0.18.3 to clear a then-critical
 *     advisory, and did. A LATER advisory was published with the range
 *     `>=7.5.0 <=7.6.4`, which swallowed the version the floor had settled on.
 *     The version never moved; the advisory did.
 *   - `@grpc/grpc-js ~1.9.16` was added in the same commit for the same reason
 *     and is now inert: `@firebase/firestore` declares `~1.9.0` and 1.9.16 is
 *     the top of that line, so a fresh resolution reaches it with the override
 *     present AND absent.
 *
 * JSON admits no comments, so the notes live in a sibling key. That creates the
 * failure this file exists to prevent: a note describing an override that is no
 * longer there, or an override with nothing explaining it. Either reads as
 * correct on the day it stops being true — which is the same shape as v0.13.0
 * missing from `CHANGELOG.md` for three months, and as `AppFooter` rendering a
 * hardcoded `Version 0.18.11` for eight releases.
 *
 * If this fails, fix the data. An override without a note is the dangerous
 * direction: it is how the two above decayed unnoticed.
 */
interface Manifest {
  overrides?: Record<string, string>;
  _overrideNotes?: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
) as Manifest;

const overrides = Object.keys(manifest.overrides ?? {});
/** `_why` documents the mechanism itself, not any one override. */
const notes = Object.keys(manifest._overrideNotes ?? {}).filter((key) => key !== '_why');

describe('override notes', () => {
  it('finds overrides to check, so an empty manifest cannot pass vacuously', () => {
    expect(overrides.length).toBeGreaterThan(0);
  });

  it('explains the mechanism itself, not only the individual pins', () => {
    expect(Object.keys(manifest._overrideNotes ?? {})).toContain('_why');
  });

  it('gives every override a note saying why it exists', () => {
    const unexplained = overrides.filter((key) => !notes.includes(key));

    expect(
      unexplained,
      `these overrides pin a version with nothing recording why: ${unexplained.join(', ')}`,
    ).toEqual([]);
  });

  it('keeps no note for an override that has been removed', () => {
    const orphaned = notes.filter((key) => !overrides.includes(key));

    expect(
      orphaned,
      `these notes describe overrides that no longer exist: ${orphaned.join(', ')}`,
    ).toEqual([]);
  });

  it('makes every note name the advisory it turns on, or say it names none', () => {
    const silent = notes.filter((key) => {
      const note = manifest._overrideNotes?.[key] ?? '';
      return !/GHSA-[\w-]+/.test(note) && !/No advisory/i.test(note);
    });

    expect(
      silent,
      `these notes record a version but not the advisory that justifies it — ` +
        `the version is never what moves: ${silent.join(', ')}`,
    ).toEqual([]);
  });
});
