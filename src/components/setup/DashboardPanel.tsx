// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState, useEffect } from 'react';
import { exportAllModels } from '../../storage/exportAllModels';
import { getOrCreateWorkspaceId } from '../../hooks/useSession';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useDragReorder } from '../../hooks/useDragReorder';
import { useImportState } from '../../hooks/useImportState';
import ImportPreviewSection from './ImportPreviewSection';
import { TrashIcon } from '../icons/TrashIcon';
import { DragHandleIcon } from '../icons/DragHandleIcon';
import type { UseAHPReturn, ModelIndexEntry } from '../../types/ahp';

interface DashboardPanelProps {
  ahpState: UseAHPReturn;
  userId: string;
  onDecisionOpened: () => void;
}

function yyyymmdd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPanel({ ahpState, userId, onDecisionOpened }: DashboardPanelProps) {
  const { user } = useAuth();
  const { mode, cloudDataLoaded, setCloudDataLoaded } = useStorage();
  const [savedModels, setSavedModels] = useState<ModelIndexEntry[]>([]);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportAllError, setExportAllError] = useState<string | null>(null);

  const importState = useImportState({
    storage: ahpState.storage,
    mode,
    userId,
    loadModel: ahpState.loadModel,
    onDecisionOpened,
    cloudDataLoaded,
  });

  // Mount-time listModels: signals StorageContext that the active adapter's
  // initial fetch has resolved. Cancellation guard prevents stale resolution
  // from a prior adapter from setting the new adapter's gate.
  useEffect(() => {
    let cancelled = false;
    void ahpState.storage.listModels().then((models) => {
      if (cancelled) return;
      setSavedModels(models);
      // No-op in local mode (state already true); React bails out of re-render.
      setCloudDataLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ahpState.storage, setCloudDataLoaded]);

  // Re-fetch the model list when AuthContext claims pending invitations OR
  // when an import writes new/replaced models (useImportState dispatches the
  // same event). The listener is idempotent across both sources.
  useEffect(() => {
    const onChanged = () => {
      // cloudDataLoaded not updated here — by the time spert:models-changed
      // fires (post-import), cloudDataLoaded is already true from the
      // mount-time fetch above.
      void ahpState.storage.listModels().then(setSavedModels);
    };
    window.addEventListener('spert:models-changed', onChanged);
    return () => window.removeEventListener('spert:models-changed', onChanged);
  }, [ahpState.storage]);

  const handleCreate = () => {
    // Create an untitled draft and let the user fill in title/goal on
    // the Decision tab. Navigation is fired immediately — DecisionPanel
    // is gated by ahpState.modelId in App.tsx, so it stays in the empty
    // state for the brief window before the create resolves.
    void ahpState.createModel('', '');
    onDecisionOpened();
  };

  const handleLoad = (modelId: string) => {
    // Navigate even if the clicked card is the currently-loaded model:
    // user intent is "open this decision," and the modelId may not
    // change, so we can't rely on a transition-based useEffect.
    void ahpState.loadModel(modelId);
    onDecisionOpened();
  };

  const handleDelete = async (modelId: string, modelTitle: string) => {
    const label = modelTitle.trim() || 'this untitled decision';
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    await ahpState.storage.deleteModel(modelId);
    setSavedModels(await ahpState.storage.listModels());
  };

  const handleExportAll = async () => {
    if (savedModels.length === 0) return;
    setIsExportingAll(true);
    setExportAllError(null);
    try {
      const storageRef = mode === 'cloud' && user ? user.uid : getOrCreateWorkspaceId();
      const ids = savedModels.map((m) => m.modelId);
      const bundle = await exportAllModels(ahpState.storage, ids, storageRef);
      const json = JSON.stringify(bundle, null, 2);
      const filename = `spert-ahp-export-${yyyymmdd()}.json`;
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
      setExportAllError((err as Error).message);
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleReorder = async (orderedIds: string[]) => {
    // Optimistic local reorder so the UI doesn't jump.
    const byId = new Map(savedModels.map((m) => [m.modelId, m]));
    const next: ModelIndexEntry[] = [];
    orderedIds.forEach((id, idx) => {
      const entry = byId.get(id);
      if (entry) next.push({ ...entry, order: idx });
    });
    setSavedModels(next);
    try {
      await ahpState.storage.reorderModels(orderedIds);
    } catch {
      // On failure, refetch authoritative order
      setSavedModels(await ahpState.storage.listModels());
    }
  };

  const drag = useDragReorder<ModelIndexEntry>(savedModels, 'modelId', (orderedIds) => {
    void handleReorder(orderedIds);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Decisions</h2>
        <div className="flex gap-2">
          <button
            onClick={importState.handleImportClick}
            disabled={importState.isBusy || importState.isCloudNotReady}
            aria-busy={
              importState.phase.tag === 'applying' ||
              importState.phase.tag === 'parsing'
            }
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {importState.phase.tag === 'applying'
              ? 'Importing…'
              : importState.phase.tag === 'parsing'
                ? 'Reading…'
                : 'Import'}
          </button>
          <button
            onClick={() => { void handleExportAll(); }}
            disabled={savedModels.length === 0 || isExportingAll}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {isExportingAll ? 'Exporting…' : 'Export All'}
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
          >
            + New Decision
          </button>
          <input
            ref={importState.fileInputRef}
            type="file"
            name="importJsonFile"
            accept="application/json,.json"
            onChange={(e) => { void importState.handleFileChange(e); }}
            className="hidden"
          />
        </div>
      </div>

      {mode === 'cloud' && !cloudDataLoaded && (
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-amber-600 dark:text-amber-400"
        >
          Cloud decisions are still loading — import will be available in a moment.
        </p>
      )}
      {importState.importError && (
        <div
          role="alert"
          className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md p-2"
        >
          {importState.importError}
        </div>
      )}
      {importState.phase.tag !== 'idle' && (
        <ImportPreviewSection importState={importState} />
      )}
      {exportAllError && (
        <div className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md p-2">
          {exportAllError}
        </div>
      )}

      {savedModels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedModels.map((m) => {
            const handlers = drag.handlersFor(m.modelId);
            const isDragging = drag.isDragging(m.modelId);
            const isDragOver = drag.isDragOver(m.modelId);
            const displayTitle = m.title.trim() || 'Untitled decision';
            const titleIsPlaceholder = !m.title.trim();
            return (
              <div
                key={m.modelId}
                {...handlers}
                onClick={() => handleLoad(m.modelId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLoad(m.modelId);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Load decision: ${displayTitle}`}
                className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                  isDragging ? 'opacity-50' : ''
                } ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-2 pr-6">
                  <div
                    className="flex items-start pt-0.5 cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-500 active:cursor-grabbing"
                    title="Drag to reorder"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-hidden="true"
                  >
                    <DragHandleIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold truncate ${
                      titleIsPlaceholder
                        ? 'italic text-gray-400 dark:text-gray-500'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {displayTitle}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Created {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(m.modelId, m.title);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Delete decision"
                  aria-label={`Delete decision: ${displayTitle}`}
                  className="absolute top-3 right-3 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No saved decisions yet. Click <span className="font-medium">+ New Decision</span> to start.
          </p>
        </div>
      )}
    </div>
  );
}
