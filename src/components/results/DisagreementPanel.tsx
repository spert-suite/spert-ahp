// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { SynthesisBundle, DisagreementBand } from '../../types/ahp';

interface DisagreementPanelProps {
  synthesis: SynthesisBundle | null;
}

const BAND_COLORS: Record<DisagreementBand, string> = {
  agreement: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  mild: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  disagreement: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function DisagreementPanel({ synthesis }: DisagreementPanelProps) {
  const voterCount = synthesis?.summary?.votersIncluded?.length ?? 0;

  if (voterCount < 2) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Disagreement Analysis</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Disagreement analysis requires multiple voters. In Phase 1 (single-user mode),
          this section will populate when multi-user collaboration is enabled in Phase 2.
        </p>
      </div>
    );
  }

  const disagreement = synthesis?.diagnostics?.disagreement;
  if (!disagreement || !disagreement.items) return null;

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Disagreement Analysis</h3>
      <div className="space-y-2">
        {disagreement.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="w-8 text-gray-400 dark:text-gray-500 text-right">{i + 1}.</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${BAND_COLORS[item.band]}`}>
              {item.band}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              CV: {(item.cv * 100).toFixed(1)}%
              {!item.cvReliable && ' (nMAD fallback)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
