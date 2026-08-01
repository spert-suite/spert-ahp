// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useId, useState } from 'react';
import StorageSection from './StorageSection';

export const ATTRIBUTION_KEY = 'ahp/exportAttribution';

interface ExportAttribution {
  name: string;
  identifier: string;
}

function loadAttribution(): ExportAttribution {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { name: '', identifier: '' };
}

function saveAttribution(value: ExportAttribution): void {
  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
}

export default function GlobalSettingsPanel() {
  const [attribution, setAttribution] = useState<ExportAttribution>(loadAttribution);
  const fieldId = useId();
  const nameId = `${fieldId}-name`;
  const identifierId = `${fieldId}-identifier`;

  const handleAttributionChange = (field: keyof ExportAttribution, value: string) => {
    const next = { ...attribution, [field]: value };
    setAttribution(next);
    saveAttribution(next);
  };

  return (
    <div className="space-y-8 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Cloud Storage</h3>
        <StorageSection />
      </section>

      <section className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Attribution</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Your name and identifier are included when you export decisions as JSON.
        </p>
        <div className="space-y-2">
          <div>
            <label htmlFor={nameId} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              id={nameId}
              name="exportAttributionName"
              type="text"
              value={attribution.name}
              onChange={(e) => handleAttributionChange('name', e.target.value)}
              placeholder="e.g., Jane Smith"
              autoComplete="name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor={identifierId} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Identifier
            </label>
            <input
              id={identifierId}
              name="exportAttributionIdentifier"
              type="text"
              value={attribution.identifier}
              onChange={(e) => handleAttributionChange('identifier', e.target.value)}
              placeholder="e.g., student ID, email, or team name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
