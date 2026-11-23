// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import AppHeader from '../AppHeader';

// The header's two controls need the auth and storage providers, and neither is under test here.
vi.mock('../AuthChip', () => ({ default: () => null }));
vi.mock('../ThemeToggle', () => ({ HeaderThemeToggle: () => null }));

/**
 * The header's SPERT® AHP is drawn as a gradient in AHP's favicon amber (HDR26, v0.18.51), and every point of it
 * stays readable on the ground behind it, in both themes.
 *
 * RE-PINNED ON PURPOSE at v0.19.0 (FRAME26, the suite frame's AHP pilot), when both of HDR26's premises moved:
 *   - the ground: the header's own `bg-white` / `dark:bg-gray-800` (`#1e2939`) became the frame's one page ground,
 *     `--sf-page` in the vendored `spert-frame.css`: `#ffffff` / `#101828`;
 *   - the title: a 20 px `<h1>` with Tailwind gradient classes became the frame's `.sf-title` span (24 px bold, not a
 *     heading: the page's h1 is the heading row's), with the frame's `.sf-grad` on each word, and the ramps declared
 *     once as `--app-grad-light` / `--app-grad-dark` in `src/index.css`;
 *   - the fallbacks: under `prefers-contrast: more` the title is now solid in the frame's heading colour
 *     (`#333333` / `#e2e8f0`), the same in every app (William, 2026-11-23), and in print solid black, both from the
 *     frame's stylesheet, not from classes in AppHeader.tsx.
 * The end colours and the 3 : 1 bar did not move.
 *
 * ⚠️ jsdom has no paint, so nothing here is measured from a render: the end colours are read from `index.css`, the
 * ground, the title's size and the fallbacks from the vendored stylesheet (whose bytes `frame-stylesheet.test.ts`
 * pins), and the contrast is computed here from the WCAG 2.x definition. The rendered page was measured in Chrome by
 * frame-check. The colour maths is the HDR26 plan's Appendix A, typed; it is copied, not shared.
 *
 * The bar is 3 : 1, at every point of each ramp, because the title is large text at every width: 24 px bold, and
 * large means at least 18.66 px at weight 700. A test below holds that premise. The light ramp clears the bar by a
 * hundredth, on purpose: the pinned grounds below are what catches a change that would sink it, and the brand link
 * has no hover fade, which would take it to about 2.4 : 1.
 *
 * This file sits in `__tests__/`, which `tsconfig.json` excludes, so `tsc -b` never type-checks it. It was
 * type-checked standalone under `--strict --noUncheckedIndexedAccess --noUnusedLocals --noUnusedParameters`; redo
 * that if you edit it.
 */
const APP_HEADER = join(process.cwd(), 'src', 'components', 'shell', 'AppHeader.tsx');
const INDEX_CSS = join(process.cwd(), 'src', 'index.css');
const FRAME_CSS = join(process.cwd(), 'src', 'styles', 'spert-frame.css');

const BAR = 3;
/** The frame's page ground in each theme: `--sf-page` in spert-frame.css. Pinned, so a change of ground is seen. */
const PREMISE = { light: '#ffffff', dark: '#101828' } as const;
/** "SPERT" and "AHP": one gradient per word, with the ® between them. */
const GRADIENT_WORDS = ['SPERT', 'AHP'];
/** WCAG's large text, bold: 14 pt = 18.66 px at weight 700 or more. */
const LARGE_BOLD_PX = 18.66;

// ---- Appendix A (HDR26 plan v6), typed ------------------------------------------------------------------------

type Triple = [number, number, number];

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const delin = (v: number) =>
  Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)));
