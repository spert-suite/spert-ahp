// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HeaderThemeToggle } from '../ThemeToggle';

/**
 * The theme button's icons (FRAME26, v0.19.0; contract §3 "Utilities"). The icon shows which theme is on, so it
 * carries state and is held to the 3 : 1 non-text bar. Before the frame the sun was a fixed amber `#f59e0b` (2.15 : 1
 * on white) and the whole button sat at 70 % opacity (the sun 1.72, the monitor's stroke 2.76 light and 2.45 dark).
 * On the frame every icon draws in `currentColor`, which is `.sf-theme`'s `--sf-text-muted` (4.84 / 6.82), with no
 * opacity anywhere. jsdom has no paint; the rendered colour is frame-check's. This holds the source of the colour.
 */
const FRAME_CSS = join(process.cwd(), 'src', 'styles', 'spert-frame.css');

let theme: 'light' | 'dark' | 'system' = 'light';
vi.mock('../../../hooks/useTheme', () => ({ useTheme: () => ({ theme, setTheme: () => {}, isInitialized: true }) }));
afterEach(() => cleanup());

const rgb = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h: string) => { const [r, g, b] = rgb(h).map(lin) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function token(name: string, sel: string, css = readFileSync(FRAME_CSS, 'utf8')): string {
  const i = css.indexOf(`${sel} {`); if (i === -1) throw new Error(`no ${sel}`);
  const m = new RegExp(`--sf-${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(css.slice(i, css.indexOf('}', i)));
  if (!m) throw new Error(`no --sf-${name} in ${sel}`); return m[1]!.toLowerCase();
}
const LIGHT = ':root', DARK = ':root.dark, :root[data-theme="dark"]';

describe('the theme button’s icons (FRAME26)', () => {
  it.each(['light', 'dark', 'system'] as const)('%s: the frame’s button, and every icon shape in currentColor or none', (t) => {
    theme = t;
    render(<HeaderThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.className).toBe('sf-theme');
    expect(button.getAttribute('data-sf')).toBe('theme');
    expect(button.getAttribute('aria-label')).toMatch(/^Theme: (Light|Dark|System)\. Switch to (Light|Dark|System)$/);
    const svg = button.querySelector('svg');
    expect(svg).not.toBeNull();
    for (const el of [svg!, ...Array.from(svg!.querySelectorAll('*'))]) {
      for (const attr of ['fill', 'stroke']) {
        const v = el.getAttribute(attr);
        if (v !== null) expect(['currentColor', 'none'], `${el.tagName} ${attr}="${v}"`).toContain(v);
      }
      expect(el.getAttribute('style') ?? '').not.toMatch(/opacity|color|fill|stroke/);
      expect(el.getAttribute('class') ?? '').toBe('');
    }
  });

  it('no opacity on the button: neither a class nor a style', () => {
    theme = 'light';
    render(<HeaderThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.className).not.toMatch(/opacity/);
    expect(button.getAttribute('style')).toBeNull();
  });

  it('the stylesheet draws .sf-theme in the muted colour, which meets 3 : 1 on the page in both themes, and under contrast-more', () => {
    const css = readFileSync(FRAME_CSS, 'utf8');
    expect(css).toMatch(/\.sf-theme \{[^}]*color: var\(--sf-text-muted\)/);
    expect(contrast(token('text-muted', LIGHT), token('page', LIGHT))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('text-muted', DARK), token('page', DARK))).toBeGreaterThanOrEqual(3);
    const more = css.slice(css.indexOf('@media (prefers-contrast: more)'));
    expect(contrast(token('text-muted', LIGHT, more), token('page', LIGHT))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('text-muted', DARK, more), token('page', DARK))).toBeGreaterThanOrEqual(3);
  });

  it('the old sun would fail (vacuity control): #f59e0b on white is under 3 : 1', () => {
    expect(contrast('#f59e0b', token('page', LIGHT))).toBeLessThan(3);
  });
});
