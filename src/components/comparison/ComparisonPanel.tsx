// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState, useCallback } from 'react';
import PairwiseComparisonLayer from './PairwiseComparisonLayer';
import { useMatrix } from '../../hooks/useMatrix';
import type {
  UseAHPReturn,
  CompletionTier,
  ComparisonMap,
  StructuredItem,
} from '../../types/ahp';

interface AlternativeLayerProps {
  criterionId: string;
  criterionLabel: string;
  alternativeItems: StructuredItem[];
  tier: CompletionTier;
  ahpState: UseAHPReturn;
  userId: string;
  isOwner: boolean;
}

function AlternativeLayer({
  criterionId,
  criterionLabel,
  alternativeItems,
  tier,
  ahpState,
  userId,
  isOwner,
}: AlternativeLayerProps) {
  const initialComp = ahpState.responses?.[userId]?.alternativeMatrices?.[criterionId] ?? {};

  const onSave = useCallback(
    (layer: string, comparisons: ComparisonMap) => {
      ahpState.saveComparisons(layer, comparisons);
    },
    [ahpState],
  );

  const matrix = useMatrix({
    n: alternativeItems.length,
    tier,
    layer: criterionId,
    initialComparisons: initialComp,
    onSave,
  });

  const banner = (
    <div className="border-l-4 border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
      Ranking alternatives with respect to:{' '}
      <span className="font-medium">{criterionLabel}</span>
    </div>
  );

  return (
    <PairwiseComparisonLayer
      items={alternativeItems}
      tier={tier}
      matrix={matrix}
      banner={banner}
      isOwner={isOwner}
      mode="preference"
      criterionLabel={criterionLabel}
    />
  );
}

interface ComparisonPanelProps {
  ahpState: UseAHPReturn;
  userId: string;
}

export default function ComparisonPanel({ ahpState, userId }: ComparisonPanelProps) {
  const [activeLayer, setActiveLayer] = useState('criteria');

  const structure = ahpState.structure;
  const tier = (ahpState.model?.completionTier ?? 4) as CompletionTier;

  const criteriaItems = structure?.criteria ?? [];
  const alternativeItems = structure?.alternatives ?? [];

  const hasSufficientStructure = criteriaItems.length >= 2 && alternativeItems.length >= 2;

  const onSave = useCallback(
    (layer: string, comparisons: ComparisonMap) => {
      ahpState.saveComparisons(layer, comparisons);
    },
    [ahpState],
  );

  const initialCritComp = ahpState.responses?.[userId]?.criteriaMatrix ?? {};
  const criteriaMatrix = useMatrix({
    n: criteriaItems.length,
    tier,
    layer: 'criteria',
    initialComparisons: initialCritComp,
    onSave,
  });

  if (!ahpState.modelId) {
    return <p className="text-gray-500 dark:text-gray-400">Create a decision first in the Decisions tab.</p>;
  }

  if (!hasSufficientStructure) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        Add at least 2 decision factors and 2 alternatives in Decisions.
      </p>
    );
  }

  const currentRole = ahpState.collaborators.find((c) => c.userId === userId)?.role;
  const isOwner = ahpState.collaborators.length === 0 || currentRole === 'owner';

  const isCriteriaLayer = activeLayer === 'criteria';
  const activeCriterion = !isCriteriaLayer
    ? criteriaItems.find((c) => c.id === activeLayer)
    : null;

  const criteriaBanner = (
    <div className="border-l-4 border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
      Ranking decision factors — how important is each for:{' '}
      <span className="font-medium">{ahpState.model?.goal ?? '(goal)'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sticky band — bleed matches main p-6 in App.tsx; update together. */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 -mx-6 px-6 py-2 flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveLayer('criteria')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            isCriteriaLayer
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Decision Factors
        </button>
        {criteriaItems.map((crit) => (
          <button
            key={crit.id}
            onClick={() => setActiveLayer(crit.id)}
            className={`px-3 py-1.5 text-sm rounded-md ${
              activeLayer === crit.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {crit.label}
          </button>
        ))}
      </div>

      {ahpState.model?.goal && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Reminder: decision goal
          </summary>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{ahpState.model.goal}</p>
        </details>
      )}

      {isCriteriaLayer && (
        <PairwiseComparisonLayer
          items={criteriaItems}
          tier={tier}
          matrix={criteriaMatrix}
          banner={criteriaBanner}
          isOwner={isOwner}
        />
      )}

      {activeCriterion && (
        <AlternativeLayer
          key={activeCriterion.id}
          criterionId={activeCriterion.id}
          criterionLabel={activeCriterion.label}
          alternativeItems={alternativeItems}
          tier={tier}
          ahpState={ahpState}
          userId={userId}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
