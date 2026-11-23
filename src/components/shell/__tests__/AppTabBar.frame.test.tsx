// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppTabBar from '../AppTabBar';

// The navigation row's two zones (FRAME26, v0.19.0; contract §3 "Navigation zones" and "Active item"). Every label is
// a LITERAL here, never read from appTabs.ts, so an entry added there cannot make its own test agree with it.
//
//   left  (nav-work): the collection first, then the open decision's views; Manage only while one is open
//   right (nav-app):  Settings · About · Help Center ↗, always in that order, Help Center last
//
// The frame's stylesheet draws the active underline from aria-current="page" alone, so the attribute IS the active
// state: exactly one item carries it on a page an item leads to, none on the changelog, and only ever the value "page".

const WORK_WITHOUT_MODEL = ['Decisions', 'Decision', 'Compare', 'Results'];
const WORK_WITH_MODEL = ['Decisions', 'Decision', 'Compare', 'Results', 'Manage'];
const APP_ZONE = ['Settings', 'About', 'Help Center ↗ (opens in a new tab)'];

function renderRow(activePage: string, modelOpen: boolean) {
  render(<AppTabBar activePage={activePage} modelOpen={modelOpen} onSelect={() => {}} />);
  const nav = screen.getByRole('navigation');
  const work = nav.querySelector('[data-sf="nav-work"]') as HTMLElement;
  const app = nav.querySelector('[data-sf="nav-app"]') as HTMLElement;
  const text = (zone: HTMLElement) => Array.from(zone.children).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim());
  return { nav, work, app, text };
}

describe('AppTabBar — the frame’s two zones', () => {
  it('carries the frame’s hooks and classes: nav, its row, and the two zones', () => {
    const { nav, work, app } = renderRow('Decisions', true);
    expect(nav.getAttribute('data-sf')).toBe('nav');
    expect(nav.className).toBe('sf-nav');
    expect(nav.firstElementChild?.className).toBe('sf-col sf-nav-row');
    expect(work.className).toBe('sf-nav-work');
    expect(app.className).toBe('sf-nav-app');
    expect(work.nextElementSibling).toBe(app);
  });

  it.each([
    ['no decision open', false, WORK_WITHOUT_MODEL],
    ['a decision open', true, WORK_WITH_MODEL],
  ])('with %s: the work zone, then Settings · About · Help Center', (_label, modelOpen, work) => {
    const r = renderRow('Decisions', modelOpen);
    expect(r.text(r.work)).toEqual(work);
    expect(r.text(r.app)).toEqual(APP_ZONE);
    expect(r.app.lastElementChild?.tagName).toBe('A');
    expect(r.app.lastElementChild?.className).toBe('sf-help');
  });

  it.each([...WORK_WITH_MODEL, 'Settings', 'About'])('on %s, exactly one item is current: its own', (page) => {
    const { nav } = renderRow(page, true);
    const current = Array.from(nav.querySelectorAll('[aria-current]'));
    expect(current.map((e) => [e.textContent, e.getAttribute('aria-current')])).toEqual([[page, 'page']]);
  });

  it('on the changelog, which no item leads to, nothing is current', () => {
    const { nav } = renderRow('Changelog', true);
    expect(nav.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('never marks the Help Center link current', () => {
    for (const page of [...WORK_WITH_MODEL, 'Settings', 'About', 'Changelog']) {
      const { app } = renderRow(page, true);
      expect(app.lastElementChild?.hasAttribute('aria-current')).toBe(false);
      document.body.innerHTML = '';
    }
  });
});
