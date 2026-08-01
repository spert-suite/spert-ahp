// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import AppFooter from '../components/shell/AppFooter';
import { CHANGELOG } from '../components/shell/changelogData';

/**
 * The footer is the third surface that displays the version, and until v0.18.20
 * it was the only one that did not derive it.
 *
 * `AppFooter.tsx` carried the literal JSX text `Version 0.18.11` from June 26
 * until July 31 — eight releases. Nothing caught it. The ship gate could not:
 * `shipgate.config.json` recorded, as a premise, that this repo has no displayed
 * version constant and that `CHANGELOG[0].version` is therefore covered
 * transitively. That premise was false while a hardcoded string sat in the
 * footer of every page. `changelog-surfaces.test.ts` could not either — it ties
 * the two changelog surfaces to each other and never reads a component.
 *
 * The failure was visible on screen the whole time: the footer said 0.18.11 and
 * the Changelog page, two clicks away, said 0.18.19.
 *
 * Two assertions, because they fail at different moments:
 *
 *   - The render check fails if the footer stops agreeing with the changelog
 *     data — but a freshly hardcoded literal agrees on the day it is written,
 *     so that check would not fail until the *next* bump.
 *   - The source check fails the moment a version literal reappears in the
 *     file, which is when the mistake is actually made.
 *
 * If this fails, make the footer derive the version — do not update a literal.
 */
describe('the footer derives its version', () => {
  it('renders the version the changelog data declares', () => {
    const { container } = render(<AppFooter />);
    const button = container.querySelector('button');

    expect(button, 'the footer no longer renders a version button').not.toBeNull();
    expect(button?.textContent?.trim()).toBe(`Version ${CHANGELOG[0]?.version}`);
  });

  it('holds no version literal of its own', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/shell/AppFooter.tsx'),
      'utf-8',
    );

    // Drop the copyright header and any other line comments before matching, so
    // a licence version in the framing cannot be mistaken for a displayed one.
    const code = source
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .join('\n');

    const literals = [...code.matchAll(/\d+\.\d+\.\d+/g)].map((m) => m[0]);

    expect(
      literals,
      `AppFooter.tsx hardcodes ${literals.join(', ')} — render CHANGELOG[0].version instead`,
    ).toEqual([]);
  });
});
