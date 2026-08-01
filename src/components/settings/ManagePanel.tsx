// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState } from 'react';
import ThresholdConfigurator from './ThresholdConfigurator';
import SharingSection from './SharingSection';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { exportModel } from '../../storage/exportModel';
import { getOrCreateWorkspaceId } from '../../hooks/useSession';
import type { UseAHPReturn } from '../../types/ahp';

function slugify(input: string): string {
  const base = input
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .toLowerCase();
  return (base || 'decision').slice(0, 40);
}

function yyyymmdd(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

interface ManagePanelProps {
  ahpState: UseAHPReturn;
}

export default function ManagePanel({ ahpState }: ManagePanelProps) {
  const { user } = useAuth();
  const { mode } = useStorage();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!ahpState.modelId) {
    return <p className="text-gray-500 dark:text-gray-400">Create a decision first to configure settings.</p>;
  }

  const currentRole = ahpState.collaborators.find((c) => c.userId === user?.uid)?.role;
  const isOwner = ahpState.collaborators.length === 0 || currentRole === 'owner';
  const visibility = ahpState.model?.resultsVisibility ?? { showAggregatedToVoters: false, showOwnRankingsToVoters: true };

  const updateVisibility = (partial: Partial<typeof visibility>) => {
    void ahpState.updateModel({ resultsVisibility: { ...visibility, ...partial } });
  };

  const handleExport = async () => {
    if (!ahpState.modelId) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const storageRef = mode === 'cloud' && user ? user.uid : getOrCreateWorkspaceId();
      const envelope = await exportModel(ahpState.storage, ahpState.modelId, storageRef);
      const json = JSON.stringify(envelope, null, 2);
      const filename = `spert-ahp-${slugify(ahpState.model?.title ?? 'decision')}-${yyyymmdd()}.json`;

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Decision Settings</h2>

      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Status:</span>
          <span className="font-medium dark:text-gray-200 capitalize">{ahpState.model?.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Tier:</span>
          <span className="font-medium dark:text-gray-200">{ahpState.model?.completionTier}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Synthesis:</span>
          <span className="font-medium dark:text-gray-200">{ahpState.model?.synthesisStatus ?? 'none'}</span>
        </div>
      </div>

      <SharingSection ahpState={ahpState} />

      {isOwner && mode === 'cloud' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Results Visibility</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control what voters can see on the Results tab.
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="showAggregatedToVoters"
              checked={visibility.showAggregatedToVoters}
              onChange={(e) => updateVisibility({ showAggregatedToVoters: e.target.checked })}
            />
            Allow voters to see aggregated results
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              name="showOwnRankingsToVoters"
              checked={visibility.showOwnRankingsToVoters}
              onChange={(e) => updateVisibility({ showOwnRankingsToVoters: e.target.checked })}
            />
            Allow voters to see their own rankings
          </label>
        </div>
      )}

      <ThresholdConfigurator
        config={ahpState.model?.disagreementConfig ?? null}
        onUpdate={(partial) => { void ahpState.updateModel(partial); }}
      />

      {(mode !== 'cloud' || isOwner) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Data</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Export this decision as a JSON file for backup or to move it to another device.
          </p>
          <button
            onClick={() => { void handleExport(); }}
            disabled={isExporting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {isExporting ? 'Exporting…' : 'Export as JSON'}
          </button>
          {exportError && (
            <div className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md p-2">
              {exportError}
            </div>
          )}
        </div>
      )}

      <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">Danger Zone</h3>
        <button
          onClick={() => {
            if (window.confirm('Delete this decision? This cannot be undone.')) {
              ahpState.deleteModel();
            }
          }}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
        >
          Delete Decision
        </button>
      </div>
    </div>
  );
}
