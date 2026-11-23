// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AuthChip from '../AuthChip';

/**
 * The account chip on the frame (FRAME26, v0.19.0), in all three states, at rest and on hover, in both themes.
 *
 * Before the frame, "Sign in" was `#0070f3` in an INLINE style: 3.22 : 1 on the dark header, and 3.90 on the frame's
 * dark ground, under the 4.5 bar, and no `dark:` class could ever reach it. On the frame, the chip's colours are the
 * stylesheet's: the state segment in `--sf-text-muted`, the action segment in `--sf-link`, and on hover the whole chip
 * on `--sf-hover` (`.sf-chip:hover`, canonical since the AHP pilot).
 *
 * ⚠️ jsdom has no paint, so this does not measure the rendered chip (frame-check measures it in Chrome, at rest). It
 * holds two things. First, that no colour is set on the chip by this app: no inline colour, and no colour, background
 * or hover utility on the chip or its segments (dead under the unlayered stylesheet, and misleading). Second, that the
 * stylesheet's colours meet the bars: text 4.5 : 1 at rest and on hover, the icons 3 : 1. Modelled on Scheduler's
 * `AuthButton.contrast.test.tsx`.
 */
const FRAME_CSS = join(process.cwd(), 'src', 'styles', 'spert-frame.css');
const THEME_CSS = join(process.cwd(), 'node_modules', 'tailwindcss', 'theme.css');

let authUser: unknown = null;
let storageMode = 'local';
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: authUser, firebaseAvailable: true, loading: false }),
  getFirstName: () => 'Alexandra',
}));
vi.mock('../../../contexts/StorageContext', () => ({ useStorage: () => ({ mode: storageMode }) }));

afterEach(() => { cleanup(); authUser = null; storageMode = 'local'; });

function renderChip(state: 'signed out' | 'signed in, local' | 'signed in, cloud') {
  authUser = state === 'signed out' ? null : { uid: 'u1' };
  storageMode = state === 'signed in, cloud' ? 'cloud' : 'local';
  render(<AuthChip onOpenSettings={() => {}} />);
  return screen.getByRole('button');
}

// ---- colour maths and readers (WCAG 2.x; Oklab → sRGB as Tailwind's theme.css writes colours) --------------------
const rgb = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h: string) => { const [r, g, b] = rgb(h).map(lin) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const delin = (v: number) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)));
function oklchToHex(l: number, c: number, hDeg: number): string {
  const a = c * Math.cos((hDeg * Math.PI) / 180), b = c * Math.sin((hDeg * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3, M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return '#' + [4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S].map(delin).map((v) => v.toString(16).padStart(2, '0')).join('');
}
/** A Tailwind colour token in the installed theme.css, as #rrggbb (`gray-500` → #6a7282). */
function tailwind(token: string): string {
  const m = new RegExp(`--color-${token}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\);`).exec(readFileSync(THEME_CSS, 'utf8'));
  if (!m) throw new Error(`theme.css: no --color-${token}`);
  return oklchToHex(Number(m[1]) / 100, Number(m[2]), Number(m[3]));
}
function token(name: string): { light: string; dark: string } {
  const css = readFileSync(FRAME_CSS, 'utf8');
  const block = (sel: string) => { const i = css.indexOf(`${sel} {`); if (i === -1) throw new Error(`no ${sel}`); return css.slice(i, css.indexOf('}', i)); };
  const value = (body: string) => { const m = new RegExp(`--sf-${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(body); if (!m) throw new Error(`no --sf-${name}`); return m[1]!.toLowerCase(); };
  return { light: value(block(':root')), dark: value(block(':root.dark, :root[data-theme="dark"]')) };
}

const STATES = ['signed out', 'signed in, local', 'signed in, cloud'] as const;

describe('the account chip on the frame (FRAME26)', () => {
  it.each(STATES)('%s: the frame’s chip and segments, and its accessible name unchanged', (state) => {
    const chip = renderChip(state);
    expect(chip.className).toBe('sf-chip');
    expect(chip.getAttribute('data-sf')).toBe('chip');
    expect(Array.from(chip.children).map((c) => c.className)).toEqual(['sf-chip-state', 'sf-chip-act']);
    expect(chip.getAttribute('aria-label')).toBe(state === 'signed out' ? 'Sign in' : 'Open cloud storage settings');
  });

  it.each(STATES)('%s: no inline colour, and no colour, background or hover utility, on the chip or a segment', (state) => {
    const chip = renderChip(state);
    for (const el of [chip, ...Array.from(chip.querySelectorAll('*'))] as HTMLElement[]) {
      expect(el.style?.color ?? '', el.outerHTML.slice(0, 80)).toBe('');
      const cls = el.getAttribute('class') ?? '';
      expect(cls, el.outerHTML.slice(0, 80)).not.toMatch(/(?:^|\s)(?:[a-z-]+:)*hover:|(?:^|\s)bg-/);
    }
    for (const seg of Array.from(chip.children)) expect(seg.getAttribute('class')).not.toMatch(/\btext-/);
  });

  it('signed out: "Sign in" is the action segment, and the lock draws in currentColor in the state segment', () => {
    const chip = renderChip('signed out');
    const [state, act] = Array.from(chip.children) as [HTMLElement, HTMLElement];
    expect(act.textContent).toBe('Sign in');
    expect(state.textContent).toBe('Local only');
    expect(state.querySelector('svg')?.getAttribute('stroke')).toBe('currentColor');
  });

  it('the stylesheet: hover takes --sf-hover, and the segments take the muted and link colours', () => {
    const css = readFileSync(FRAME_CSS, 'utf8');
    expect(css).toMatch(/\.sf-chip:hover \{ background: var\(--sf-hover\); \}/);
    expect(css).toMatch(/\.sf-chip-state \{[^}]*color: var\(--sf-text-muted\)/);
    expect(css).toMatch(/\.sf-chip-act \{[^}]*color: var\(--sf-link\)/);
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`${theme}: every chip text meets 4.5 : 1 at rest (page) and on hover (--sf-hover)`, () => {
      const grounds = { rest: token('page')[theme], hover: token('hover')[theme] };
      const texts = { 'Local only (muted)': token('text-muted')[theme], 'Sign in (link)': token('link')[theme],
        'first name (gray-900 / gray-100)': tailwind(theme === 'light' ? 'gray-900' : 'gray-100') };
      for (const [g, ground] of Object.entries(grounds))
        for (const [what, fg] of Object.entries(texts))
          expect(contrast(fg, ground), `${what} ${fg} on ${g} ${ground}`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme}: the icons meet 3 : 1 at rest and on hover`, () => {
      const grounds = [token('page')[theme], token('hover')[theme]];
      const icons = { 'signed-out lock (muted)': token('text-muted')[theme], 'cloud (link)': token('link')[theme],
        'signed-in lock (gray-500 / gray-400)': tailwind(theme === 'light' ? 'gray-500' : 'gray-400') };
      for (const ground of grounds)
        for (const [what, fg] of Object.entries(icons))
          expect(contrast(fg, ground), `${what} ${fg} on ${ground}`).toBeGreaterThanOrEqual(3);
    });
  }

  it('the old "Sign in" colour would fail on the dark ground (vacuity control)', () => {
    expect(contrast('#0070f3', token('page').dark)).toBeLessThan(4.5);
  });

  it('the signed-in lock’s classes are the two the icon test measures', () => {
    const chip = renderChip('signed in, local');
    expect(chip.children[1]?.querySelector('svg')?.getAttribute('class')).toBe('text-gray-500 dark:text-gray-400');
  });
});
