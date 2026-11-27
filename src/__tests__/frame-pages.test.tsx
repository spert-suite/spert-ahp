// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { TestProviders } from './test-utils';

/**
 * The suite frame (FRAME26, v0.19.0), page by page, through the real App: every screen the navigation row or the
 * footer leads to is walked by clicking, as a user would, and on each one:
 *
 *   - the page has exactly ONE `h1`, and it is the heading row's (`[data-sf="headrow"]`), a direct child of `main`
 *     (contract §2: the collection heading is the page's h1, the brand title is not a heading). A direct child,
 *     because a capped screen (X4) caps every other child of `main`; the heading row must stay full width;
 *   - the header holds no heading at all;
 *   - `aria-current="page"` marks exactly one navigation item, the page's own, on every page an item leads to, and
 *     none on the changelog, which only the footer's Version button reaches (contract §3, "Active item");
 *   - `main` is capped (exception X4) on every page but the Decisions collection.
 *
 * jsdom has no layout, so geometry and colour are frame-check's (measured in Chrome); this file holds the structure.
 */

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // jsdom has no matchMedia; useTheme asks it for the OS theme.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const navRow = () => screen.getByRole('navigation');
const go = (label: string) => fireEvent.click(within(navRow()).getByRole('button', { name: label }));
const main = () => document.querySelector('[data-sf="main"]') as HTMLElement;

function expectPage(h1: string, current: string | null) {
  const headings = screen.getAllByRole('heading', { level: 1 });
  expect(headings.map((h) => h.textContent), 'the page has exactly one h1').toEqual([h1]);
  const row = headings[0]!.closest('[data-sf="headrow"]');
  expect(row, 'the h1 is the heading row’s').not.toBeNull();
  expect(row!.parentElement, 'the heading row is a direct child of main').toBe(main());
  expect(within(screen.getByRole('banner')).queryAllByRole('heading')).toEqual([]);
  const marked = Array.from(navRow().querySelectorAll('[aria-current]'));
  expect(marked.map((e) => `${e.textContent}=${e.getAttribute('aria-current')}`)).toEqual(
    current === null ? [] : [`${current}=page`],
  );
  expect(main().classList.contains('sf-main--capped'), 'X4: every page but Decisions is capped').toBe(h1 !== 'Decisions');
}

describe('the frame, page by page (FRAME26)', () => {
  it('with no decision open: Decisions, Decision, Compare, Results, Settings, About, then the changelog', async () => {
    render(<TestProviders><App /></TestProviders>);
    await screen.findByText(/^Create a decision to name your goal/);
    expectPage('Decisions', 'Decisions');
    go('Decision');
    expectPage('No decision open', 'Decision');
    go('Compare');
    expectPage('No decision open', 'Compare');
    go('Results');
    expectPage('No decision open', 'Results');
    go('Settings');
    expectPage('Settings', 'Settings');
    go('About');
    expectPage('About This App', 'About');
    fireEvent.click(within(screen.getByRole('contentinfo')).getByRole('button', { name: /^Version / }));
    expectPage('Changelog', null);
  });

  it('with a decision open: its name is the h1 on Decision, Compare, Results and Manage', async () => {
    render(<TestProviders><App /></TestProviders>);
    await screen.findByText(/^Create a decision to name your goal/);
    fireEvent.click(screen.getByRole('button', { name: 'New Decision' }));
    await waitFor(() => expect(within(navRow()).queryByRole('button', { name: 'Manage' })).not.toBeNull());
    await waitFor(() => expectPage('Untitled decision', 'Decision'));
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.getAttribute('title'), 'the full name is in title, for an ellipsised heading').toBe('Untitled decision');
    for (const page of ['Compare', 'Results', 'Manage']) {
      go(page);
      expectPage('Untitled decision', page);
    }
    go('Decisions');
    expectPage('Decisions', 'Decisions');
  });

  // Contract §7 "Empty collection" (frame v2): the panel that stands in for the tile grid carries data-sf="empty", so
  // frame-check measures it on a first visit instead of reporting tiles.found; it never shows beside a grid. Since
  // v0.20.0 it is the Welcome panel (`DashboardPanel.welcome.test.tsx` holds its markup); the hook and place are here.
  it('hooks the empty Decisions panel data-sf="empty" in place of the tile grid, and drops it once a decision exists', async () => {
    render(<TestProviders><App /></TestProviders>);
    await screen.findByText(/^Create a decision to name your goal/);
    const empty = Array.from(document.querySelectorAll('[data-sf="empty"]'));
    expect(empty, 'exactly one empty panel').toHaveLength(1);
    expect(empty[0]!.textContent).toMatch(/^Welcome to SPERT® AHP/);
    expect(main().contains(empty[0]!), 'inside main').toBe(true);
    const row = document.querySelector('[data-sf="headrow"]') as HTMLElement;
    expect(row.compareDocumentPosition(empty[0]!) & Node.DOCUMENT_POSITION_FOLLOWING, 'after the heading row').toBeTruthy();
    expect(document.querySelector('[data-sf="tiles"]'), 'no tile grid beside it').toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'New Decision' }));
    await waitFor(() => expect(within(navRow()).queryByRole('button', { name: 'Manage' })).not.toBeNull());
    go('Decisions');
    await waitFor(() => expect(document.querySelector('[data-sf="tiles"]')).not.toBeNull());
    expect(document.querySelectorAll('[data-sf="empty"]'), 'no empty panel beside the grid').toHaveLength(0);
  });

  it('puts the app-wide notices in the notices slot, before main, with the frame’s dismiss buttons', async () => {
    render(<TestProviders><App /></TestProviders>);
    await screen.findByText(/^Create a decision to name your goal/);
    const slot = document.querySelector('[data-sf="notices"]') as HTMLElement;
    expect(slot.compareDocumentPosition(main()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const gotIt = within(slot).getAllByRole('button', { name: 'Got it' });
    expect(gotIt).toHaveLength(2); // terms, then the local-storage caution, in suite order
    for (const b of gotIt) expect(b.className).toBe('sf-notice-dismiss');
    expect(within(main()).queryByRole('button', { name: 'Got it' })).toBeNull();
  });

  it('starts with the skip link, which targets main', async () => {
    render(<TestProviders><App /></TestProviders>);
    await screen.findByText(/^Create a decision to name your goal/);
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip.getAttribute('href')).toBe(`#${main().id}`);
    const app = document.querySelector('[data-sf="app"]') as HTMLElement;
    expect(app.firstElementChild).toBe(skip);
  });
});
