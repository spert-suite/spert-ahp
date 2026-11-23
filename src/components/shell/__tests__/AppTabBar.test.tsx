// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AppTabBar from '../AppTabBar';

// The tab bar's existing behaviour, pinned when it moved out of App.tsx at v0.18.50, and moved onto the suite frame
// (FRAME26) at v0.19.0. The frame changed two things these tests used to pin: the collection item is "Decisions" (it
// was "Dashboard"), and the active item is marked by aria-current="page" (it was a set of Tailwind classes; the
// frame's stylesheet now draws the underline from the attribute). The zones have their own file,
// AppTabBar.frame.test.tsx; the Help Center link has AppTabBar.help-center.test.tsx.

const ALL_PAGES = ['Decisions', 'Decision', 'Compare', 'Results', 'Manage', 'Settings', 'About'];

function buttons(activePage: string, modelOpen: boolean, onSelect = vi.fn()) {
  render(<AppTabBar activePage={activePage} modelOpen={modelOpen} onSelect={onSelect} />);
  return within(screen.getByRole('navigation')).getAllByRole('button');
}

describe('AppTabBar — existing tab behaviour', () => {
  it('calls onSelect with each tab’s own page, and About with About', () => {
    const onSelect = vi.fn();
    const bar = buttons('Decisions', true, onSelect);
    for (const b of bar) fireEvent.click(b);
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual(ALL_PAGES);
  });

  it.each(ALL_PAGES)('marks %s, and nothing else, as the current page; every item is a frame tab', (active) => {
    const bar = buttons(active, true);
    for (const b of bar) {
      expect(b.className).toBe('sf-tab');
      if (b.textContent === active) expect(b.getAttribute('aria-current')).toBe('page');
      else expect(b.hasAttribute('aria-current')).toBe(false);
    }
  });

  it('marks nothing active on a page that is not in the bar (Changelog)', () => {
    for (const b of buttons('Changelog', true)) {
      expect(b.hasAttribute('aria-current')).toBe(false);
    }
  });

  it('shows Manage only when a model is open', () => {
    expect(buttons('Decisions', false).map((b) => b.textContent)).not.toContain('Manage');
  });

  it('shows Manage, between Results and Settings, when a model is open', () => {
    const labels = buttons('Decisions', true).map((b) => b.textContent);
    expect(labels.slice(labels.indexOf('Results'), labels.indexOf('Settings') + 1)).toEqual([
      'Results',
      'Manage',
      'Settings',
    ]);
  });
});
