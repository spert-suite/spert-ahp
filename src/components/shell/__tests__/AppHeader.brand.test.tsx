// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import AppHeader from '../AppHeader';

// The header's two controls need the auth and storage providers, and neither is under test here.
vi.mock('../AuthChip', () => ({ default: () => <button type="button">chip</button> }));
vi.mock('../ThemeToggle', () => ({ HeaderThemeToggle: () => <button type="button">theme</button> }));
afterEach(() => cleanup());

/**
 * The brand (FRAME26, v0.19.0; contract §3 "Brand link"): one LINK to the collection screen, named by its visible
 * title. Before the frame it was a <button> named "Return to Decisions" around an <h1> reading "SPERT® AHP": the name
 * a speech-input user would say was not the name it had (WCAG 2.5.3, label in name), and the title was the page's h1.
 *
 * AHP has no routes, and "/" is the Decisions screen (a fresh load never reopens a decision), so the link points there
 * and a plain click is handled in the app: close the open decision, show Decisions. A modified click is the browser's.
 */
function renderHeader() {
  const onNavigateHome = vi.fn();
  render(<AppHeader onOpenSettings={() => {}} onNavigateHome={onNavigateHome} />);
  const brand = within(screen.getByRole('banner')).getByRole('link');
  return { brand, onNavigateHome };
}

describe('the brand link', () => {
  it('is a link to "/", named by its visible title, with no aria-label', () => {
    const { brand } = renderHeader();
    expect(brand.tagName).toBe('A');
    expect(brand.getAttribute('href')).toBe('/');
    expect(brand.hasAttribute('aria-label')).toBe(false);
    expect(screen.getByRole('link', { name: 'SPERT® AHP' })).toBe(brand);
    expect(brand.getAttribute('data-sf')).toBe('brand');
  });

  it('holds both favicons (decorative) and the title, and nothing else', () => {
    const { brand } = renderHeader();
    const imgs = Array.from(brand.querySelectorAll('img'));
    expect(imgs.map((i) => [i.getAttribute('alt'), i.className.split(' ').slice(0, 2).join(' ')])).toEqual([
      ['', 'sf-icon sf-icon--light'],
      ['', 'sf-icon sf-icon--dark'],
    ]);
    expect(Array.from(brand.children).map((c) => c.getAttribute('data-sf'))).toEqual(['favicon', 'favicon', 'title']);
  });

  it('is the header’s first focusable element, before the theme button and the chip', () => {
    renderHeader();
    const focusables = Array.from(screen.getByRole('banner').querySelectorAll('a[href], button'));
    expect(focusables.map((e) => e.textContent)).toEqual(['SPERT® AHP', 'theme', 'chip']);
  });

  it('a plain click is handled in the app: it shows Decisions and the browser does not navigate', () => {
    const { brand, onNavigateHome } = renderHeader();
    const notPrevented = fireEvent.click(brand, { button: 0 });
    expect(notPrevented).toBe(false);
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it.each([['metaKey'], ['ctrlKey'], ['shiftKey'], ['altKey']])('a %s click is left to the browser (a new tab or window)', (key) => {
    const { brand, onNavigateHome } = renderHeader();
    const notPrevented = fireEvent.click(brand, { button: 0, [key]: true });
    expect(notPrevented).toBe(true);
    expect(onNavigateHome).not.toHaveBeenCalled();
  });

  it('the tagline follows the brand, outside the link', () => {
    const { brand } = renderHeader();
    expect(brand.nextElementSibling?.textContent).toBe('Decision-making with the Analytic Hierarchy Process');
    expect(brand.nextElementSibling?.getAttribute('data-sf')).toBe('tagline');
  });
});
