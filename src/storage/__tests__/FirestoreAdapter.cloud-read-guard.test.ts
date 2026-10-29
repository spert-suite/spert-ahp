// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * FirestoreAdapter — every read goes through the shape guard (v0.18.45, W4).
 *
 * Through the real adapter, not the guard alone: what mattered was that the
 * dashboard list, opening a model and the live listener each handed a raw
 * `snap.data()` to the UI. Uses the vi.mock pattern of the sibling
 * FirestoreAdapter tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getDocMock = vi.fn();
const getDocsMock = vi.fn();
let snapshotNext: ((snap: unknown) => void) | null = null;

vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, col: string, id: string) => ({ db, col, id }),
  getDoc: (...a: unknown[]) => getDocMock(...a),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  deleteField: () => '__DELETE__',
  collection: (_db: unknown, path: string) => ({ path }),
  query: (...args: unknown[]) => ({ args }),
  where: (...args: unknown[]) => ({ args }),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
  onSnapshot: (_ref: unknown, next: (snap: unknown) => void) => { snapshotNext = next; return () => {}; },
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn() })),
  runTransaction: vi.fn(),
}));
vi.mock('../../lib/firebase', () => ({ db: { __mock: true } }));
vi.mock('../../lib/callables', () => ({ callRevokeInvite: vi.fn(), callResendInvite: vi.fn(), callUpdateInvite: vi.fn() }));

import { FirestoreAdapter } from '../FirestoreAdapter';
import { isGuardedLoad, dismissGuardedLoad } from '../../lib/cloudLoadNotices';

const UID = 'victim-uid';
const HOSTILE = 'HOSTILE-VALUE';
const snap = (id: string, data: Record<string, unknown>) => ({ id, exists: () => true, data: () => structuredClone(data), metadata: { hasPendingWrites: false } });

const good = { title: 'Vendors', goal: 'g', status: 'open', createdAt: 5, completionTier: 2, members: { [UID]: 'editor' }, criteria: [{ id: 'c0', label: 'Cost', description: '' }, { id: 'c1', label: 'Risk', description: '' }], alternatives: [], collaborators: [], responses: {} };
const hostile = {
  ...good, title: { evil: HOSTILE }, status: 'exploded', completionTier: 9, members: { [UID]: { evil: HOSTILE } },
  criteria: [...good.criteria, null, { id: 7 }],
  responses: { [UID]: { status: 'in_progress', criteriaMatrix: { '0,1': 3, '1,0': 2, '0,99999': 4, x: 1 }, alternativeMatrices: 5, cr: {}, lastModifiedAt: 1 } },
};

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  getDocMock.mockReset();
  getDocsMock.mockReset();
  snapshotNext = null;
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { warn.mockRestore(); dismissGuardedLoad('h'); dismissGuardedLoad('a'); });

describe('dashboard list (listModels)', () => {
  it('lists a hostile model with a usable title, status and role, beside a good one', async () => {
    const docs = [snap('a', good), snap('h', hostile)];
    getDocsMock.mockResolvedValue({ forEach: (fn: (s: unknown) => void) => docs.forEach(fn) });
    const entries = await new FirestoreAdapter(UID).listModels();
    const h = entries.find((e) => e.modelId === 'h');
    expect(entries).toHaveLength(2);
    expect(h).toMatchObject({ title: '', status: 'open', role: 'viewer' });
    expect(isGuardedLoad('h')).toBe(false);
    expect(warn.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n')).not.toContain(HOSTILE);
  });
});

describe('opening a model (getModel) and the live listener (subscribeModel)', () => {
  it('opens a hostile model with the damage set aside, and raises the notice', async () => {
    getDocMock.mockResolvedValue(snap('h', hostile));
    const model = await new FirestoreAdapter(UID).getModel('h');
    expect(model?.meta.title).toBe('');
    expect(model?.meta.completionTier).toBe(4);
    expect(model?.structure.criteria.map((c) => c.id)).toEqual(['c0', 'c1']);
    expect(isGuardedLoad('h')).toBe(true);
  });

  it('opens a clean model with no notice and nothing logged', async () => {
    getDocMock.mockResolvedValue(snap('a', good));
    expect((await new FirestoreAdapter(UID).getModel('a'))?.meta.title).toBe('Vendors');
    expect(isGuardedLoad('a')).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('hands the listener a guarded document', () => {
    const cb = vi.fn();
    new FirestoreAdapter(UID).subscribeModel('h', cb);
    snapshotNext!(snap('h', hostile));
    const delivered = cb.mock.calls[0]![0] as Record<string, unknown>;
    expect(delivered['title']).toBe('');
    expect(delivered['criteria']).toHaveLength(2);
    expect(isGuardedLoad('h')).toBe(true);
  });

  it('returns only well-formed comparisons for a response', async () => {
    getDocMock.mockResolvedValue(snap('h', hostile));
    const adapter = new FirestoreAdapter(UID);
    // "0,99999" names no pair of a 2-item matrix: set aside, never clamped.
    expect(await adapter.getComparisons('h', UID, 'criteria')).toEqual({ '0,1': 3 });
    expect(await adapter.getComparisons('h', UID, 'c0')).toEqual({});
  });
});
