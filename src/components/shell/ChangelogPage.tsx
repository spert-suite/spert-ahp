// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { CHANGELOG } from './changelogData';

function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year!, month! - 1, day);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold dark:text-gray-100">Changelog</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
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
  );
}
