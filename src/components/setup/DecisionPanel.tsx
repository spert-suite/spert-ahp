// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useId } from 'react';
import ItemBuilder from './ItemBuilder';
import TierSelector from './TierSelector';
import { useBufferedField } from '../../hooks/useBufferedField';
import type { UseAHPReturn, CompletionTier } from '../../types/ahp';

interface DecisionPanelProps {
  ahpState: UseAHPReturn;
}

export default function DecisionPanel({ ahpState }: DecisionPanelProps) {
  const hasResponses = Object.keys(ahpState.responses).length > 0;
  const hasComparisons = hasResponses && Object.values(ahpState.responses).some(
    (r) => Object.keys(r.criteriaMatrix ?? {}).length > 0,
  );

  const modelTitle = ahpState.model?.title ?? '';
  const modelGoal = ahpState.model?.goal ?? '';
  const fieldId = useId();
  const titleId = `${fieldId}-title`;
  const goalId = `${fieldId}-goal`;

  const titleField = useBufferedField({
    storeValue: modelTitle,
    onCommit: (value) => {
      if (value !== modelTitle) void ahpState.updateModel({ title: value });
    },
  });
  const goalField = useBufferedField({
    storeValue: modelGoal,
    onCommit: (value) => {
      if (value !== modelGoal) void ahpState.updateModel({ goal: value });
    },
  });

  const handleStructureChange = (field: 'criteria' | 'alternatives', value: unknown) => {
    const newStructure = {
      ...ahpState.structure!,
      [field]: value,
      structureVersion: (ahpState.structure?.structureVersion ?? 0) + 1,
    };
    ahpState.updateStructure(newStructure);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <label
            htmlFor={titleId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Title
          </label>
          <input
            id={titleId}
            name="decisionTitle"
            type="text"
            value={titleField.draft}
            onChange={titleField.handleChange}
            onFocus={titleField.handleFocus}
            onBlur={titleField.handleBlur}
            onKeyDown={titleField.handleKeyDown}
            placeholder="Untitled decision"
            className="w-full px-3 py-2 text-base font-semibold border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor={goalId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Goal
          </label>
          <textarea
            id={goalId}
            name="decisionGoal"
            value={goalField.draft}
            onChange={goalField.handleChange}
            onFocus={goalField.handleFocus}
            onBlur={goalField.handleBlur}
            placeholder="What are you trying to decide?"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <TierSelector
        value={ahpState.model!.completionTier}
        onChange={(tier: CompletionTier) => ahpState.updateModel({ completionTier: tier })}
        disabled={hasComparisons}
      />

      <ItemBuilder
        items={ahpState.structure?.criteria ?? []}
        onChange={(items) => handleStructureChange('criteria', items)}
        itemLabel="Decision Factor"
        hasComparisons={hasComparisons}
      />

      <ItemBuilder
        items={ahpState.structure?.alternatives ?? []}
        onChange={(items) => handleStructureChange('alternatives', items)}
        itemLabel="Alternative"
        hasComparisons={hasComparisons}
      />

      {(ahpState.structure?.criteria?.length ?? 0) >= 2 &&
       (ahpState.structure?.alternatives?.length ?? 0) >= 2 && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400">
          Ready for comparisons. Switch to the Compare tab.
        </div>
      )}
    </div>
  );
}