const rgb = (h: string): Triple => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Triple;
const hex = (a: number[]) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('');
const luminance = (h: string) => {
  const [r, g, b] = rgb(h).map(lin) as Triple;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** A contrast ratio to two decimals, truncated: never rounded up across a bar. */
const trunc = (n: number) => (Math.floor(n * 100) / 100).toFixed(2);

const toOklab = (h: string): Triple => {
  const [r, g, b] = rgb(h).map(lin) as Triple;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const linFromOklab = ([lk, a, b]: Triple): Triple => {
  const l = (lk + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lk - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lk - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};
const fromOklab = (lab: Triple) => hex(linFromOklab(lab).map(delin));
const toLch = (h: string): Triple => {
  const [lk, a, b] = toOklab(h);
  return [lk, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
};
const lab = ([lk, c, h]: Triple): Triple => [lk, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];
const inGamut = (lch: Triple) => linFromOklab(lab(lch)).every((v) => v >= -1e-6 && v <= 1 + 1e-6);
/** Fit to sRGB by cutting chroma at fixed lightness and hue; never by clamping channels, which turns the hue. */
const fromLch = ([lk, c, h]: Triple) => {
  let fit = c;
  if (!inGamut([lk, c, h])) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut([lk, mid, h])) lo = mid;
      else hi = mid;
    }
    fit = lo;
  }
  return fromOklab(lab([lk, fit, h]));
};

/**
 * The weakest contrast along a ramp, 41 samples. `oklab` is how the ramps in index.css interpolate (`to right in
 * oklab`, as Tailwind 4's `bg-gradient-to-r` did); `srgb` is a plain gradient's. Both are checked, so a change of
 * interpolation cannot pass.
 */
function weakest(e1: string, e2: string, ground: string, space: 'oklab' | 'srgb'): number {
  let min = Infinity;
  const [a, b] = [toOklab(e1), toOklab(e2)];
  const [p, q] = [rgb(e1), rgb(e2)];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const c =
      space === 'oklab'
        ? fromOklab(a.map((v, k) => v + (b[k]! - v) * t) as Triple)
        : hex(p.map((v, k) => Math.round(v + (q[k]! - v) * t)));
    min = Math.min(min, contrast(c, ground));
  }
  return min;
}

// ---- Reading the source ---------------------------------------------------------------------------------------

// ---- Reading the sources ------------------------------------------------------------------------------------------

const source = () => readFileSync(APP_HEADER, 'utf8');
const indexCss = () => readFileSync(INDEX_CSS, 'utf8');
const frameCss = () => readFileSync(FRAME_CSS, 'utf8');

/** The body of the first rule whose selector list is exactly `selector`, within `css`. Fails loudly if absent. */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`no rule for ${selector}`);
  return m[1]!;
}

