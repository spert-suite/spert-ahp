// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from '../LocalStorageAdapter';
import { uploadLocalToCloud, hasUploadedToCloud, clearHasUploadedFlag } from '../migration';
import {
  createModelDoc,
  createStructureDoc,
  createCollaboratorDoc,
  createResponseDoc,
} from '../../core/models/AHPModel';
import type { FirestoreAdapter } from '../FirestoreAdapter';
import type { ModelBundle } from '../FirestoreAdapter';

/**
 * Mock FirestoreAdapter that records calls. We do not touch real Firestore.
 */
function makeMockCloud() {
  const created: Array<{ modelId: string; bundle: ModelBundle }> = [];
  const existingIds = new Set<string>();

  const cloud = {
    async getModel(modelId: string) {
      if (existingIds.has(modelId)) {
        return { meta: {} as never, structure: {} as never };
      }
      return null;
    },
    async createModelFromBundle(modelId: string, bundle: ModelBundle) {
      created.push({ modelId, bundle });
      existingIds.add(modelId);
    },
  } as unknown as FirestoreAdapter;

  return { cloud, created, existingIds };
}

const LOCAL_UID = 'user-local-12345';
const FIREBASE_UID = 'firebase-uid-abcdef';

describe('uploadLocalToCloud', () => {
  let local: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    local = new LocalStorageAdapter();
    clearHasUploadedFlag();
  });

  it('rewrites local userId → firebase uid in all fields', async () => {
    // Seed one local model
    const meta = createModelDoc('Test Decision', 'Goal', LOCAL_UID);
    await local.createModel('m1', meta, createStructureDoc());
    await local.addCollaborator('m1', createCollaboratorDoc(LOCAL_UID, 'owner', true));
    await local.createResponse('m1', createResponseDoc(LOCAL_UID));
    await local.saveComparisons('m1', LOCAL_UID, 'criteria', { '0,1': 3 });

    const { cloud, created } = makeMockCloud();
    const result = await uploadLocalToCloud(local, cloud, LOCAL_UID, FIREBASE_UID);

    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(created.length).toBe(1);

    const bundle = created[0]!.bundle;

    // meta.createdBy rewritten
    expect(bundle.meta.createdBy).toBe(FIREBASE_UID);

    // _originRef preserved (workspace UUID, never a userId)
    expect(bundle.meta._originRef).toBeTruthy();
    expect(bundle.meta._originRef).not.toBe(FIREBASE_UID);
    expect(bundle.meta._originRef).not.toBe(LOCAL_UID);

    // _changeLog has 'created' actor rewritten + appended 'uploaded' entry
    const changeLog = bundle.meta._changeLog;
    expect(changeLog.length).toBe(2);
    expect(changeLog[0]!.action).toBe('created');
    expect(changeLog[0]!.actor).toBe(FIREBASE_UID);
    expect(changeLog[1]!.action).toBe('uploaded');
    expect(changeLog[1]!.actor).toBe(FIREBASE_UID);

    // collaborators[].userId rewritten
    expect(bundle.collaborators.length).toBe(1);
    expect(bundle.collaborators[0]!.userId).toBe(FIREBASE_UID);
    expect(bundle.collaborators[0]!.role).toBe('owner');

    // responses map keyed by firebase uid, inner userId also rewritten
    expect(Object.keys(bundle.responses)).toEqual([FIREBASE_UID]);
    expect(bundle.responses[FIREBASE_UID]!.userId).toBe(FIREBASE_UID);
    expect(bundle.responses[FIREBASE_UID]!.criteriaMatrix).toEqual({ '0,1': 3 });

    // flag set
    expect(hasUploadedToCloud()).toBe(true);
  });

  it('skips models that already exist in cloud', async () => {
    const meta = createModelDoc('Existing', 'Goal', LOCAL_UID);
    await local.createModel('m1', meta, createStructureDoc());
    await local.addCollaborator('m1', createCollaboratorDoc(LOCAL_UID, 'owner', true));
    await local.createResponse('m1', createResponseDoc(LOCAL_UID));

    const { cloud, created, existingIds } = makeMockCloud();
    existingIds.add('m1');

    const result = await uploadLocalToCloud(local, cloud, LOCAL_UID, FIREBASE_UID);
    expect(result.uploaded).toBe(0);
    expect(result.skipped).toBe(1);
    expect(created.length).toBe(0);
  });

  it('records errors per-model and continues', async () => {
    const meta1 = createModelDoc('Good', 'Goal', LOCAL_UID);
    await local.createModel('m1', meta1, createStructureDoc());
    await local.addCollaborator('m1', createCollaboratorDoc(LOCAL_UID, 'owner', true));
    await local.createResponse('m1', createResponseDoc(LOCAL_UID));

    const meta2 = createModelDoc('Bad', 'Goal', LOCAL_UID);
    await local.createModel('m2', meta2, createStructureDoc());
    await local.addCollaborator('m2', createCollaboratorDoc(LOCAL_UID, 'owner', true));
    await local.createResponse('m2', createResponseDoc(LOCAL_UID));

    const cloud = {
      getModel: vi.fn().mockResolvedValue(null),
      createModelFromBundle: vi
        .fn()
        .mockImplementation(async (modelId: string) => {
          if (modelId === 'm2') throw new Error('simulated write failure');
        }),
    } as unknown as FirestoreAdapter;

    const result = await uploadLocalToCloud(local, cloud, LOCAL_UID, FIREBASE_UID);
    expect(result.uploaded).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]!.modelId).toBe('m2');
  });

  it('treats PERMISSION_DENIED on getModel as not-exists', async () => {
    const meta = createModelDoc('Test', 'Goal', LOCAL_UID);
    await local.createModel('m1', meta, createStructureDoc());
    await local.addCollaborator('m1', createCollaboratorDoc(LOCAL_UID, 'owner', true));
    await local.createResponse('m1', createResponseDoc(LOCAL_UID));

    const cloud = {
      getModel: vi.fn().mockRejectedValue(new Error('PERMISSION_DENIED')),
      createModelFromBundle: vi.fn().mockResolvedValue(undefined),
    } as unknown as FirestoreAdapter;

    const result = await uploadLocalToCloud(local, cloud, LOCAL_UID, FIREBASE_UID);
    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
  });
});
