// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { ReactNode } from 'react';
import { CHANGELOG } from './changelogData';
import { copyrightYear } from './copyrightYear';
import HeadingRow from './HeadingRow';

/** The app's GitHub repository and Help Center address, as the Help Center's list (`help.ts`) gives them. */
const REPO_URL = 'https://github.com/spert-suite/spert-ahp';
const HELP_URL = 'https://spertsuite.com/help/ahp';

/**
 * The guide, exactly as the Help Center lists it (`spert-landing-page/src/data/help.ts`, landing v2.15.2): file, title
 * and description. frame-check compares the row with help.ts on GitHub's `main`, so a change there is a change here.
 */
const GUIDES: readonly { file: string; title: string; description: string }[] = [
  {
    file: 'SPERT_AHP_Quick_Reference_Guide.pdf',
    title: 'Quick Reference Guide',
    description:
      'What AHP is and how it ranks alternatives by comparing your criteria in pairs, then checks your judgments for consistency.',
  },
];

/** A registered-trademark mark: the glyph alone in the frame's `.sf-mark` (contract §4), which v4 scales to its line. */
function R() {
  return <span className="sf-mark">®</span>;
}

/** A trademark mark: the glyph alone, `.sf-mark--tm` (never the letters "TM"). */
function TM() {
  return <span className="sf-mark sf-mark--tm">™</span>;
}

/** The brand row's title, with its mark, as every shared sentence names the app. */
function Title() {
  return (
    <>
      SPERT<R /> AHP
    </>
  );
}

/** A link that opens a new tab: "↗" for the eye, "(opens in a new tab)" for screen readers (contract §7 About). */
function NewTab({ href, children, className, sr = ' (opens in a new tab)' }: {
  href: string;
  children: ReactNode;
  className?: string;
  sr?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sf-sr">{sr}</span>
    </a>
  );
}

interface AboutPageProps {
  /** The app's page switch, the one the footer's Version uses: What's new calls it with 'Changelog'. */
  onNavigate?: (tab: string) => void;
}

/**
 * The About page (FRAME26 pass 3, contract §3 About page and §7 About; v0.21.0). The heading row, then the page,
 * `div.sf-about[data-sf=about]`, as `main`'s next child: stylesheet v4 draws all of it (a 672 px column 16 px below the
 * heading row, the type, the guide row and the Version and license block), so nothing inside carries a utility class or
 * a `dark:` one, but one: AHP has no page addresses, so What's new is a button, as the footer's Version is, and v4 draws
 * links only; its four utilities give it the links' look (Orch-FRAME-2, Q1). The sections are §7's, in its
 * order; the words are William's (2026-11-27): AHP's own from the pass's words file, the shared ones from §7. Bold only
 * where a list item opens with its label, around the label alone. Every ® and ™ is a `.sf-mark` holding the glyph alone.
 */
export default function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <>
      <HeadingRow>
        About SPERT<span className="sf-mark">®</span> AHP
      </HeadingRow>
      <div className="sf-about" data-sf="about">
        <section>
          <h2>
            What is <Title />?
          </h2>
          <p>
            <Title /> is a browser-based decision-making application based on the Analytic Hierarchy Process (AHP),
            developed by Thomas L. Saaty. AHP helps you make complex decisions by breaking them down into a hierarchy of
            criteria and alternatives, then comparing them pairwise using a structured 1–9 ratio scale. Features
            include:
          </p>
          <ul>
            <li>
              <strong>Pairwise comparisons:</strong> Compare criteria and alternatives on a 1–9 importance scale with
              four completion tiers (Quick, Balanced, Thorough, Complete)
            </li>
            <li>
              <strong>Consistency checking:</strong> Automatic Consistency Ratio (CR) calculation with repair
              suggestions for inconsistent judgments
            </li>
            <li>
              <strong>Group decision support:</strong> AIJ and AIP aggregation methods with Kendall's W concordance and
              disagreement analytics
            </li>
            <li>
              <strong>Sensitivity analysis:</strong> Parameter sweep with crossover detection to test how robust your
              rankings are
            </li>
          </ul>
          <p>
            <Title /> is part of the SPERT<R /> Suite of project management tools.
          </p>
        </section>

        <section>
          <h2>How it works</h2>
          <ol>
            <li>Define your decision criteria and alternatives</li>
            <li>Compare items pairwise on a 1–9 importance scale</li>
            <li>The system derives priority weights using mathematical methods (LLSM+RAS or principal eigenvector)</li>
            <li>Consistency checks ensure your judgments are logically sound</li>
            <li>Results show the overall ranking with sensitivity analysis</li>
          </ol>
        </section>

        <section>
          <h2>The 1–9 scale</h2>
          <p>
            Each comparison asks: how much more important is item A compared to item B? A value of 1 means equally
            important, 3 means moderately more, 5 strongly more, 7 very strongly more, and 9 extremely more important.
            Intermediate values (2, 4, 6, 8) represent compromises between adjacent judgments.
          </p>
        </section>

        <section>
          <h2>Guides</h2>
          <ul className="sf-guides" data-sf="guides">
            {GUIDES.map((g) => (
              <li key={g.file} className="sf-guide">
                <div className="sf-guide-body">
                  <h3 className="sf-guide-title">{g.title}</h3>
                  <p className="sf-guide-text">{g.description}</p>
                </div>
                <NewTab href={`/${g.file}`} className="sf-guide-open" sr={`: ${g.title} (opens in a new tab)`}>
                  Open PDF
                </NewTab>
              </li>
            ))}
          </ul>
          <p>
            <NewTab href={HELP_URL}>More help in the Help Center</NewTab>
          </p>
        </section>

        <section>
          <h2>Your data and storage</h2>
          <p>
            Unless you sign in and choose cloud storage, <Title /> keeps your decisions in this browser, on this
            device, and sends them to no server. Clearing this site's data deletes them, so export a backup from time
            to time.
          </p>
          <p>
            If you sign in, with Google or with a Microsoft work or school account, and choose cloud storage, your
            decisions are saved to your account in Google Firebase, over encrypted (HTTPS) connections. You can then
            open them on any device and share them with other people.
          </p>
        </section>

        <section className="sf-about-legal" data-sf="about-legal">
          <h2>Version and license</h2>
          <p>
            Version {CHANGELOG[0]?.version ?? 'unknown'} ·{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('Changelog')}
              className="cursor-pointer text-[color:var(--sf-link)] underline underline-offset-2"
            >
              What&rsquo;s new
            </button>
          </p>
          <p>
            Created by William W. Davis, MSPM, PMP · <NewTab href={REPO_URL}>Source code on GitHub</NewTab>
          </p>
          <p>
            © {copyrightYear()} William W. Davis, MSPM, PMP. <Title /> is free software: you may use, change and share
            it under the GNU General Public License, version 3, with the additional terms its{' '}
            <NewTab href={`${REPO_URL}/blob/main/LICENSE`}>LICENSE</NewTab> adds under Section 7 of that license:
            attribution and legal notices, trademarks, the marking of modified versions, endorsement, and
            indemnification.
          </p>
          <p>
            SPERT<R />, Statistical PERT<R /> and Estimation Made Easy<R /> are registered trademarks of famousdavis,
            LLC. GanttApp<TM /> and MyScrumBudget<TM /> are trademarks of famousdavis, LLC.
          </p>
          <p>
            THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE
            STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF
            ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
            MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF
            THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY
            SERVICING, REPAIR OR CORRECTION.
          </p>
        </section>
      </div>
    </>
  );
}
