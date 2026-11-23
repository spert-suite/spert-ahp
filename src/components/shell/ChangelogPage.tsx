// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { CHANGELOG } from './changelogData';
import HeadingRow from './HeadingRow';
import { formatDateLong } from '../../lib/formatChangelogDate';

export default function ChangelogPage() {
  return (
    // A fragment: the heading row is a direct child of the frame's `main` and stays full width; the entries keep their
    // own 672 px measure (`max-w-2xl`), aligned to the column's left edge (X4), 16 px under the row.
    <>
      <HeadingRow>Changelog</HeadingRow>
      <div className="sf-below max-w-2xl">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Current version: {CHANGELOG[0]?.version ?? 'unknown'}
      </p>

      <div className="mt-8 space-y-10">
        {CHANGELOG.map((entry, i) => (
          <div
            key={entry.version}
            className={`pb-8 ${
              i < CHANGELOG.length - 1
                ? 'border-b border-gray-200 dark:border-gray-700'
                : ''
            }`}
          >
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                v{entry.version}
              </h2>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {formatDateLong(entry.date)}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {entry.sections.map((section) => (
                <div key={section.title}>
                  <h3 className="font-medium dark:text-gray-200">{section.title}</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-6 text-sm text-gray-600 dark:text-gray-400">
                    {section.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
