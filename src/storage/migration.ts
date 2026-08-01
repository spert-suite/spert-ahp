// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { LocalStorageAdapter } from './LocalStorageAdapter';
import type { FirestoreAdapter } from './FirestoreAdapter';
import type { ModelDoc, ResponseDoc, CollaboratorDoc } from '../types/ahp';

export interface MigrationResult {
  uploaded: number;
  skipped: number;
  errors: Array<{ modelId: string; error: string }>;
}

export const HAS_UPLOADED_KEY = 'ahp/hasUploadedToCloud';

/**
 * Upload all local models to Firestore, rewriting the local userId to the
 * Firebase uid in every field that references it.
 *
 * Field-by-field userId rewrite:
 *   - meta.createdBy           local userId → firebase uid
 *   - meta._changeLog[].actor  local userId → firebase uid (+ append 'uploaded' entry)
 *   - members map key (new)    firebase uid → 'owner'
 *   - collaborators[].userId   local userId → firebase uid
 *   - responses map key (uid)  local userId → firebase uid
 *   - responses[uid].userId    local userId → firebase uid
 *
 * _originRef is NEVER rewritten — it is the workspace UUID, not a userId, and
 * preserves provenance across the local→cloud transition.
 *
 * Collision check: if a model with the same modelId already exists in Firestore,
 * skip it. Uses try/catch because getDoc on nonexistent docs throws
 * PERMISSION_DENIED under our security rules (SPERT-Story-Map lesson 13).
 */
export async function uploadLocalToCloud(
  local: LocalStorageAdapter,
  cloud: FirestoreAdapter,
  localUserId: string,
  firebaseUid: string,
): Promise<MigrationResult> {
  const result: MigrationResult = { uploaded: 0, skipped: 0, errors: [] };
  const models = await local.listModels();

  for (const entry of models) {
    try {
      // Collision check — treat PERMISSION_DENIED as "safe to create"
      let exists = false;
      try {
        const existing = await cloud.getModel(entry.modelId);
        exists = existing !== null;
      } catch {
        exists = false;
      }

      if (exists) {
        result.skipped++;
        continue;
      }

      // Read full local bundle
      const data = await local.getModel(entry.modelId);
      if (!data) continue;

      const collabs = await local.getCollaborators(entry.modelId);

      // Rewrite collaborators — swap local userId → firebase uid
      const rewrittenCollabs: CollaboratorDoc[] = collabs.map((c) => ({
        ...c,
        userId: c.userId === localUserId ? firebaseUid : c.userId,
      }));

      // Rewrite responses — key AND userId field inside each
      const responses: Record<string, ResponseDoc> = {};
      for (const c of collabs) {
        const r = await local.getResponse(entry.modelId, c.userId);
        if (!r) continue;
        const newKey = c.userId === localUserId ? firebaseUid : c.userId;
        responses[newKey] = {
          ...r,
          userId: newKey,
        };
      }

      // Rewrite meta — createdBy + _changeLog entries
      const rewrittenChangeLog = (data.meta._changeLog ?? []).map((e) => ({
        ...e,
        actor: e.actor === localUserId ? firebaseUid : e.actor,
      }));
      rewrittenChangeLog.push({
        action: 'uploaded',
        timestamp: Date.now(),
        actor: firebaseUid,
      });

      const rewrittenMeta: ModelDoc = {
        ...data.meta,
        createdBy: data.meta.createdBy === localUserId ? firebaseUid : data.meta.createdBy,
        _changeLog: rewrittenChangeLog,
        // _originRef intentionally unchanged
      };

      await cloud.createModelFromBundle(entry.modelId, {
        meta: rewrittenMeta,
        structure: data.structure,
        collaborators: rewrittenCollabs,
        responses,
        synthesis: null,
      });

      result.uploaded++;
    } catch (err) {
      result.errors.push({
        modelId: entry.modelId,
        error: (err as Error).message,
      });
    }
  }

  // Set the flag so we don't re-prompt on future sign-ins
  localStorage.setItem(HAS_UPLOADED_KEY, 'true');

  return result;
}

export function hasUploadedToCloud(): boolean {
  return localStorage.getItem(HAS_UPLOADED_KEY) === 'true';
}

export function setHasUploadedFlag(): void {
  localStorage.setItem(HAS_UPLOADED_KEY, 'true');
}

export function clearHasUploadedFlag(): void {
  localStorage.removeItem(HAS_UPLOADED_KEY);
}
