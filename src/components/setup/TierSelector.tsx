// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { COMPARISON_TIERS } from '../../core/models/constants';
import type { CompletionTier } from '../../types/ahp';

interface TierSelectorProps {
  value: CompletionTier;
  onChange: (tier: CompletionTier) => void;
  disabled: boolean;
}

export default function TierSelector({ value, onChange, disabled }: TierSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Comparison Tier
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(COMPARISON_TIERS) as [string, typeof COMPARISON_TIERS[CompletionTier]][]).map(([tier, config]) => (
          <button
            key={tier}
            onClick={() => onChange(Number(tier) as CompletionTier)}
            disabled={disabled}
            className={`p-3 rounded-lg border text-left text-sm transition-colors ${
              Number(tier) === value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                : disabled
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            <div className="font-medium">{config.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Consistency Ratio confidence: {config.crConfidence}
            </div>
          </button>
        ))}
      </div>
      {disabled && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Tier is locked after the first response.
        </p>
      )}
    </div>
  );
}
