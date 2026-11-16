// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// Adding a guide to public/? Also add it, with a one-line description, to spertsuite.com's
// src/data/help.ts (spert-landing-page). The landing page's daily "Guide list matches the app
// repos" check stays red until you do. The PDF guide house rules say the same.

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AppTabBar from '../AppTabBar';

// The Help Center link (v0.18.50): a link out to the SPERT® Suite Help Center, after About
// at the right-hand end of the tab bar. It must never become a tab.
//
// Every expectation below is a LITERAL. The tab labels are written out rather than read
// from TABS, and the URL is never imported, so a wrong slug or an extra TABS entry cannot
// make its own test agree with it.

const LINK_NAME = 'Help Center (opens in a new tab)';
const TABS_WITHOUT_MODEL = ['Dashboard', 'Decision', 'Compare', 'Results', 'Settings', 'About'];
const TABS_WITH_MODEL = ['Dashboard', 'Decision', 'Compare', 'Results', 'Manage', 'Settings', 'About'];

function renderBar(activePage = 'Dashboard', modelOpen = false) {
  render(<AppTabBar activePage={activePage} modelOpen={modelOpen} onSelect={() => {}} />);
  const nav = screen.getByRole('navigation');
  return { nav, link: within(nav).getByRole('link', { name: LINK_NAME }) };
}

describe('AppTabBar — Help Center link', () => {
  it('points at this app’s Help Center page, exactly', () => {
    const { link } = renderBar();
    expect(link.getAttribute('href')).toBe('https://spertsuite.com/help/ahp');
  });

  it('opens in a new tab, with noopener and noreferrer', () => {
    const { link } = renderBar();
    expect(link.getAttribute('target')).toBe('_blank');
    const rel = (link.getAttribute('rel') ?? '').split(/\s+/);
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  it('is named "Help Center (opens in a new tab)", with the arrow hidden and the note visually hidden', () => {
    const { link } = renderBar();
    // getByRole above already matched the full accessible name; these pin its parts.
    // jsdom applies no CSS, so a visible "(opens…)" would pass the name check alone.
    const hidden = Array.from(link.querySelectorAll('span')).find(
      (s) => s.textContent === '(opens in a new tab)',
    );
    expect(hidden).toBeDefined();
    expect(hidden?.classList.contains('sr-only')).toBe(true);
    const arrow = Array.from(link.querySelectorAll('span')).find((s) => s.textContent === '↗');
    expect(arrow?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is an <a>, and the only link in the bar', () => {
    const { nav, link } = renderBar();
    expect(link.tagName).toBe('A');
    expect(within(nav).getAllByRole('link')).toHaveLength(1);
  });

  describe.each([
    ['no model open', false, TABS_WITHOUT_MODEL],
    ['a model open', true, TABS_WITH_MODEL],
  ])('with %s', (_label, modelOpen, expected) => {
    it('is not a tab: the bar’s buttons are exactly the tab labels plus About, in order', () => {
      const { nav } = renderBar('Dashboard', modelOpen);
      const labels = within(nav).getAllByRole('button').map((b) => b.textContent);
      expect(labels).toEqual(expected);
    });

    it.each([...expected, 'Changelog'])(
      'sits immediately after About, as the bar’s last child, with %s active',
      (active) => {
        const { nav, link } = renderBar(active, modelOpen);
        const row = nav.firstElementChild;
        expect(row?.lastElementChild).toBe(link);
        expect(link.previousElementSibling?.tagName).toBe('BUTTON');
        expect(link.previousElementSibling?.textContent).toBe('About');
        // Never a tab's shape or active colour, whichever page is active.
        expect(link.className).not.toMatch(/border-b|blue/);
      },
    );
  });
});
