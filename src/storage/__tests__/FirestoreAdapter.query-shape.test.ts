// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * FirestoreAdapter — the query shape the Firestore `list` rule requires.
 *
 * Pins the SHAPE of the query this adapter runs against the projects
 * collection, because that shape is a security boundary.
 *
 * `firestore.rules` constrains `list` on this collection to
 * `members[uid] in ['owner', 'editor', 'viewer']`, and Firestore permits a
 * list query only when its filter PROVES that constraint. Drop or widen this
 * filter and the query does not return more rows — it returns
 * PERMISSION_DENIED, and no model loads at all.
 *
 * Until 2026-08-19 the rule was `allow list: if isAuth()`, which let any
 * signed-in SPERT user read every project in the collection.
 *
 * ⚠️ WHY THIS EXISTS SEPARATELY from rules-tests/project-collections-list.test.ts
 * in the spert-landing-page repo: that suite runs the real rules against an
 * emulator, but it encodes this query as written and lives in ANOTHER
 * repository — it cannot fail when this adapter changes. This is the half that
 * fails HERE, in the repo where the edit is made. Neither is redundant.
 *
 * Uses the same vi.mock pattern as FirestoreAdapter.replace.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const whereMock = vi.fn((...args: unknown[]) => ({ __where: args }));
const queryMock = vi.fn((...args: unknown[]) => ({ __query: args }));
const collectionMock = vi.fn((_db: unknown, path: string) => ({ __col: path }));
const getDocsMock = vi.fn(async () => ({ docs: [], forEach: () => {} }));

vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, col: string, id: string) => ({ db, col, id }),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  deleteField: () => '__DELETE__',
  collection: (...args: Parameters<typeof collectionMock>) => collectionMock(...args),
  query: (...args: Parameters<typeof queryMock>) => queryMock(...args),
  where: (...args: Parameters<typeof whereMock>) => whereMock(...args),
  getDocs: (...args: Parameters<typeof getDocsMock>) => getDocsMock(...args),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn() })),
  runTransaction: vi.fn(),
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

const UID = 'uid-under-test';

describe('projects collection — query shape required by the Firestore list rule', () => {
  beforeEach(() => {
    whereMock.mockClear();
    queryMock.mockClear();
    collectionMock.mockClear();
  });

  it('listModels filters by membership — never unfiltered', async () => {
    await new FirestoreAdapter(UID).listModels();

    // The full ordered call list, not toHaveBeenCalledWith: an ADDITIONAL
    // unconstrained query would pass the latter, and that is precisely the
    // regression that matters.
    expect(whereMock.mock.calls).toEqual([
      [`members.${UID}`, 'in', ['owner', 'editor', 'viewer']],
    ]);
  });

  it('builds that query against the projects collection, with a filter', async () => {
    await new FirestoreAdapter(UID).listModels();

    expect(collectionMock).toHaveBeenCalledWith({ __mock: true }, 'spertahp_projects');
    // query(collection, where) — a bare query(collection) is the LIST-1 shape.
    expect(queryMock.mock.calls[0].length).toBeGreaterThan(1);
  });
});
