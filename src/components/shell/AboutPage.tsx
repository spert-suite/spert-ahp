// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { CHANGELOG } from './changelogData';

const R = () => <sup className="text-[0.45em] text-gray-400 font-normal tracking-wide align-super">&reg;</sup>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold text-blue-600 dark:text-blue-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}

interface AboutPageProps {
  onNavigate?: (tab: string) => void;
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">About This App</h1>

      {/* Purpose */}
      <Section title="Purpose">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <strong>SPERT<R /> AHP</strong> is a browser-based decision-making application based on the
          Analytic Hierarchy Process (AHP), developed by Thomas L. Saaty. AHP helps you make complex
          decisions by breaking them down into a hierarchy of criteria and alternatives, then comparing
          them pairwise using a structured 1–9 ratio scale. Features include:
        </p>
        <ul className="mt-2 ml-6 list-disc text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
          <li><strong>Pairwise comparisons:</strong> Compare criteria and alternatives on a 1–9 importance scale with four completion tiers (Quick, Balanced, Thorough, Complete)</li>
          <li><strong>Consistency checking:</strong> Automatic Consistency Ratio (CR) calculation with repair suggestions for inconsistent judgments</li>
          <li><strong>Group decision support:</strong> AIJ and AIP aggregation methods with Kendall's W concordance and disagreement analytics</li>
          <li><strong>Sensitivity analysis:</strong> Parameter sweep with crossover detection to test how robust your rankings are</li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
          SPERT<R /> AHP is part of the <strong>SPERT<R /> Suite</strong> of project management tools.
        </p>
      </Section>

      {/* How It Works */}
      <Section title="How It Works">
        <ol className="ml-6 list-decimal text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
          <li>Define your decision criteria and alternatives</li>
          <li>Compare items pairwise on a 1–9 importance scale</li>
          <li>The system derives priority weights using mathematical methods (LLSM+RAS or principal eigenvector)</li>
          <li>Consistency checks ensure your judgments are logically sound</li>
          <li>Results show the overall ranking with sensitivity analysis</li>
        </ol>
      </Section>

      {/* The 1-9 Scale */}
      <Section title="The 1–9 Scale">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Each comparison asks: how much more important is item A compared to item B?
          A value of 1 means equally important, 3 means moderately more, 5 strongly
          more, 7 very strongly more, and 9 extremely more important. Intermediate
          values (2, 4, 6, 8) represent compromises between adjacent judgments.
        </p>
      </Section>

      {/* Your Data & Security */}
      <Section title="Your Data & Security">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
          SPERT<R /> AHP currently stores all data in your <strong>browser's localStorage</strong>.
        </p>
        <ul className="ml-6 list-disc text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
          <li>Data never leaves your device — no external servers, no third-party access</li>
          <li>Ideal for corporate or organizational environments where data must stay in-house</li>
          <li><strong>Note:</strong> Clearing your browser cache/data will delete all stored decisions</li>
        </ul>
      </Section>

      {/* Quick Reference Guide */}
      <Section title="Quick Reference Guide">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
          Open the quick reference guide for a printable overview of
          SPERT<R /> AHP's features and workflow.
        </p>
        <a
          href="/SPERT_AHP_Quick_Reference_Guide.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Quick Reference Guide (PDF)
        </a>
      </Section>

      {/* Version Updates */}
      <Section title="Version Updates">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          When new versions are released, your data remains safe in localStorage.
          Current version:{' '}
          <button
            onClick={() => onNavigate?.('Changelog')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            v{CHANGELOG[0]?.version ?? '0.0.0'}
          </button>
        </p>
      </Section>

      {/* Author & Source Code */}
      <Section title="Author & Source Code">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
          Created by <strong>William W. Davis, MSPM, PMP</strong>
        </p>
        <a
          href="https://github.com/famousdavis/spert-ahp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Source Code on GitHub
        </a>
      </Section>

      {/* License */}
      <Section title="License">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          This software is licensed under the <strong>GNU General Public License v3.0 (GPL-3.0)</strong>.
          You are free to use, modify, and distribute this software under the terms of the GPL-3.0 license.
        </p>
      </Section>

      {/* No Warranty Disclaimer */}
      <Section title="No Warranty Disclaimer">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN
          OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM
          &ldquo;AS IS&rdquo; WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT
          NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
          THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM
          PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.
        </p>
      </Section>
    </div>
  );
}
