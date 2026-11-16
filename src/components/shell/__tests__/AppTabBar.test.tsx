// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AppTabBar from '../AppTabBar';

// The tab bar's existing behaviour, pinned when it moved out of App.tsx at v0.18.50. Nothing
// covered the bar before; these hold the move to "nothing changed". The Help Center link has
// its own file, AppTabBar.help-center.test.tsx.

const ALL_PAGES = ['Dashboard', 'Decision', 'Compare', 'Results', 'Manage', 'Settings', 'About'];

const ACTIVE = 'px-4 py-3 text-sm font-medium border-b-2 transition-colors border-blue-500 text-blue-600 dark:text-blue-400';
const INACTIVE =
  'px-4 py-3 text-sm font-medium border-b-2 transition-colors border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500';

function buttons(activePage: string, modelOpen: boolean, onSelect = vi.fn()) {
  render(<AppTabBar activePage={activePage} modelOpen={modelOpen} onSelect={onSelect} />);
  return within(screen.getByRole('navigation')).getAllByRole('button');
}

describe('AppTabBar — existing tab behaviour', () => {
  it('calls onSelect with each tab’s own page, and About with About', () => {
    const onSelect = vi.fn();
    const bar = buttons('Dashboard', true, onSelect);
    for (const b of bar) fireEvent.click(b);
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual(ALL_PAGES);
  });

  it.each(ALL_PAGES)('gives %s the active classes and every other button the inactive ones', (active) => {
    const bar = buttons(active, true);
    for (const b of bar) {
      expect(b.className.replace(/\s+/g, ' ').trim()).toBe(b.textContent === active ? ACTIVE : INACTIVE);
    }
  });

  it('marks nothing active on a page that is not in the bar (Changelog)', () => {
    for (const b of buttons('Changelog', true)) {
      expect(b.className.replace(/\s+/g, ' ').trim()).toBe(INACTIVE);
    }
  });

  it('shows Manage only when a model is open', () => {
    expect(buttons('Dashboard', false).map((b) => b.textContent)).not.toContain('Manage');
  });

  it('shows Manage, between Results and Settings, when a model is open', () => {
    const labels = buttons('Dashboard', true).map((b) => b.textContent);
    expect(labels.slice(labels.indexOf('Results'), labels.indexOf('Settings') + 1)).toEqual([
      'Results',
      'Manage',
      'Settings',
    ]);
  });
});
