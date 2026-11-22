// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import AppHeader from '../AppHeader';

// The header's two controls need the auth and storage providers, and neither is under test here.
vi.mock('../AuthChip', () => ({ default: () => null }));
vi.mock('../ThemeToggle', () => ({ HeaderThemeToggle: () => null }));

/**
 * The header's SPERT® AHP is drawn as a gradient in AHP's favicon amber (HDR26, v0.18.51), and every point of it
 * stays readable on the header behind it, in both themes.
 *
 * ⚠️ jsdom has no paint, so nothing here is measured from a render: the end colours are read from `AppHeader.tsx`'s
 * source, the header's background from its classes, resolved through the installed Tailwind's own `theme.css`, and
 * the contrast is computed here from the WCAG 2.x definition. The rendered page was measured in Chrome when this was
 * written. The colour maths is the HDR26 plan's Appendix A, typed; it is copied, not shared. Modelled on
 * spert-scheduler's `Layout.title-gradient.test.ts`.
 *
 * The bar is 3 : 1, at every point of each ramp, because the title is large text at every width: 20 px bold
 * (`text-xl font-bold`, no responsive size), and large means at least 18.66 px at weight 700. A test below holds that
 * premise, since a smaller title would need 4.5 : 1. The light ramp clears the bar by a hundredth, on purpose: the
 * pinned backgrounds below are what catches a change that would sink it, and the button has no hover fade, which
 * would take it to about 2.4 : 1.
 *
 * This file sits in `__tests__/`, which `tsconfig.json` excludes, so `tsc -b` never type-checks it. It was
 * type-checked standalone under `--strict --noUncheckedIndexedAccess --noUnusedLocals --noUnusedParameters`; redo
 * that if you edit it.
 */
const APP_HEADER = join(process.cwd(), 'src', 'components', 'shell', 'AppHeader.tsx');
const THEME_CSS = join(process.cwd(), 'node_modules', 'tailwindcss', 'theme.css');

const BAR = 3;
/** The header's background in each theme, measured in Chrome (`getComputedStyle`, read through a canvas). */
const PREMISE = { light: '#ffffff', dark: '#1e2939' } as const;
/** "SPERT" and "AHP": one gradient per word, with the ® between them. */
const GRADIENT_SPANS = 2;
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

/** A colour as Tailwind's theme.css writes it: `#rgb`, `#rrggbb`, or `oklch(L% C H)` with H possibly `none`. */
function parseCssColor(value: string): string {
  const v = value.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) return '#' + Array.from(m[1]!, (c) => c + c).join('').toLowerCase();
  m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return '#' + m[1]!.toLowerCase();
  m = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\s*\)$/i.exec(v);
  if (m) return fromOklab(lab([Number(m[1]) / 100, Number(m[2]), m[3] === 'none' ? 0 : Number(m[3])]));
  throw new Error('unreadable color: ' + v);
}

