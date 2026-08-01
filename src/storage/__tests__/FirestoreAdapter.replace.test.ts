// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * FirestoreAdapter.replaceModelFromBundle — unit tests.
 *
 * Uses the same vi.mock pattern as src/lib/__tests__/profileWrites.test.ts.
 * Mocks the runTransaction signature so the inner callback fires against a
 * controllable Transaction object.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AHPExportBundle, ResponseDoc } from '../../types/ahp';

// ── Mock state ─────────────────────────────────────────────────────────
let currentSnap: { exists: boolean; data: Record<string, unknown> } = { exists: false, data: {} };
let lastTxSetPayload: Record<string, unknown> | null = null;

const txGetMock = vi.fn(async () => ({
  exists: () => currentSnap.exists,
  data: () => currentSnap.data,
}));
const txSetMock = vi.fn((_ref: unknown, payload: Record<string, unknown>) => {
  lastTxSetPayload = payload;
});

const runTransactionMock = vi.fn(
  async (_db: unknown, fn: (tx: { get: typeof txGetMock; set: typeof txSetMock }) => Promise<unknown>) => {
    return fn({ get: txGetMock, set: txSetMock });
  },
);

vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, col: string, id: string) => ({ db, col, id }),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  deleteField: () => '__DELETE__',
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn() })),
  runTransaction: (db: unknown, fn: Parameters<typeof runTransactionMock>[1]) =>
    runTransactionMock(db, fn),
}));

vi.mock('../../lib/firebase', () => ({
  db: { __mock: true },
}));

vi.mock('../../lib/callables', () => ({
  callRevokeInvite: vi.fn(),
  callResendInvite: vi.fn(),
  callUpdateInvite: vi.fn(),
}));

// Import after mocks
import { FirestoreAdapter } from '../FirestoreAdapter';
import { updateDoc } from 'firebase/firestore';

// ── Helpers ────────────────────────────────────────────────────────────
function makeBundle(overrides: Partial<AHPExportBundle> = {}): AHPExportBundle {
  return {
    meta: {
      title: 'Replaced',
      goal: 'NewGoal',
      createdBy: 'importer-uid',
      createdAt: 9_999_999_000,
      status: 'open',
      completionTier: 4,
      synthesisStatus: null,
      disagreementConfig: { preset: 'standard', thresholds: { agreement: 0.15, mild: 0.35 } },
      publishedSynthesisId: null,
      _originRef: 'importer-workspace',
      _changeLog: [
        { action: 'imported', timestamp: 9_999_999_000, actor: 'importer-uid' },
      ],
    },
    structure: {
      criteria: [{ id: 'c1', label: 'C1', description: '' }],
      alternatives: [{ id: 'a1', label: 'A1', description: '' }],
      structureVersion: 5,
    },
    collaborators: [{ userId: 'importer-uid', role: 'owner', isVoting: true }],
    responses: {
      'importer-uid': {
        userId: 'importer-uid',
        status: 'in_progress',
        criteriaMatrix: {},
        alternativeMatrices: {},
        cr: {},
        lastModifiedAt: 9_999_999_000,
        structureVersionAtSubmission: 5,
      } as ResponseDoc,
    },
    synthesis: null,
    ...overrides,
  };
}

const UID = 'importer-uid';

