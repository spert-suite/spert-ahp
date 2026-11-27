// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CrashBoundary, CrashScreen } from '../CrashScreen';

/**
 * v0.20.0 (FRAME26 clean-up E; contract §7, "Errors"): the outermost crash screen. Until v0.20.0 a fault in the frame,
 * a provider or App left a blank page. It stays outside the frame, on the page ground (#ffffff / #101828) with the
 * frame's heading and muted text colours, in the stored theme (`spert-theme`) even when App never set it, and offers
 * Reload. One wording in every SPERT® app (William, 2026-11-26).
 */
function Boom(): never {
  throw new Error('boom');
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('dark');
});

describe('the crash screen', () => {
  it('a fault below the boundary shows it, outside the frame: the words, the brand with its ®, and Reload', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReload = vi.fn();
    render(
      <CrashBoundary onReload={onReload}>
        <Boom />
      </CrashBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Something went wrong');
    expect(screen.getByRole('alert').querySelector('p')!.innerHTML).toBe(
      'SPERT<span class="sf-mark">®</span> AHP could not display this page. Reload to try again.',
    );
    expect(document.querySelector('[data-sf="app"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('control: with no fault, the boundary renders its children', () => {
    render(
      <CrashBoundary>
        <p>the app</p>
      </CrashBoundary>,
    );
    expect(screen.getByText('the app')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('is drawn on the page ground in the frame’s text colours, in both themes', () => {
    render(<CrashScreen onReload={() => {}} />);
    const el = screen.getByRole('alert');
    for (const c of ['bg-white', 'dark:bg-[#101828]', 'min-h-screen']) expect(el.classList.contains(c), c).toBe(true);
    const h = screen.getByRole('heading');
    expect(h.classList.contains('text-[#333333]') && h.classList.contains('dark:text-[#e2e8f0]')).toBe(true);
    const p = el.querySelector('p')!;
    expect(p.classList.contains('text-[#6a7282]') && p.classList.contains('dark:text-[#99a1af]')).toBe(true);
  });

  it('re-applies the stored theme: dark sets the class, light clears it', () => {
    localStorage.setItem('spert-theme', 'dark');
    render(<CrashScreen onReload={() => {}} />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    cleanup();
    localStorage.setItem('spert-theme', 'light');
    render(<CrashScreen onReload={() => {}} />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('follows the OS under system, and still draws when storage and matchMedia both throw', () => {
    localStorage.setItem('spert-theme', 'system');
    // AHP's jsdom has no matchMedia: stub it.
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: /dark/.test(q), media: q }) as unknown as MediaQueryList);
    render(<CrashScreen onReload={() => {}} />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    cleanup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage');
    });
    vi.stubGlobal('matchMedia', () => {
      throw new Error('matchMedia');
    });
    expect(() => render(<CrashScreen onReload={() => {}} />)).not.toThrow();
    expect(screen.getByRole('heading').textContent).toBe('Something went wrong');
  });

  it('main.tsx wraps the providers in the boundary, inside StrictMode', () => {
    const main = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
    expect(main).toMatch(/<React\.StrictMode>[\s\S]*<CrashBoundary>\s*<AuthProvider>/);
    expect(main).toMatch(/<\/AuthProvider>\s*<\/CrashBoundary>\s*<\/React\.StrictMode>/);
  });
});
