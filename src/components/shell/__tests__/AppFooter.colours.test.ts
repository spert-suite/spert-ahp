// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AppFooter from '../AppFooter';

/**
 * The footer's link colours (FRAME26, v0.19.0). Until the frame, every footer link was `text-blue-600` with no dark
 * variant: #155dfc on the dark ground, 3.38 : 1, under the 4.5 bar. On the frame, the footer's links and its Version
 * button take `--sf-link` from the vendored stylesheet: #155dfc on #ffffff (5.25) and #51a2ff on #101828 (6.73).
 *
 * ⚠️ jsdom has no paint and no var() cascade, so this cannot measure the rendered colour (frame-check does, in Chrome:
 * `footer.link-colour`). What it holds is what made the defect possible: a colour utility or an inline colour on a
 * footer link. Either would be dead under the unlayered stylesheet, or (inline) would beat it, and would hide which
 * colour the footer really has. The token values are read from the stylesheet and measured here.
 */
const FRAME_CSS = join(process.cwd(), 'src', 'styles', 'spert-frame.css');
const APP_FOOTER = join(process.cwd(), 'src', 'components', 'shell', 'AppFooter.tsx');

const rgb = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h: string) => { const [r, g, b] = rgb(h).map(lin) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function token(name: string): { light: string; dark: string } {
  const css = readFileSync(FRAME_CSS, 'utf8');
  const block = (sel: string) => { const i = css.indexOf(`${sel} {`); if (i === -1) throw new Error(`no ${sel}`); return css.slice(i, css.indexOf('}', i)); };
  const value = (body: string) => { const m = new RegExp(`--sf-${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(body); if (!m) throw new Error(`no --sf-${name}`); return m[1]!.toLowerCase(); };
  return { light: value(block(':root')), dark: value(block(':root.dark, :root[data-theme="dark"]')) };
}

describe('the footer’s link colours (FRAME26)', () => {
  it('every footer link and the Version button carry no colour of their own', () => {
    render(createElement(AppFooter, {}));
    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toBe('sf-footer');
    const links = within(footer).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['SPERT® Suite', 'Terms of Service', 'Privacy Policy', 'License']);
    for (const a of links) {
      expect(a.className, a.textContent ?? '').toBe('');
      expect(a.style.color).toBe('');
    }
    const version = within(footer).getByRole('button', { name: /^Version / });
    expect(version.className).toBe('sf-link');
    expect(version.style.color).toBe('');
  });

  it('AppFooter.tsx sets no colour utility and no inline style anywhere', () => {
    const code = readFileSync(APP_FOOTER, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(?:dark:|hover:)?text-(?:blue|gray|slate|black|white|[a-z]+-\d{2,3})/);
    expect(code).not.toMatch(/style=/);
  });

  it('the stylesheet gives footer links --sf-link, and --sf-link meets 4.5 : 1 on the page ground in both themes', () => {
    const css = readFileSync(FRAME_CSS, 'utf8');
    expect(css).toMatch(/\.sf-footer a, \.sf-footer \.sf-link \{ color: var\(--sf-link\);/);
    const link = token('link'), page = token('page');
    expect(link).toEqual({ light: '#155dfc', dark: '#51a2ff' });
    expect(contrast(link.light, page.light)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(link.dark, page.dark)).toBeGreaterThanOrEqual(4.5);
  });

  it('the old colour would fail: #155dfc on the dark ground is under 4.5 (vacuity control)', () => {
    expect(contrast('#155dfc', token('page').dark)).toBeLessThan(4.5);
  });
});
