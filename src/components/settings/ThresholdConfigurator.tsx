// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useId } from 'react';
import { DISAGREEMENT_PRESETS } from '../../core/models/constants';
import type { DisagreementConfig, ModelDoc } from '../../types/ahp';

interface ThresholdConfiguratorProps {
  config: DisagreementConfig | null;
  onUpdate: (partial: Partial<ModelDoc>) => void;
}

export default function ThresholdConfigurator({ config, onUpdate }: ThresholdConfiguratorProps) {
  const fieldId = useId();
  const agreementId = `${fieldId}-agreement`;
  const mildId = `${fieldId}-mild`;

  if (!config) return null;

  const thresholds = config.thresholds ?? DISAGREEMENT_PRESETS['standard']!;

  const handlePreset = (preset: string) => {
    onUpdate({
      disagreementConfig: {
        preset: preset as DisagreementConfig['preset'],
        thresholds: { ...DISAGREEMENT_PRESETS[preset]! },
        // eslint-disable-next-line react-hooks/purity -- Date.now() runs in this click handler, not during render
        configuredAt: Date.now(),
      },
    });
  };

  const handleCustom = (field: 'agreement' | 'mild', value: number) => {
    onUpdate({
      disagreementConfig: {
        preset: 'custom',
        thresholds: { ...thresholds, [field]: value },
        configuredAt: Date.now(),
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Disagreement Thresholds</h3>

      <div className="flex gap-2">
        {Object.keys(DISAGREEMENT_PRESETS).map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 text-xs rounded-md capitalize ${
              config.preset === preset
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor={agreementId} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Agreement threshold: {(thresholds.agreement * 100).toFixed(0)}%
          </label>
          <input
            id={agreementId}
            name="agreementThreshold"
            type="range"
            min={0}
            max={50}
            value={thresholds.agreement * 100}
            onChange={(e) => handleCustom('agreement', Number(e.target.value) / 100)}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor={mildId} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Mild disagreement threshold: {(thresholds.mild * 100).toFixed(0)}%
          </label>
          <input
            id={mildId}
            name="mildDisagreementThreshold"
            type="range"
            min={0}
            max={100}
            value={thresholds.mild * 100}
            onChange={(e) => handleCustom('mild', Number(e.target.value) / 100)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
