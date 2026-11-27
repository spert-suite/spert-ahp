// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// Adding a guide to public/? Also add it, with a one-line description, to spertsuite.com's src/data/help.ts
// (spert-landing-page): frame-check's About screen compares this page's Guides with that list.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import AboutPage from '../components/shell/AboutPage';
import AppFooter from '../components/shell/AppFooter';
import { CHANGELOG } from '../components/shell/changelogData';

/**
 * The About page (FRAME26 pass 3, v0.21.0): contract §3 About page and §7 About, with William's words of 2026-11-27.
 * The shared words are compared as frame-check compares them: the screen-reader text (`.sf-sr`) left out, runs of
 * whitespace as one space, typographic quotes and apostrophes as straight ones.
 */
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const TITLE = 'SPERT® AHP';
const REPO = 'https://github.com/spert-suite/spert-ahp';

function renderAbout(onNavigate?: (tab: string) => void) {
  const { container } = render(<AboutPage onNavigate={onNavigate} />);
  return { container, about: container.querySelector<HTMLElement>('[data-sf="about"]')! };
}

/** An element's words as a reader sees them: no `.sf-sr`, whitespace collapsed, quotes straightened. */
function words(el: Element | null | undefined): string {
  if (!el) return '(absent)';
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('.sf-sr').forEach((s) => s.remove());
  return (copy.textContent ?? '').replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();
}

const sections = (about: HTMLElement) => Array.from(about.children) as HTMLElement[];
const section = (about: HTMLElement, h2: string) => sections(about).find((s) => words(s.querySelector('h2')) === h2)!;
const paras = (s: HTMLElement) => Array.from(s.querySelectorAll(':scope > p'));

