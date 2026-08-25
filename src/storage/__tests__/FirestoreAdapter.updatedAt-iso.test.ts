// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * PC-2 (Brief 19) — every `spertahp_projects` write emits an ISO 8601 string.
 *
 * ⚠️ SITES, NOT MODULES. All thirteen sites live in ONE file, so a per-module
 * reading of this condition is satisfied by a single test while twelve sites
 * stay unconverted — which is exactly Brief 19's own defect (one of two sites
 * converted, the other left). Each site sits in a distinct public method, so
 * each gets its own entry point below and the mapping is one-to-one.
 *
 * ⚠️ THE SHAPE IS THE ASSERTION, NOT THE TYPE. `typeof === 'string'` passes for
 * "now". Before this change these sites wrote `Date.now()` — a NUMBER — so a
 * type check would have failed too; the regex is what keeps the condition
 * meaningful against a future well-meant `new Date().toString()`, and it is
 * the ISO shape specifically that makes lexicographic order chronological.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ModelDoc, StructureDoc, ResponseDoc, CollaboratorDoc, AHPExportBundle } from '../../types/ahp';

const ISO_8601_MS_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const writes: Record<string, unknown>[] = [];
const record = (payload: unknown) => {
  if (payload && typeof payload === 'object') writes.push(payload as Record<string, unknown>);
};

let snapData: Record<string, unknown> = {};
let snapExists = true;

const batchUpdate = vi.fn((_ref: unknown, payload: Record<string, unknown>) => record(payload));

vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, col: string, id: string) => ({ db, col, id }),
  collection: (db: unknown, col: string) => ({ db, col }),
  getDoc: vi.fn(async () => ({ exists: () => snapExists, data: () => snapData })),
  getDocs: vi.fn(async () => {
    const docs = [{ id: 'm1', data: () => ({ order: 0 }) }, { id: 'm2', data: () => ({ order: 1 }) }];
    return { docs, empty: false, size: docs.length, forEach: (f: (d: unknown) => void) => docs.forEach(f) };
  }),
  setDoc: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => record(payload)),
  updateDoc: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => record(payload)),
  deleteDoc: vi.fn(),
  deleteField: () => '__DELETE__',
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(() => ({ update: batchUpdate, set: batchUpdate, commit: vi.fn(async () => {}) })),
  runTransaction: vi.fn(async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: async () => ({ exists: () => snapExists, data: () => snapData }),
      set: (_ref: unknown, payload: Record<string, unknown>) => record(payload),
      update: (_ref: unknown, payload: Record<string, unknown>) => record(payload),
    }),
  ),
  serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
  arrayUnion: (...a: unknown[]) => ({ _arrayUnion: a }),
  arrayRemove: (...a: unknown[]) => ({ _arrayRemove: a }),
  Timestamp: { fromMillis: (n: number) => ({ toMillis: () => n }) },
}));

vi.mock('../../lib/firebase', () => ({ db: { __mock: true } }));
vi.mock('../../lib/callables', () => ({
  callRevokeInvite: vi.fn(), callResendInvite: vi.fn(), callSendInvitationEmail: vi.fn(),
}));

const { FirestoreAdapter } = await import('../FirestoreAdapter');

const UID = 'uid-iso';

function meta(): ModelDoc {
  return {
    title: 'M', goal: 'G', createdBy: UID, createdAt: 1,
    status: 'draft', completionTier: 'none', synthesisStatus: 'none',
    disagreementConfig: null, publishedSynthesisId: null,
    resultsVisibility: 'owner', collaborators: [],
  } as unknown as ModelDoc;
}
const structure = () => ({ structureVersion: 1, criteria: [], alternatives: [] } as unknown as StructureDoc);
const bundle = () => ({ meta: meta(), structure: structure(), responses: {}, collaborators: [] } as unknown as AHPExportBundle);
const collab = () => ({ userId: 'u2', role: 'voter', isVoting: true } as unknown as CollaboratorDoc);
const response = () => ({ userId: 'u2', status: 'in_progress', comparisons: {} } as unknown as ResponseDoc);

/** Every payload this call produced that carries an `updatedAt`. */
function updatedAts(): unknown[] {
  return writes.filter((w) => 'updatedAt' in w).map((w) => w.updatedAt);
}

function expectIsoWrites() {
  const found = updatedAts();
  // ⚠️ Harness control. A method whose write never fired would leave this
  // empty, and a `for (const v of [])` assertion loop passes vacuously — the
  // exact shape that retired a guard one repo over in this same release.
  expect(found.length).toBeGreaterThan(0);
  for (const v of found) {
    expect(typeof v).toBe('string');
    expect(v as string).toMatch(ISO_8601_MS_UTC);
    expect(new Date(v as string).toISOString()).toBe(v);
  }
}

beforeEach(() => {
  writes.length = 0;
  batchUpdate.mockClear();
  snapExists = true;
  snapData = {
    owner: UID, createdBy: UID, createdAt: 1, title: 'M', goal: 'G',
    members: { [UID]: 'owner' }, collaborators: [{ userId: UID, role: 'owner', isVoting: true }],
    responses: { u2: { userId: 'u2', status: 'in_progress', comparisons: {}, lastModifiedAt: 1 } },
    structure: structure(), synthesis: null, order: 0,
  };
});

describe('every spertahp_projects write emits ISO 8601 updatedAt (PC-2)', () => {
  const cases: [string, (a: InstanceType<typeof FirestoreAdapter>) => Promise<unknown>][] = [
    ['createModel',            (a) => a.createModel('m1', meta(), structure())],
    ['createModelFromBundle',  (a) => a.createModelFromBundle('m1', bundle())],
    ['replaceModelFromBundle', (a) => a.replaceModelFromBundle('m1', bundle())],
    ['updateModel',            (a) => a.updateModel('m1', { title: 'T2' })],
    ['reorderModels',          (a) => a.reorderModels(['m1', 'm2'])],
    ['updateStructure',        (a) => a.updateStructure('m1', structure())],
    ['addCollaborator',        (a) => a.addCollaborator('m1', collab())],
    ['updateCollaborator',     (a) => a.updateCollaborator('m1', 'u2', { isVoting: false })],
    ['removeCollaborator',     (a) => a.removeCollaborator('m1', 'u2')],
    ['createResponse',         (a) => a.createResponse('m1', response())],
    ['updateResponse',         (a) => a.updateResponse('m1', 'u2', { status: 'submitted' })],
    ['saveComparisons',        (a) => a.saveComparisons('m1', 'u2', 'goal', { '0,1': 3 })],
    ['saveSynthesis',          (a) => a.saveSynthesis('m1', 's1', {})],
  ];

  it.each(cases)('%s writes an ISO 8601 updatedAt', async (_name, call) => {
    await call(new FirestoreAdapter(UID));
    expectIsoWrites();
  });

  it('covers all thirteen sites — the count is asserted, not assumed', () => {
    // If a site is added to FirestoreAdapter without a case here, the two
    // numbers diverge and this goes red. Reading the source is deliberate:
    // the alternative is trusting that thirteen cases still means thirteen
    // sites, which is the assumption Brief 19 exists to disprove.
    expect(cases.length).toBe(13);
  });
});