/** The text of an `@media (…)` block, from its opening to the next top-level `@media` or the end of the file. */
function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query} {`);
  if (start === -1) throw new Error(`no @media ${query}`);
  const next = css.indexOf('@media', start + 6);
  return css.slice(start, next === -1 ? undefined : next);
}

/** A custom property's value in a rule body: exactly one declaration, or it fails. */
function customProperty(body: string, name: string): string {
  const hits = Array.from(body.matchAll(new RegExp(`${name}\\s*:\\s*([^;]+);`, 'g'))).map((m) => m[1]!.trim());
  if (hits.length !== 1) throw new Error(`${name}: found ${hits.length} declarations, expected exactly 1`);
  return hits[0]!;
}

/** The two ramps from index.css: each exactly `linear-gradient(to right in oklab, #rrggbb, #rrggbb)`. */
function ramp(theme: 'light' | 'dark'): [string, string] {
  const value = customProperty(ruleBody(indexCss(), ':root'), `--app-grad-${theme}`);
  const m = /^linear-gradient\(to right in oklab,\s*(#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)$/i.exec(value);
  if (!m) throw new Error(`--app-grad-${theme} is not a two-stop Oklab ramp: ${value}`);
  return [m[1]!.toLowerCase(), m[2]!.toLowerCase()];
}

/** The frame's `--sf-<name>` in each theme, from the light `:root` block and the dark `:root.dark, …` block. */
function frameToken(name: string): { light: string; dark: string } {
  const css = frameCss();
  return {
    light: customProperty(ruleBody(css, ':root'), `--sf-${name}`).toLowerCase(),
    dark: customProperty(ruleBody(css, ':root.dark, :root[data-theme="dark"]'), `--sf-${name}`).toLowerCase(),
  };
}

/** The title span: `<span className="sf-title" data-sf="title">…</span>`, up to its balancing closing tag. Exactly one. */
function titleSpan(text: string): string {
  const opens = Array.from(text.matchAll(/<span className="sf-title" data-sf="title">/g));
  if (opens.length !== 1) throw new Error(`AppHeader.tsx: found ${opens.length} title spans, expected exactly 1`);
  const start = opens[0]!.index!;
  let depth = 0;
  for (const m of Array.from(text.slice(start).matchAll(/<span\b|<\/span>/g))) {
    depth += m[0] === '</span>' ? -1 : 1;
    if (depth === 0) return text.slice(start, start + m.index! + m[0].length);
  }
  throw new Error('AppHeader.tsx: the title span does not close');
}

/** Every span in the file whose classes include `sf-grad`, with its text. Counted over the WHOLE file, not the title
 *  alone, so a gradient span anywhere else in the header cannot escape the census. */
function gradientSpans(text: string): { classes: string[]; text: string }[] {
  return Array.from(text.matchAll(/<span\s+className="([^"]*)">([^<]*)<\/span>/g))
    .map((m) => ({ classes: m[1]!.split(/\s+/).filter(Boolean), text: m[2]! }))
    .filter((s) => s.classes.includes('sf-grad'));
}

/** The brand link's opening tag. */
function brandTag(text: string): string {
  const start = text.indexOf('<a href="/"');
  if (start === -1) throw new Error('AppHeader.tsx: no brand link <a href="/">');
  return text.slice(start, text.indexOf('>', start) + 1);
}

// ---- The guard --------------------------------------------------------------------------------------------------

describe("the header's SPERT® AHP: a gradient in AHP's amber, readable in both themes (HDR26, on the frame)", () => {
  describe('instrument self-checks', () => {
    it('the contrast formula: #767676 on white is 4.54 : 1', () => {
      expect(trunc(contrast('#767676', '#ffffff'))).toBe('4.54');
    });

    it("the OKLCH steps rebuild the suite's old blue gradient from #0070f3, with its hue turns", () => {
      // As Appendix A writes it. Algebraically this is a round trip of #0099ff and #0051cc through OKLCH and the
      // gamut fit, so it checks those conversions, not the steps themselves.
      const [p, g1, g2] = ['#0070f3', '#0099ff', '#0051cc'].map(toLch) as [Triple, Triple, Triple];
      const stepOf = (g: Triple): Triple => [g[0] - p[0], g[1] / p[1], g[2] - p[2]];
      const withTurn = (fav: string, d: Triple) => {
        const [lk, c, h] = toLch(fav);
        return fromLch([lk + d[0], c * d[1], h + d[2]]);
      };
      expect(withTurn('#0070f3', stepOf(g1))).toBe('#0099ff');
      expect(withTurn('#0070f3', stepOf(g2))).toBe('#0051cc');
    });

    it('the ramp sampler fails a known-bad: the old blue gradient is 2.99 : 1 on white and 2.12 on gray-800', () => {
      // Vacuity control: a sampler that always passed would pass every row below.
      expect(trunc(weakest('#0099ff', '#0051cc', '#ffffff', 'oklab'))).toBe('2.99');
      expect(trunc(weakest('#0099ff', '#0051cc', '#1e2939', 'oklab'))).toBe('2.12');
    });

    it('the CSS readers find what they must, and refuse what is not there', () => {
      // Must-find: a reader that found nothing would make every row below vacuous.
      expect(ruleBody('a { x: 1; } :root { --y: 2; }', ':root')).toContain('--y');
      expect(() => ruleBody('a { x: 1; }', ':root')).toThrow(/no rule/);
      expect(() => customProperty('--a: 1; --a: 2;', '--a')).toThrow(/exactly 1/);
    });
  });

  it('the title has exactly two gradient spans, SPERT and AHP, inside the title, with no space inside either', () => {
    // The census. The space before "AHP" is text of the title (HDR26 ruling F1): inside a span, jsdom's accessible
    // name loses it.
    const spans = gradientSpans(source());
    expect(spans.map((s) => s.text)).toEqual(GRADIENT_WORDS);
    const title = titleSpan(source());
    for (const word of GRADIENT_WORDS) expect(title).toContain(`<span className="sf-grad">${word}</span>`);
    expect(title).toContain(`<span className="sf-mark">®</span>{' '}<span className="sf-grad">AHP</span>`);
  });

  it('the gradient spans carry only the frame class: no size, weight, colour or other class (R5)', () => {
    for (const span of gradientSpans(source())) expect(span.classes, span.text).toEqual(['sf-grad']);
  });

  it("renders 'SPERT® AHP' with its space, as the brand link's whole name, and the header has no heading", () => {
    render(createElement(AppHeader, { onOpenSettings: () => {}, onNavigateHome: () => {} }));
    const header = screen.getByRole('banner');
    expect(header.querySelector('[data-sf="title"]')?.textContent).toBe('SPERT® AHP');
    expect(within(header).getByRole('link', { name: 'SPERT® AHP' })).toBeDefined();
    // The title stopped being the page's h1 at v0.19.0: the heading row's h1 is the page's only one.
    expect(within(header).queryAllByRole('heading')).toEqual([]);
  });

  it('the ramps are declared once each in index.css, in Oklab, and the frame draws them on .sf-grad by theme', () => {
    expect(ramp('light')).toHaveLength(2);
    expect(ramp('dark')).toHaveLength(2);
    const css = frameCss();
    expect(ruleBody(css, '.sf-grad')).toMatch(/background-image:\s*var\(--app-grad-light\)/);
    expect(ruleBody(css, ':root.dark .sf-grad, :root[data-theme="dark"] .sf-grad')).toMatch(
      /background-image:\s*var\(--app-grad-dark\)/,
    );
  });

  it('the bar is 3 : 1 because the title is large text at every width: the frame sets it 24 px bold', () => {
    const title = ruleBody(frameCss(), '.sf-title');
    const font = /font:\s*(\d+)\s+(\d+(?:\.\d+)?)px\//.exec(title);
    expect(font, 'the .sf-title font shorthand').not.toBeNull();
    expect(Number(font![1])).toBeGreaterThanOrEqual(700);
    expect(Number(font![2])).toBeGreaterThanOrEqual(LARGE_BOLD_PX);
    // And nothing in AppHeader.tsx resizes it: the title span carries no Tailwind text size.
    expect(titleSpan(source())).not.toMatch(/\btext-(?:xs|sm|base|lg|\d?xl|\[)/);
  });

  it("the ground resolves, through the vendored stylesheet, to the pinned premise in each theme", () => {
    expect(frameToken('page')).toEqual(PREMISE);
    // The brand row and the app paint that ground, and nothing in the header paints another.
    const css = frameCss();
    expect(ruleBody(css, '.sf-bar')).toMatch(/background:\s*var\(--sf-page\)/);
    expect(/<header className="sf-bar">/.test(source())).toBe(true);
    expect(source()).not.toMatch(/\b(?:dark:)?bg-(?:white|black|[a-z]+-\d{2,3})\b/);
  });

  it('nothing on the brand link or the title paints a ground of its own or fades the title (D7)', () => {
    // The page is the title's ground only while the link paints none, and a hover fade would sink a ramp that clears
    // the bar by a hundredth.
    const tag = brandTag(source());
    expect(tag).toContain('className="sf-brand"');
    expect(tag).not.toMatch(/aria-label|opacity|hover:|\bbg-/);
    const brand = ruleBody(frameCss(), '.sf-brand');
    expect(brand).not.toMatch(/opacity|background/);
    expect(frameCss()).not.toMatch(/\.sf-brand:hover/);
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`${theme}: every point of the ramp meets ${BAR} : 1 on the page ground, in Oklab and in sRGB`, () => {
      const [from, to] = ramp(theme);
      for (const space of ['oklab', 'srgb'] as const) {
        const w = weakest(from, to, PREMISE[theme], space);
        expect(w, `${theme} ${from} → ${to} on ${PREMISE[theme]} (${space}): ${trunc(w)}`).toBeGreaterThanOrEqual(BAR);
      }
    });
  }

  it("falls back to the frame's solid heading colour under prefers-contrast: more, and to black in print", () => {
    const more = ruleBody(mediaBlock(frameCss(), '(prefers-contrast: more)'), '.sf-grad');
    expect(more).toMatch(/background-image:\s*none\s*!important/);
    expect(more).toMatch(/-webkit-text-fill-color:\s*currentColor\s*!important/);
    expect(more).toMatch(/color:\s*var\(--sf-heading\)\s*!important/);
    const print = ruleBody(mediaBlock(frameCss(), 'print'), '.sf-grad');
    expect(print).toMatch(/background-image:\s*none\s*!important/);
    expect(print).toMatch(/color:\s*#000\s*!important/);
  });

  it('the increased-contrast colour is the contract\'s, and meets the bar on the ground', () => {
    const heading = frameToken('heading');
    expect(heading).toEqual({ light: '#333333', dark: '#e2e8f0' });
    expect(contrast(heading.light, PREMISE.light)).toBeGreaterThanOrEqual(BAR);
    expect(contrast(heading.dark, PREMISE.dark)).toBeGreaterThanOrEqual(BAR);
  });
});