describe('AboutPage (FRAME26 pass 3)', () => {
  it('the heading is "About SPERT® AHP", and the page is the heading row\'s next sibling', () => {
    // Until v0.21.0: "About This App", 14 px text in an 896 px measure, blue h3s.
    const { container, about } = renderAbout();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe(`About ${TITLE}`);
    expect(h1.querySelector('span')!.getAttribute('class')).toBe('sf-mark');
    expect(container.querySelector('[data-sf="headrow"]')!.nextElementSibling).toBe(about);
    expect(about.classList.contains('sf-about')).toBe(true);
  });

  it("its sections in §7's order, each a <section> opening with its h2, no Connect AI; How it works an ol of 5", () => {
    const { about } = renderAbout();
    expect(sections(about).map((s) => s.tagName)).toEqual(Array(6).fill('SECTION'));
    expect(sections(about).map((s) => s.firstElementChild!.tagName)).toEqual(Array(6).fill('H2'));
    expect(sections(about).map((s) => words(s.querySelector('h2')))).toEqual([
      `What is ${TITLE}?`,
      'How it works',
      'The 1–9 scale',
      'Guides',
      'Your data and storage',
      'Version and license',
    ]);
    const how = section(about, 'How it works');
    expect(how.querySelector('ul')).toBeNull();
    expect(how.querySelectorAll('ol > li')).toHaveLength(5);
    const what = section(about, `What is ${TITLE}?`);
    expect(paras(what).map(words)[1]).toBe(`${TITLE} is part of the SPERT® Suite of project management tools.`);
  });

  it('bold only where a list item opens with its label, around the label alone (William, 2026-11-27)', () => {
    const { about } = renderAbout();
    const bold = Array.from(about.querySelectorAll('strong, b'));
    expect(bold.map((b) => b.textContent)).toEqual([
      'Pairwise comparisons:',
      'Consistency checking:',
      'Group decision support:',
      'Sensitivity analysis:',
    ]);
    for (const b of bold) {
      expect(b.parentElement!.tagName).toBe('LI');
      expect(b.parentElement!.firstChild).toBe(b);
    }
  });

  it('Guides: the help.ts row, verbatim, with Open PDF ↗ to its file in a new tab, then More help', () => {
    const { about } = renderAbout();
    const g = section(about, 'Guides');
    const list = within(g).getByRole('list');
    expect(list.classList.contains('sf-guides')).toBe(true);
    expect(list.getAttribute('data-sf')).toBe('guides');
    const rows = Array.from(list.children) as HTMLElement[];
    expect(rows.map((r) => [r.tagName, r.className])).toEqual([['LI', 'sf-guide']]);
    const row = rows[0]!;
    expect(words(row.querySelector('h3.sf-guide-title'))).toBe('Quick Reference Guide');
    expect(words(row.querySelector('p.sf-guide-text'))).toBe(
      'What AHP is and how it ranks alternatives by comparing your criteria in pairs, then checks your judgments for consistency.',
    );
    const open = row.querySelector('a.sf-guide-open')!;
    expect(open.getAttribute('href')).toBe('/SPERT_AHP_Quick_Reference_Guide.pdf');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener noreferrer');
    expect(words(open)).toBe('Open PDF ↗');
    // Its name as a screen reader hears it: the "↗" is aria-hidden, the `.sf-sr` text is read.
    const heard = open.cloneNode(true) as Element;
    heard.querySelectorAll('[aria-hidden="true"]').forEach((e) => e.remove());
    expect(heard.textContent).toBe('Open PDF: Quick Reference Guide (opens in a new tab)');
    const more = paras(g);
    expect(more.map(words)).toEqual(['More help in the Help Center ↗']);
    const a = more[0]!.querySelector('a')!;
    expect([a.getAttribute('href'), a.target, a.rel]).toEqual(['https://spertsuite.com/help/ahp', '_blank', 'noopener noreferrer']);
  });

  it("Your data and storage: §7's two paragraphs, and no longer the localStorage claims", () => {
    // Until v0.21.0: "currently stores all data in your browser's localStorage" and "Data never leaves your device";
    // AHP has had cloud storage since before the frame (Rev-ABOUT PREMISES).
    const { container, about } = renderAbout();
    expect(paras(section(about, 'Your data and storage')).map(words)).toEqual([
      `Unless you sign in and choose cloud storage, ${TITLE} keeps your decisions in this browser, on this device, and sends them to no server. Clearing this site's data deletes them, so export a backup from time to time.`,
      'If you sign in, with Google or with a Microsoft work or school account, and choose cloud storage, your decisions are saved to your account in Google Firebase, over encrypted (HTTPS) connections. You can then open them on any device and share them with other people.',
    ]);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/localStorage/i);
    expect(text).not.toMatch(/never leaves your device/i);
  });

  it("Version and license: §7's five paragraphs, the changelog's version, source and LICENSE in a new tab", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 27));
    const { about } = renderAbout();
    const legal = sections(about).at(-1)!;
    expect(legal.classList.contains('sf-about-legal')).toBe(true);
    expect(legal.getAttribute('data-sf')).toBe('about-legal');
    expect(paras(legal).map(words)).toEqual([
      `Version ${CHANGELOG[0]!.version} · What's new`,
      'Created by William W. Davis, MSPM, PMP · Source code on GitHub ↗',
      `© 2026 William W. Davis, MSPM, PMP. ${TITLE} is free software: you may use, change and share it under the GNU General Public License, version 3, with the additional terms its LICENSE ↗ adds under Section 7 of that license: attribution and legal notices, trademarks, the marking of modified versions, endorsement, and indemnification.`,
      'SPERT®, Statistical PERT® and Estimation Made Easy® are registered trademarks of famousdavis, LLC. GanttApp™ and MyScrumBudget™ are trademarks of famousdavis, LLC.',
      'THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.',
    ]);
    expect(paras(legal)[4]!.textContent).toContain('"AS IS"');
    const links = Array.from(legal.querySelectorAll('a')).map((a) => [a.getAttribute('href'), a.target, a.rel]);
    expect(links).toEqual([
      [REPO, '_blank', 'noopener noreferrer'],
      [`${REPO}/blob/main/LICENSE`, '_blank', 'noopener noreferrer'],
    ]);
  });

  it("What's new is a button that calls the page switch with 'Changelog', as the footer's Version does", () => {
    const aboutNav = vi.fn();
    const { about } = renderAbout(aboutNav);
    const legal = sections(about).at(-1)!;
    const whatsNew = within(legal).getByRole('button', { name: 'What’s new' });
    expect(whatsNew.getAttribute('type')).toBe('button');
    fireEvent.click(whatsNew);
    cleanup();
    const footerNav = vi.fn();
    render(<AppFooter onNavigate={footerNav} />);
    fireEvent.click(screen.getByRole('button', { name: /^Version / }));
    expect(aboutNav.mock.calls).toEqual([['Changelog']]);
    expect(aboutNav.mock.calls).toEqual(footerNav.mock.calls);
  });

  it("every ® and ™ on the page is the frame's mark, the glyph alone in a .sf-mark (™ with --tm)", () => {
    const { about } = renderAbout();
    const walker = document.createTreeWalker(about, NodeFilter.SHOW_TEXT);
    const found: string[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent ?? '';
      if (!/[®™]/.test(t)) continue;
      const span = n.parentElement!;
      expect(t).toMatch(/^[®™]$/);
      expect(span.childNodes).toHaveLength(1);
      expect(span.getAttribute('class')).toBe(t === '™' ? 'sf-mark sf-mark--tm' : 'sf-mark');
      found.push(t);
    }
    // What is (heading 1, text 3), data 1, legal 1 + 3, then the two ™.
    expect(found.join('')).toBe('®'.repeat(9) + '™™');
  });

  it("no utility or dark: class inside the page but What's new's four utilities (Q1)", () => {
    // v4 draws links only, and AHP has no page addresses, so What's new is a button with the links' look from the
    // stylesheet's own tokens. That one element is the only exception, by name.
    const { about } = renderAbout();
    const frame = /^sf-[a-z-]+$/;
    const offenders = Array.from(about.querySelectorAll('[class]'))
      .filter((e) => words(e) !== "What's new")
      .flatMap((e) => Array.from(e.classList))
      .filter((c) => !frame.test(c));
    expect(offenders).toEqual([]);
    const whatsNew = within(sections(about).at(-1)!).getByRole('button');
    expect(whatsNew.className).toBe('cursor-pointer text-[color:var(--sf-link)] underline underline-offset-2');
  });
});

