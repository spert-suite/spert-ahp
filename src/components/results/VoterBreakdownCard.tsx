// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState } from 'react';
import PriorityChart from './PriorityChart';
import type { ProfileInfo } from '../../hooks/useProfiles';
import type { ConsistencyResult, StructuredItem } from '../../types/ahp';

interface VoterBreakdownCardProps {
  userId: string;
  profile: ProfileInfo | undefined;
  factorWeights: number[] | undefined;
  alternativeScores: number[] | undefined;
  cr: ConsistencyResult | undefined;
  incompleteCriteria: string[];
  criteriaItems: StructuredItem[];
  alternativeItems: StructuredItem[];
}

export default function VoterBreakdownCard({
  userId,
  profile,
  factorWeights,
  alternativeScores,
  cr,
  incompleteCriteria,
  criteriaItems,
  alternativeItems,
}: VoterBreakdownCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayName = profile?.displayName || `${userId.slice(0, 8)}…`;

  // Build a set of criterion IDs that used the uniform fallback, and map to labels
  const incompleteSet = new Set(incompleteCriteria);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</span>
          {profile?.email && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{profile.email}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cr?.cr !== null && cr?.cr !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              cr.isAcceptable
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              CR: {(cr.cr * 100).toFixed(1)}%
            </span>
          )}
          {incompleteCriteria.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {incompleteCriteria.length} incomplete
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500 text-sm">
            {expanded ? '▾' : '▸'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
          {factorWeights && factorWeights.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Factor Weights</h4>
              {incompleteCriteria.length > 0 && (
                <div className="mb-2 space-y-1">
                  {criteriaItems.map((crit) =>
                    incompleteSet.has(crit.id) ? (
                      <div key={crit.id} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                        {crit.label} — <span className="italic">no alternative comparisons</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
              <PriorityChart items={criteriaItems} scores={factorWeights} />
            </div>
          )}

          {alternativeScores && alternativeScores.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Alternative Scores</h4>
              <PriorityChart items={alternativeItems} scores={alternativeScores} />
            </div>
          )}

          {(!factorWeights || factorWeights.length === 0) && (!alternativeScores || alternativeScores.length === 0) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">No individual data available for this voter.</p>
          )}
        </div>
      )}
    </div>
  );
}
