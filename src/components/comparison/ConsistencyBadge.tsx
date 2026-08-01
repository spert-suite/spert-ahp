// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { ConsistencyResult, CompletionTier } from '../../types/ahp';

interface ConsistencyBadgeProps {
  cr: ConsistencyResult | null;
  tier: CompletionTier;
}

export default function ConsistencyBadge({ cr, tier }: ConsistencyBadgeProps) {
  if (!cr || cr.cr === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        {cr?.confidenceLabel ?? `Tier ${tier} — Consistency Ratio not available`}
      </span>
    );
  }

  const crValue = cr.cr;
  const isGood = crValue <= 0.10;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isGood
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      }`}
      title={cr.confidenceLabel}
    >
      CR: {(crValue * 100).toFixed(1)}%
      {isGood ? ' (acceptable)' : ' (inconsistent)'}
    </span>
  );
}