/**
 * The weakest contrast along a ramp, 41 samples. `oklab` is how Tailwind 4's `bg-gradient-to-r` interpolates
 * (`to right in oklab`); `srgb` is a plain gradient's. Both are checked, so a change of interpolation cannot pass.
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

const source = () => readFileSync(APP_HEADER, 'utf8');
const themeCss = () => readFileSync(THEME_CSS, 'utf8');

/** Every `const NAME = '…'` (or "…") in the file, so a `className={NAME}` can be resolved to the classes it carries. */
function stringConstants(text: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const m of Array.from(text.matchAll(/\bconst\s+([A-Za-z_]\w*)\s*=\s*(?:'([^']*)'|"([^"]*)")/g)))
    found.set(m[1]!, (m[2] ?? m[3])!);
  return found;
}

/** Where the JSX `<h1 className=…>` opens. Comments may say "`<h1>`"; only the element with attributes counts. */
const H1_OPEN = /<h1\s+className=/g;

/** The title: the one `<h1 className=…>` in the file, up to its closing tag. */
function titleH1(text: string): string {
  const opens = Array.from(text.matchAll(H1_OPEN));
  if (opens.length !== 1) throw new Error(`AppHeader.tsx: found ${opens.length} <h1 className=…>, expected exactly 1`);
  const start = opens[0]!.index!;
  const end = text.indexOf('</h1>', start);
  if (end === -1) throw new Error('AppHeader.tsx: the <h1> does not close');
  return text.slice(start, end);
}

/** The `<button …>` whose content is the title: the last one opened before the `<h1>`. */
function titleButtonTag(text: string): string {
  const h1 = Array.from(text.matchAll(H1_OPEN))[0]?.index ?? -1;
  const start = text.lastIndexOf('<button', h1);
  const end = text.indexOf('>', start);
  if (start === -1 || end === -1 || end > h1) throw new Error('AppHeader.tsx: the title is not inside a <button>');
  return text.slice(start, end + 1);
}

const classAttr = (tag: string, what: string) => {
  const m = /\bclassName="([^"]*)"/.exec(tag);
  if (!m) throw new Error(`AppHeader.tsx: ${what} has no static className`);
  return m[1]!.split(/\s+/).filter(Boolean);
};
const h1Classes = (text: string) => classAttr(titleH1(text).slice(0, titleH1(text).indexOf('>') + 1), 'the <h1>');
const buttonClasses = (text: string) => classAttr(titleButtonTag(text), 'the title button');

interface GradientSpan {
  classes: string[];
  text: string;
}

/**
 * Every span in the title whose classes clip a background to its text: a literal `className="…"`, or a
 * `className={NAME}` resolved through the file's string constants. Found by `bg-clip-text`, not by the constant's
 * name, so a span given its own literal cannot escape the count. A class name that cannot be resolved fails loudly.
 */
function gradientSpans(text: string): GradientSpan[] {
  const constants = stringConstants(text);
  const spans: GradientSpan[] = [];
  for (const m of Array.from(titleH1(text).matchAll(/<span\s+className=(?:"([^"]*)"|\{(\w+)\})>([^<]*)<\/span>/g))) {
    const raw = m[1] ?? constants.get(m[2]!);
    if (raw === undefined) throw new Error(`AppHeader.tsx: className={${m[2]}} is not a string constant`);
    const classes = raw.split(/\s+/).filter(Boolean);
    if (classes.includes('bg-clip-text')) spans.push({ classes, text: m[3]! });
  }
  return spans;
}

/** The one class with this exact variant and utility, e.g. `dark:` + `from-` → `#ffc785`. Exactly one, or it fails. */
function endColor(classes: string[], variant: '' | 'dark:', utility: 'from' | 'to'): string {
  const pattern = new RegExp(`^${variant}${utility}-\\[(#[0-9a-f]{6})\\]$`, 'i');
  const hits = classes.map((c) => pattern.exec(c)?.[1]).filter((h): h is string => h !== undefined);
  if (hits.length !== 1) throw new Error(`${variant}${utility}-[#…]: found ${hits.length}, expected exactly 1`);
  return hits[0]!.toLowerCase();
}

interface Ends {
  light: [string, string];
  dark: [string, string];
}

const endsOf = (classes: string[]): Ends => ({
  light: [endColor(classes, '', 'from'), endColor(classes, '', 'to')],
  dark: [endColor(classes, 'dark:', 'from'), endColor(classes, 'dark:', 'to')],
});

/**
 * A class list's one colour class for a variant: `bg-white` → `white` for `bg-`, `dark:bg-gray-800` → `gray-800`.
 * Only colour shapes count, so the `<h1>`'s `text-xl` is not read as a colour.
 */
function colorToken(classes: string[], head: string): string {
  const shape = new RegExp(`^${head}(?:white|black|[a-z]+-\\d{2,3})$`);
  const hits = classes.filter((c) => shape.test(c)).map((c) => c.slice(head.length));
  if (hits.length !== 1) throw new Error(`${head}…: found ${hits.length}, expected exactly 1`);
  return hits[0]!;
}

/** A Tailwind colour token's value in the installed theme.css (`white` → `#fff`), as #rrggbb. */
function themeColor(token: string): string {
  const m = new RegExp(`--color-${token}:\\s*([^;]+);`).exec(themeCss());
  if (!m) throw new Error(`theme.css: no --color-${token}`);
  return parseCssColor(m[1]!);
}

function headerClasses(text: string): string[] {
  const m = /<header\s+className="([^"]*)"/.exec(text);
  if (!m) throw new Error('AppHeader.tsx: no <header> with a static className');
  return m[1]!.split(/\s+/);
}

