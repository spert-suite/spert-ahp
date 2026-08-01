// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { APP_VERSION } from '../core/models/constants';
import { ATTRIBUTION_KEY } from '../components/settings/GlobalSettingsPanel';
import type {
  AHPExportEnvelope,
  ResponseDoc,
  StorageAdapter,
  SynthesisBundle,
} from '../types/ahp';

interface ExportAttribution {
  name: string;
  identifier: string;
}

function readExportAttribution(): AHPExportEnvelope['_exportedBy'] {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExportAttribution>;
    const name = typeof parsed.name === 'string' ? parsed.name : '';
    const identifier = typeof parsed.identifier === 'string' ? parsed.identifier : '';
    if (!name && !identifier) return null;
    return { name, identifier };
  } catch {
    return null;
  }
}

/**
 * Build a portable JSON envelope for the given model. Performs a fresh
 * synthesis read rather than trusting any in-memory ahpState.synthesis —
 * the subscription may not have resolved yet for recently-loaded models.
 *
 * Caller is responsible for resolving storageRef: workspace UUID in local
 * mode (from getOrCreateWorkspaceId) or the current Firebase uid in cloud
 * mode. Keeps this utility pure and independent of storage-mode logic.
 */
export async function exportModel(
  storage: StorageAdapter,
  modelId: string,
  storageRef: string,
): Promise<AHPExportEnvelope> {
  const modelData = await storage.getModel(modelId);
  if (!modelData) {
    throw new Error(`Model ${modelId} not found`);
  }

  const collaborators = await storage.getCollaborators(modelId);

  const responses: Record<string, ResponseDoc> = {};
  for (const c of collaborators) {
    const r = await storage.getResponse(modelId, c.userId);
    if (r) responses[c.userId] = r;
  }

  let synthesis: SynthesisBundle | null = null;
  if (modelData.meta.publishedSynthesisId) {
    synthesis = await storage.getSynthesis(modelId, modelData.meta.publishedSynthesisId);
  }

  return {
    spertAhpExportVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: Date.now(),
    sourceModelId: modelId,
    _exportedBy: readExportAttribution(),
    _storageRef: storageRef,
    meta: modelData.meta,
    structure: modelData.structure,
    collaborators,
    responses,
    synthesis,
  };
}
