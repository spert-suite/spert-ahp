// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { APP_VERSION } from '../core/models/constants';
import { exportModel } from './exportModel';
import type { AHPExportEnvelope, StorageAdapter } from '../types/ahp';

export interface AHPBundleExport {
  spertAhpBundleVersion: 1;
  appVersion: string;
  exportedAt: number;
  models: AHPExportEnvelope[];
}

/**
 * Builds a single bundled JSON export covering every modelId provided.
 * Each model is exported through `exportModel` so attribution + storageRef
 * handling stays consistent with the single-model export path.
 */
export async function exportAllModels(
  storage: StorageAdapter,
  modelIds: string[],
  storageRef: string,
): Promise<AHPBundleExport> {
  const envelopes: AHPExportEnvelope[] = [];
  for (const id of modelIds) {
    const env = await exportModel(storage, id, storageRef);
    envelopes.push(env);
  }
  return {
    spertAhpBundleVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: Date.now(),
    models: envelopes,
  };
}
