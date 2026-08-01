// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { StructuredItem } from '../../types/ahp';

interface PriorityChartProps {
  items: StructuredItem[];
  scores: number[];
  title?: string;
}

export default function PriorityChart({ items, scores, title }: PriorityChartProps) {
  if (!items || !scores || items.length === 0) return null;

  const data = items
    .map((item, i) => ({
      name: item.label,
      score: scores[i] ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h3>}
      <ol className="space-y-3">
        {data.map((d, i) => (
          <li key={`${i}-${d.name}`}>
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem] gap-2 items-baseline">
              <span className="text-sm text-gray-500 dark:text-gray-500 tabular-nums">{i + 1}.</span>
              <span className="min-w-0 whitespace-normal break-words text-sm text-gray-800 dark:text-gray-200">
                {d.name}
              </span>
              <span className="text-right text-sm tabular-nums text-gray-600 dark:text-gray-400">
                {(d.score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-blue-500 rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${d.score * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
