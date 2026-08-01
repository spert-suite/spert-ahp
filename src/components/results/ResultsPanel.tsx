// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useMemo, useState } from 'react';
import PriorityChart from './PriorityChart';
import SensitivityChart from './SensitivityChart';
import SynthesisConfidenceBadge from './SynthesisConfidenceBadge';
import DisagreementPanel from './DisagreementPanel';
import VoterBreakdownCard from './VoterBreakdownCard';
import VoterRadarChart from './VoterRadarChart';
import { useSensitivity } from '../../hooks/useSensitivity';
import { useProfiles } from '../../hooks/useProfiles';
import type { UseAHPReturn } from '../../types/ahp';

interface ResultsPanelProps {
  ahpState: UseAHPReturn;
  userId: string;
}

export default function ResultsPanel({ ahpState, userId }: ResultsPanelProps) {
  const [activeCriterion, setActiveCriterion] = useState<number | null>(null);
  const synthesis = ahpState.synthesis;
  const structure = ahpState.structure;

  const criteriaWeights = synthesis?.summary?.aggregatedWeights;
  const localPriorities = synthesis?.summary?.localPriorities ?? [];
  const { sweep, crossovers } = useSensitivity(
    criteriaWeights ?? [],
    localPriorities,
    activeCriterion,
  );

  const currentRole = ahpState.collaborators.find((c) => c.userId === userId)?.role;
  const isOwner = ahpState.collaborators.length === 0 || currentRole === 'owner';
  const visibility = ahpState.model?.resultsVisibility ?? { showAggregatedToVoters: false, showOwnRankingsToVoters: true };
  const canSeeAggregated = isOwner || visibility.showAggregatedToVoters;
  const canSeeOwnRankings = isOwner || visibility.showOwnRankingsToVoters;

  // Voter IDs for profile fetching
  const voterIds = useMemo(
    () => synthesis?.summary?.votersIncluded ?? [],
    [synthesis],
  );
  const profileMap = useProfiles(voterIds);

  if (!ahpState.modelId) {
    return <p className="text-gray-500 dark:text-gray-400">Create a decision first.</p>;
  }

  if (!synthesis) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400">No synthesis results yet.</p>
        <button
          onClick={() => ahpState.runSynthesis()}
          disabled={ahpState.loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {ahpState.loading ? 'Computing...' : 'Run Synthesis'}
        </button>
        {ahpState.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{ahpState.error}</p>
        )}
      </div>
    );
  }

  const individualPriorities = synthesis.individual?.individualPriorities ?? {};
  const individualAltScores = synthesis.individual?.individualAlternativeScores ?? {};
  const individualIncomplete = synthesis.individual?.individualIncompleteCriteria ?? {};
  const individualCR = synthesis.individual?.individualCR ?? {};
  const votersToShow = isOwner
    ? voterIds
    : canSeeOwnRankings ? voterIds.filter((v) => v === userId) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Results</h2>
        <SynthesisConfidenceBadge confidence={synthesis.summary.confidence} />
        {ahpState.model?.synthesisStatus === 'out_of_date' && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            (comparisons changed — re-run synthesis)
          </span>
        )}
        {isOwner && (
          <button
            onClick={() => ahpState.runSynthesis()}
            disabled={ahpState.loading}
            className="ml-auto text-sm px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {ahpState.loading ? 'Computing...' : 'Re-run Synthesis'}
          </button>
        )}
      </div>

      {canSeeAggregated ? (
        <>
          <PriorityChart
            items={structure?.alternatives ?? []}
            scores={synthesis.summary.globalScores}
            title="Global Priority Scores"
          />

          <PriorityChart
            items={structure?.criteria ?? []}
            scores={synthesis.summary.aggregatedWeights}
            title="Factor Weights"
          />

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Concordance</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Kendall&apos;s W:</span>{' '}
                <span className="font-medium dark:text-gray-200">{synthesis.summary.concordance.kendallW.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Interpretation:</span>{' '}
                <span className="font-medium capitalize dark:text-gray-200">{synthesis.summary.concordance.interpretation}</span>
              </div>
            </div>
          </div>

          {structure?.criteria && structure.criteria.length >= 2 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sensitivity Analysis</h3>
              <div className="flex gap-2 flex-wrap">
                {structure.criteria.map((crit, i) => (
                  <button
                    key={crit.id}
                    onClick={() => setActiveCriterion(activeCriterion === i ? null : i)}
                    className={`px-3 py-1.5 text-xs rounded-md ${
                      activeCriterion === i
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {crit.label}
                  </button>
                ))}
              </div>
              {sweep && (
                <div className="mt-4">
                  <SensitivityChart
                    sweep={sweep}
                    crossovers={crossovers}
                    alternatives={structure.alternatives}
                    criterionName={structure.criteria[activeCriterion!]?.label ?? ''}
                  />
                </div>
              )}
            </div>
          )}

          <DisagreementPanel synthesis={synthesis} />

          {canSeeAggregated && Object.keys(individualPriorities).length >= 2 && (
            <VoterRadarChart
              criteria={structure?.criteria ?? []}
              individualPriorities={individualPriorities}
              profileMap={profileMap}
            />
          )}
        </>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The decision owner has not yet shared aggregated results.
          </p>
        </div>
      )}

      {votersToShow.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Individual Voter Rankings
          </h3>
          <div className="space-y-2">
            {votersToShow.map((voterId) => (
              <VoterBreakdownCard
                key={voterId}
                userId={voterId}
                profile={profileMap[voterId]}
                factorWeights={individualPriorities[voterId]}
                alternativeScores={individualAltScores[voterId]}
                cr={individualCR[voterId]?.criteria}
                incompleteCriteria={individualIncomplete[voterId] ?? []}
                criteriaItems={structure?.criteria ?? []}
                alternativeItems={structure?.alternatives ?? []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
