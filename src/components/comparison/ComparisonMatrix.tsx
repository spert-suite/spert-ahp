// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { StructuredItem, ComparisonMap } from '../../types/ahp';

interface ComparisonMatrixProps {
  items: StructuredItem[];
  comparisons: ComparisonMap;
  onCellClick?: (i: number, j: number) => void;
}

export default function ComparisonMatrix({ items, comparisons, onCellClick }: ComparisonMatrixProps) {
  const n = items.length;
  if (n < 2) return <p className="text-sm text-gray-500 dark:text-gray-400">Add at least 2 items to compare.</p>;

  const getValue = (i: number, j: number): number | null | string => {
    if (i === j) return '1';
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const key = `${lo},${hi}`;
    const raw = comparisons[key];
    if (raw === undefined) return null;
    if (i < j) return raw;
    return 1 / raw;
  };

  const formatValue = (val: number | null | string): string => {
    if (val === null) return '—';
    if (val === 1 || val === '1') return '1';
    if (typeof val === 'string') return val;
    if (val >= 1) return val.toFixed(1);
    return `1/${(1 / val).toFixed(1)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white dark:bg-gray-800 z-10 p-2 border border-gray-200 dark:border-gray-700 text-left font-medium text-gray-500 dark:text-gray-400 min-w-[120px]">
              vs.
            </th>
            {items.map((item) => (
              <th key={item.id} className="p-2 border border-gray-200 dark:border-gray-700 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((rowItem, i) => (
            <tr key={rowItem.id}>
              <td className="sticky left-0 bg-white dark:bg-gray-800 z-10 p-2 border border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300">
                {rowItem.label}
              </td>
              {items.map((colItem, j) => {
                const val = getValue(i, j);
                const isUpperTriangle = i < j;
                const isSet = val !== null && i !== j;
                return (
                  <td
                    key={colItem.id}
                    onClick={() => isUpperTriangle && onCellClick?.(i, j)}
                    className={`p-2 border border-gray-200 dark:border-gray-700 text-center ${
                      i === j
                        ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500'
                        : isUpperTriangle
                          ? isSet
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-dashed'
                          : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {i === j ? '1' : formatValue(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
