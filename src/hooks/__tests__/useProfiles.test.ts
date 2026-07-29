// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

// @vitest-environment jsdom
//
// Regression: SharingSection renders
//   profileMap[c.userId]?.displayName || `${c.userId.slice(0, 8)}…`
// so an unresolved profile put a truncated raw Firebase Auth UID on screen.
//
// useProfiles resolved names against spertahp_profiles only — written on THIS
// app's sign-in. The cross-app invitation Cloud Function resolves an invitee BY
// their spertsuite_profiles doc and then writes only members.{uid}; it never
// seeds a per-app profile. A collaborator who had used another SPERT app but
// never opened AHP therefore had no per-app profile at all.
//
// Suite-wide sweep 2026-07-29; first found in SPERT Story Map v0.49.3.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// vi.mock factories are hoisted above ordinary const declarations and run while
// the module under test is imported, so shared fixture state must be hoisted too.
const h = vi.hoisted(() => {
  const state = {
    /** Docs keyed by "collection/id"; an absent key means exists() === false. */
    docs: {} as Record<string, Record<string, unknown>>,
    /** Every getDoc path, so read behaviour can be asserted. */
    reads: [] as string[],
    /** Current auth user; useProfiles short-circuits for its own uid. */
    user: null as { uid: string; displayName?: string; email?: string } | null,
  };
  return {
    state,
    docSpy: (_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` }),
    getDocSpy: async (ref: { path: string }) => {
      state.reads.push(ref.path);
      const data = state.docs[ref.path];
      return { exists: () => data !== undefined, data: () => data };
    },
  };
});

vi.mock('firebase/firestore', () => ({
  doc: h.docSpy,
  getDoc: h.getDocSpy,
}));

vi.mock('../../lib/firebase', () => ({ db: {} as unknown }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: h.state.user }),
}));

import { useProfiles } from '../useProfiles';

const MEMBER = 'nT5V5xk8pcNHpHE7IjMxJtmQBPa2';

beforeEach(() => {
  h.state.reads = [];
  h.state.docs = {};
  h.state.user = { uid: 'someone-else-uid', displayName: 'Owner', email: 'owner@example.com' };
});

describe('useProfiles — suite profile fallback', () => {
  it('falls back to spertsuite_profiles when the per-app profile is missing', async () => {
    h.state.docs[`spertsuite_profiles/${MEMBER}`] = {
      displayName: 'William W Davis',
      email: 'famousdavispmp@gmail.com',
    };

    const { result } = renderHook(() => useProfiles([MEMBER]));

    await waitFor(() => {
      expect(result.current[MEMBER]?.displayName).toBe('William W Davis');
    });
    expect(result.current[MEMBER]?.email).toBe('famousdavispmp@gmail.com');
  });

  it('does not read the suite mirror when the per-app profile exists', async () => {
    h.state.docs[`spertahp_profiles/${MEMBER}`] = {
      displayName: 'Local Profile',
      email: 'local@example.com',
    };
    h.state.docs[`spertsuite_profiles/${MEMBER}`] = {
      displayName: 'Suite Profile',
      email: 'suite@example.com',
    };

    const { result } = renderHook(() => useProfiles([MEMBER]));

    await waitFor(() => {
      expect(result.current[MEMBER]?.displayName).toBe('Local Profile');
    });
    expect(h.state.reads).not.toContain(`spertsuite_profiles/${MEMBER}`);
  });

  it('leaves the uid unmapped when neither profile exists', async () => {
    const { result } = renderHook(() => useProfiles([MEMBER]));

    // Both lookups attempted before giving up; caller then shows a truncated uid.
    await waitFor(() => {
      expect(h.state.reads).toContain(`spertsuite_profiles/${MEMBER}`);
    });
    expect(h.state.reads).toContain(`spertahp_profiles/${MEMBER}`);
    expect(result.current[MEMBER]).toBeUndefined();
  });

  it('still short-circuits the current user without any Firestore read', async () => {
    h.state.user = { uid: MEMBER, displayName: 'Me', email: 'me@example.com' };

    const { result } = renderHook(() => useProfiles([MEMBER]));

    await waitFor(() => {
      expect(result.current[MEMBER]?.displayName).toBe('Me');
    });
    expect(h.state.reads).toEqual([]);
  });
});