/** What the gradient string may carry (R5): the gradient, its `dark:` ends, and the two fallbacks. Nothing else. */
const ALLOWED = [
  /^bg-gradient-to-r$/,
  /^(?:dark:)?(?:from|to)-\[#[0-9a-f]{6}\]$/i,
  /^bg-clip-text$/,
  /^text-transparent$/,
  /^(?:print|contrast-more):bg-none$/,
  /^(?:print|contrast-more|dark:contrast-more):text-[a-z]+-\d{2,3}$/,
];

// ---- The guard --------------------------------------------------------------------------------------------------

describe("the header's SPERT® AHP: a gradient in AHP's amber, readable in both themes (HDR26)", () => {
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

    it("parseCssColor reads Tailwind's #fff and 'none'-hue forms, and refuses what it cannot read", () => {
      expect(parseCssColor('#fff')).toBe('#ffffff');
      expect(parseCssColor('oklch(98.5% 0 none)')).toBe('#fafafa');
      expect(parseCssColor('oklch(27.8% 0.033 256.848)')).toBe('#1e2939');
      expect(() => parseCssColor('rgb(1, 2, 3)')).toThrow(/unreadable/);
    });

    it('the ramp sampler fails a known-bad: the old blue gradient is 2.99 : 1 on white and 2.12 on gray-800', () => {
      // Vacuity control: a sampler that always passed would pass every row below.
      expect(trunc(weakest('#0099ff', '#0051cc', '#ffffff', 'oklab'))).toBe('2.99');
      expect(trunc(weakest('#0099ff', '#0051cc', '#1e2939', 'oklab'))).toBe('2.12');
    });
  });

  it('the title has exactly two gradient spans, SPERT and AHP, with no space inside either', () => {
    // Must-find, and the census: a reader that found nothing would pass every row below. The space before "AHP" is
    // text of the <h1> (HDR26 ruling F1): inside the span, jsdom's accessible name loses it.
    const spans = gradientSpans(source());
    expect(spans.map((s) => s.text)).toEqual(['SPERT', 'AHP']);
    expect(spans).toHaveLength(GRADIENT_SPANS);
  });

  it("the heading still reads 'SPERT® AHP', with its space, and the button is still 'Return to Decisions'", () => {
    // The rendered side of the same rule: jsdom computes the accessible name from the DOM the source produces.
    render(createElement(AppHeader, { onOpenSettings: () => {}, onNavigateHome: () => {} }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('SPERT® AHP');
    expect(screen.getByRole('heading', { level: 1, name: 'SPERT® AHP' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Return to Decisions' })).toBeDefined();
  });

  it('both gradient spans carry the same four end colours', () => {
    const [first, ...rest] = gradientSpans(source()).map((s) => endsOf(s.classes));
    expect(first).toBeDefined();
    for (const other of rest) expect(other).toEqual(first);
  });

  it('the gradient string carries only the gradient and its fallbacks: no size, weight or other class (R5)', () => {
    for (const span of gradientSpans(source())) {
      const stray = span.classes.filter((c) => !ALLOWED.some((re) => re.test(c)));
      expect(stray, `${span.text}: classes outside the gradient string's list`).toEqual([]);
      expect(span.classes).toEqual(expect.arrayContaining(['bg-gradient-to-r', 'bg-clip-text', 'text-transparent']));
    }
  });

  it('the bar is 3 : 1 because the title is large text at every width: 20 px bold, with no responsive size', () => {
    const h1 = h1Classes(source());
    const sizes = h1.filter((c) => /(?:^|:)text-(?:xs|sm|base|lg|\d?xl|\[)/.test(c));
    expect(sizes).toEqual(['text-xl']);
    expect(h1).toContain('font-bold');
    const css = themeCss();
    const rem = /--text-xl:\s*([\d.]+)rem;/.exec(css);
    const weight = /--font-weight-bold:\s*(\d+);/.exec(css);
    expect(Number(rem?.[1]) * 16).toBeGreaterThanOrEqual(LARGE_BOLD_PX);
    expect(Number(weight?.[1])).toBeGreaterThanOrEqual(700);
  });

  it("the header's background resolves, through the installed Tailwind, to the pinned premise in each theme", () => {
    const header = headerClasses(source());
    expect(themeColor(colorToken(header, 'bg-'))).toBe(PREMISE.light);
    expect(themeColor(colorToken(header, 'dark:bg-'))).toBe(PREMISE.dark);
  });

  it('nothing on the title button or the <h1> paints a ground of its own or fades the title (D7)', () => {
    // The header is the title's ground only while the button paints none (its `bg-transparent` paints nothing), and
    // a hover fade would sink a ramp that clears the bar by a hundredth. The button keeps its cursor and focus ring.
    const button = buttonClasses(source());
    expect(titleButtonTag(source())).toContain('aria-label="Return to Decisions"');
    expect(button.filter((c) => /(?:^|:)bg-/.test(c))).toEqual(['bg-transparent']);
    expect(button.filter((c) => /(?:^|:)opacity-/.test(c) || /(?:^|:)hover:/.test(c))).toEqual([]);
    expect(button).toEqual(expect.arrayContaining(['cursor-pointer', 'focus-visible:ring-2']));
    expect(h1Classes(source()).filter((c) => /(?:^|:)(?:bg-|opacity-)/.test(c))).toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`${theme}: every point of the ramp meets ${BAR} : 1 on the header, in Oklab and in sRGB`, () => {
      for (const span of gradientSpans(source())) {
        const [from, to] = endsOf(span.classes)[theme];
        for (const space of ['oklab', 'srgb'] as const) {
          const w = weakest(from, to, PREMISE[theme], space);
          expect(w, `${span.text} ${theme} ${from} → ${to} on ${PREMISE[theme]} (${space}): ${trunc(w)}`)
            .toBeGreaterThanOrEqual(BAR);
        }
      }
    });
  }

  it("falls back to the <h1>'s own solid colours in print and under prefers-contrast: more", () => {
    // The fallbacks use the <h1>'s own near-black and near-white, so they cannot drift from the title's colours.
    const h1 = h1Classes(source());
    const nearBlack = colorToken(h1, 'text-');
    const nearWhite = colorToken(h1, 'dark:text-');
    for (const span of gradientSpans(source())) {
      expect(span.classes, span.text).toEqual(
        expect.arrayContaining([
          'print:bg-none',
          `print:text-${nearBlack}`,
          'contrast-more:bg-none',
          `contrast-more:text-${nearBlack}`,
          `dark:contrast-more:text-${nearWhite}`,
        ]),
      );
    }
  });

  it('the increased-contrast colours meet the bar on the header too', () => {
    const h1 = h1Classes(source());
    expect(contrast(themeColor(colorToken(h1, 'text-')), PREMISE.light)).toBeGreaterThanOrEqual(BAR);
    expect(contrast(themeColor(colorToken(h1, 'dark:text-')), PREMISE.dark)).toBeGreaterThanOrEqual(BAR);
  });
});
