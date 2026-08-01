// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { ConfidenceResult, ConfidenceLevel } from '../../types/ahp';

const COLORS: Record<ConfidenceLevel, string> = {
  RED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  AMBER: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  GREEN: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

interface SynthesisConfidenceBadgeProps {
  confidence: ConfidenceResult | null;
}

export default function SynthesisConfidenceBadge({ confidence }: SynthesisConfidenceBadgeProps) {
  if (!confidence) return null;

  const { level, signals } = confidence;

  return (
    <div className="relative group inline-block">
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${COLORS[level]}`}>
        {level}
      </span>
      <div className="hidden group-hover:block absolute z-20 left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Voters:</span><span>{signals.voterCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Consistency Ratio:</span><span>{(signals.avgCR * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Kendall W:</span><span>{signals.kendallW.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Max CV:</span><span>{signals.maxCV.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pair coverage:</span><span>{(signals.pairCoverage * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