describe('FirestoreAdapter.replaceModelFromBundle', () => {
  let adapter: FirestoreAdapter;

  beforeEach(() => {
    runTransactionMock.mockClear();
    txGetMock.mockClear();
    txSetMock.mockClear();
    vi.mocked(updateDoc).mockClear(); // K2: prevent stale calls from prior tests
    lastTxSetPayload = null;
    currentSnap = { exists: false, data: {} };
    adapter = new FirestoreAdapter(UID);
  });

  it('uses runTransaction', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: UID,
        members: { [UID]: 'owner' },
        collaborators: [{ userId: UID, role: 'owner', isVoting: true }],
        createdAt: 1_000_000,
        createdBy: 'orig-creator',
        _originRef: 'orig-workspace',
        order: 2,
      },
    };
    await adapter.replaceModelFromBundle('m1', makeBundle());
    expect(runTransactionMock).toHaveBeenCalledTimes(1);
  });

  it('throws when snap does not exist', async () => {
    currentSnap = { exists: false, data: {} };
    await expect(adapter.replaceModelFromBundle('m1', makeBundle())).rejects.toThrow(/not found/);
  });

  it('throws when caller is not the owner (defense-in-depth)', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: 'someone-else',
        members: { [UID]: 'editor', 'someone-else': 'owner' },
        collaborators: [
          { userId: 'someone-else', role: 'owner', isVoting: true },
          { userId: UID, role: 'editor', isVoting: true },
        ],
      },
    };
    await expect(adapter.replaceModelFromBundle('m1', makeBundle())).rejects.toThrow(/only the project owner/i);
  });

  it('preserves order when present on existing doc', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: UID,
        members: { [UID]: 'owner' },
        collaborators: [{ userId: UID, role: 'owner', isVoting: true }],
        order: 7,
      },
    };
    await adapter.replaceModelFromBundle('m1', makeBundle());
    expect((lastTxSetPayload as { order?: number }).order).toBe(7);
  });

  it('omits order when not present on existing doc (v0.9.x legacy)', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: UID,
        members: { [UID]: 'owner' },
        collaborators: [{ userId: UID, role: 'owner', isVoting: true }],
      },
    };
    await adapter.replaceModelFromBundle('m1', makeBundle());
    expect('order' in (lastTxSetPayload as Record<string, unknown>)).toBe(false);
  });

  it('preserves existing members and collaborators (bundle.collaborators discarded)', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: UID,
        members: { [UID]: 'owner', 'editor-1': 'editor', 'viewer-1': 'viewer' },
        collaborators: [
          { userId: UID, role: 'owner', isVoting: true },
          { userId: 'editor-1', role: 'editor', isVoting: true },
          { userId: 'viewer-1', role: 'viewer', isVoting: false },
        ],
      },
    };
    await adapter.replaceModelFromBundle('m1', makeBundle());
    const payload = lastTxSetPayload as Record<string, unknown>;
    expect(payload.members).toEqual({ [UID]: 'owner', 'editor-1': 'editor', 'viewer-1': 'viewer' });
    const collabs = payload.collaborators as Array<{ userId: string }>;
    expect(collabs.map((c) => c.userId)).toEqual([UID, 'editor-1', 'viewer-1']);
  });

  it('preserves createdAt, createdBy, _originRef from existing doc', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: UID,
        members: { [UID]: 'owner' },
        collaborators: [{ userId: UID, role: 'owner', isVoting: true }],
        createdAt: 1_234_567,
        createdBy: 'original-creator',
        _originRef: 'original-workspace',
      },
    };
    await adapter.replaceModelFromBundle('m1', makeBundle());
    const payload = lastTxSetPayload as Record<string, unknown>;
    expect(payload.createdAt).toBe(1_234_567);
    expect(payload.createdBy).toBe('original-creator');
    expect(payload._originRef).toBe('original-workspace');
  });

  it('creates fresh response slots for non-importer members with structureVersionAtSubmission from new structure', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: UID,
        members: { [UID]: 'owner', 'editor-1': 'editor' },
        collaborators: [
          { userId: UID, role: 'owner', isVoting: true },
          { userId: 'editor-1', role: 'editor', isVoting: true },
        ],
      },
    };
    await adapter.replaceModelFromBundle('m1', makeBundle());
    const responses = (lastTxSetPayload as { responses: Record<string, ResponseDoc> }).responses;
    expect(responses['editor-1']).toBeDefined();
    expect(responses['editor-1']!.criteriaMatrix).toEqual({});
    // structureVersionAtSubmission must match new structure version (5 per makeBundle)
    expect(responses['editor-1']!.structureVersionAtSubmission).toBe(5);
    // Importer's response is from the bundle (carrying their import-time state)
    expect(responses[UID]).toBeDefined();
  });

  it('uses bundle._changeLog directly (not wrapped with ?? [])', async () => {
    currentSnap = {
      exists: true,
      data: {
        owner: UID,
        members: { [UID]: 'owner' },
        collaborators: [{ userId: UID, role: 'owner', isVoting: true }],
      },
    };
    await adapter.replaceModelFromBundle('m1', makeBundle());
    const payload = lastTxSetPayload as Record<string, unknown>;
    expect(payload._changeLog).toEqual([
      { action: 'imported', timestamp: 9_999_999_000, actor: 'importer-uid' },
    ]);
  });

  it('K2: updateModel includes schemaVersion in the Firestore payload', async () => {
    vi.mocked(updateDoc).mockResolvedValue(undefined);
    const altAdapter = new FirestoreAdapter('user-1');
    await altAdapter.updateModel('model-1', { title: 'Updated Title' });
    expect(vi.mocked(updateDoc)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ schemaVersion: 1, title: 'Updated Title' }),
    );
  });
});