describe('the © year (Y1, v0.21.0)', () => {
  it('is the current year in the footer and on the About page, from one source', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2031, 0, 15));
    const { container } = render(
      <>
        <AboutPage />
        <AppFooter />
      </>,
    );
    expect(container.querySelector('footer')!.textContent).toMatch(/© 2031 William W\. Davis/);
    expect(container.querySelector('[data-sf="about-legal"]')!.textContent).toMatch(/© 2031 William W\. Davis/);
    // One source: neither file computes the year itself.
    const shell = join(process.cwd(), 'src', 'components', 'shell');
    for (const f of ['AboutPage.tsx', 'AppFooter.tsx']) {
      const src = readFileSync(join(shell, f), 'utf8');
      expect(src, f).toContain('copyrightYear()');
      expect(src, f).not.toMatch(/getFullYear|©\s*20\d\d|&copy;\s*20\d\d/);
    }
  });
});

describe('the repository address (A1, v0.21.0)', () => {
  it('nothing in src/ or LICENSE names the old famousdavis address, which only redirects to spert-suite/spert-ahp', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? files(p) : [p];
      });
    const OLD = ['famousdavis', 'spert-ahp'].join('/');
    const hits = [...files(join(process.cwd(), 'src')), join(process.cwd(), 'LICENSE')].filter((f) =>
      readFileSync(f, 'utf8').includes(OLD),
    );
    expect(hits).toEqual([]);
  });
});
