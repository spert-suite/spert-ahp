// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TestProviders } from '../../__tests__/test-utils';
import { AuthContext } from '../../contexts/AuthContext';
import { StorageContext } from '../../contexts/StorageContext';
import { LocalStorageAdapter } from '../../storage/LocalStorageAdapter';
import { useInvitationLanding } from '../useInvitationLanding';

// Mock the feature flag module so we can flip it per-suite. Vitest hoists
// vi.mock calls, so the import below resolves to the mocked module.
vi.mock('../../lib/featureFlags', () => ({
  __setFlag: (v: boolean) => {
    (globalThis as Record<string, unknown>).__INVITATIONS_ENABLED = v;
  },
  get INVITATIONS_ENABLED() {
    return Boolean((globalThis as Record<string, unknown>).__INVITATIONS_ENABLED);
  },
}));

function setFlag(value: boolean) {
  (globalThis as Record<string, unknown>).__INVITATIONS_ENABLED = value;
}

function setUrl(url: string) {
  window.history.replaceState({}, '', url);
}

describe('useInvitationLanding', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setUrl('/');
    setFlag(true);
  });

  afterEach(() => {
    setFlag(false);
  });

  it('stays idle when the flag is off', () => {
    setFlag(false);
    setUrl('/?invite=tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('idle');
    // Flag-off path should not even touch sessionStorage.
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBeNull();
  });

  it('captures ?invite= into sessionStorage and surfaces a pre_auth state', () => {
    setUrl('/?invite=tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state).toEqual({ kind: 'pre_auth', tokenId: 'tok123' });
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBe('tok123');
    // Query string should be stripped so a reload doesn't replay the banner.
    expect(window.location.search).toBe('');
  });

  it('reads an existing token from sessionStorage when no query param is present', () => {
    sessionStorage.setItem('spert:pendingInviteToken', 'persisted-tok');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state).toEqual({
      kind: 'pre_auth',
      tokenId: 'persisted-tok',
    });
  });

  it('transitions to claimed when spert:models-changed fires', () => {
    setUrl('/?invite=tok123');
    sessionStorage.setItem('spert:pendingInviteToken', 'tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('pre_auth');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('spert:models-changed', {
          detail: {
            claimed: [
              { appId: 'spertahp', modelId: 'm1', modelName: 'Pricing decision' },
            ],
          },
        }),
      );
    });
    expect(result.current.state).toEqual({
      kind: 'claimed',
      modelNames: ['Pricing decision'],
    });
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBeNull();
  });

  it('ignores empty claimed payloads', () => {
    sessionStorage.setItem('spert:pendingInviteToken', 'tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('pre_auth');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('spert:models-changed', { detail: { claimed: [] } }),
      );
    });
    // No transition — token stays put for a future claim.
    expect(result.current.state.kind).toBe('pre_auth');
  });

  // SESSION_KEY gate (Lesson 27): a non-empty claim payload arriving
  // without a SESSION_KEY in sessionStorage MUST NOT transition to
  // 'claimed'. Otherwise a returning user whose claim CF resolved cached
  // invitations would see a spurious banner instead of silently picking
  // up the projects.
  it('ignores spert:models-changed when SESSION_KEY is absent (Lesson 27 gate)', () => {
    // No URL token, no sessionStorage entry — user is not in an invite flow.
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('idle');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('spert:models-changed', {
          detail: {
            claimed: [
              { appId: 'spertahp', modelId: 'm1', modelName: 'Cached project' },
            ],
          },
        }),
      );
    });
    // No transition — payload was dispatched but SESSION_KEY gate held.
    expect(result.current.state.kind).toBe('idle');
  });

  it('dismiss returns to idle and clears sessionStorage', () => {
    setUrl('/?invite=tok123');
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: TestProviders,
    });
    expect(result.current.state.kind).toBe('pre_auth');
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.state.kind).toBe('idle');
    expect(sessionStorage.getItem('spert:pendingInviteToken')).toBeNull();
  });

  // ─── auto-switchMode('cloud') on ?invite= detection ─────────

  function makeWrapperWithStorage(opts: {
    isCloudAvailable: boolean;
    switchMode: (mode: 'local' | 'cloud') => void;
  }) {
    return function Wrapper({ children }: { children: ReactNode }) {
      const adapter = new LocalStorageAdapter();
      return (
        <AuthContext.Provider
          value={{
            user: null,
            loading: false,
            firebaseAvailable: opts.isCloudAvailable,
            signInError: null,
            clearSignInError: () => {},
            signInWithGoogle: async () => {},
            signInWithMicrosoft: async () => {},
            signOut: async () => {},
          }}
        >
          <StorageContext.Provider
            value={{
              adapter,
              mode: 'local',
              isCloudAvailable: opts.isCloudAvailable,
              switchMode: opts.switchMode,
              cloudDataLoaded: true,
              setCloudDataLoaded: () => {},
            }}
          >
            {children}
          </StorageContext.Provider>
        </AuthContext.Provider>
      );
    };
  }

  it("calls switchMode('cloud') when ?invite= is detected and cloud is available with no local projects", async () => {
    setUrl('/?invite=tok123');
    const switchMode = vi.fn();
    renderHook(() => useInvitationLanding(), {
      wrapper: makeWrapperWithStorage({ isCloudAvailable: true, switchMode }),
    });
    // hasLocalProjects() is async; waitFor lets the fire-and-forget
    // promise resolve before asserting.
    await waitFor(() => {
      expect(switchMode).toHaveBeenCalledWith('cloud');
    });
  });

  // Lesson 28 gate: never silently flip to cloud when the device has
  // existing local projects — that would orphan the user's local data.
  it('does NOT call switchMode when local projects exist (Lesson 28 gate)', async () => {
    setUrl('/?invite=tok123');
    // Pre-populate the localStorage modelIndex that hasLocalProjects() reads.
    localStorage.setItem(
      'ahp/modelIndex',
      JSON.stringify([
        { modelId: 'm1', title: 'Existing local', status: 'draft', createdAt: 1, order: 0 },
      ]),
    );
    const switchMode = vi.fn();
    renderHook(() => useInvitationLanding(), {
      wrapper: makeWrapperWithStorage({ isCloudAvailable: true, switchMode }),
    });
    // Give the async hasLocalProjects() check a chance to resolve.
    await new Promise((r) => setTimeout(r, 10));
    expect(switchMode).not.toHaveBeenCalled();
  });

  it('does not call switchMode when cloud is unavailable (Firebase not configured)', async () => {
    setUrl('/?invite=tok123');
    const switchMode = vi.fn();
    renderHook(() => useInvitationLanding(), {
      wrapper: makeWrapperWithStorage({ isCloudAvailable: false, switchMode }),
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(switchMode).not.toHaveBeenCalled();
  });

  it('does not call switchMode when no ?invite= param is present', async () => {
    setUrl('/');
    const switchMode = vi.fn();
    renderHook(() => useInvitationLanding(), {
      wrapper: makeWrapperWithStorage({ isCloudAvailable: true, switchMode }),
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(switchMode).not.toHaveBeenCalled();
  });

  it('does not call switchMode on dismiss', async () => {
    setUrl('/?invite=tok123');
    const switchMode = vi.fn();
    const { result } = renderHook(() => useInvitationLanding(), {
      wrapper: makeWrapperWithStorage({ isCloudAvailable: true, switchMode }),
    });
    await waitFor(() => expect(switchMode).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.dismiss();
    });
    expect(switchMode).toHaveBeenCalledTimes(1);
  });

  // ─── v0.12.1: pre_auth → idle when user signs in but no claim event arrives ──

  function makeWrapperWithUserToggle(getUser: () => User | null) {
    return function Wrapper({ children }: { children: ReactNode }) {
      const adapter = new LocalStorageAdapter();
      return (
        <AuthContext.Provider
          value={{
            user: getUser(),
            loading: false,
            firebaseAvailable: true,
            signInError: null,
            clearSignInError: () => {},
            signInWithGoogle: async () => {},
            signInWithMicrosoft: async () => {},
            signOut: async () => {},
          }}
        >
          <StorageContext.Provider
            value={{
              adapter,
              mode: 'local',
              isCloudAvailable: true,
              switchMode: () => {},
              cloudDataLoaded: true,
              setCloudDataLoaded: () => {},
            }}
          >
            {children}
          </StorageContext.Provider>
        </AuthContext.Provider>
      );
    };
  }

  // 30s grace timer (Lesson 7). The pre_auth → idle transition no longer
  // fires immediately on user sign-in — it waits up to 30s for a claim
  // event, then auto-dismisses. Catches "wrong account" / "claim failed
  // silently" cases without stranding the banner.
  it('30s grace timer expires pre_auth → idle when user signs in but no claim arrives', () => {
    vi.useFakeTimers();
    try {
      setUrl('/?invite=tok123');
      let currentUser: User | null = null;
      const { result, rerender } = renderHook(() => useInvitationLanding(), {
        wrapper: makeWrapperWithUserToggle(() => currentUser),
      });
      expect(result.current.state.kind).toBe('pre_auth');

      // User signs in — timer starts but does NOT immediately transition.
      act(() => {
        currentUser = { uid: 'user-1' } as User;
      });
      rerender();
      expect(result.current.state.kind).toBe('pre_auth');

      // Just before 30s: still pre_auth.
      act(() => {
        vi.advanceTimersByTime(29_999);
      });
      expect(result.current.state.kind).toBe('pre_auth');

      // At 30s: timer fires, consumes SESSION_KEY before setState (Lesson 59).
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.state.kind).toBe('idle');
      expect(sessionStorage.getItem('spert:pendingInviteToken')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a successful claim transition: signed-in then claim event yields claimed, not idle', () => {
    setUrl('/?invite=tok123');
    let currentUser: User | null = null;
    const { result, rerender } = renderHook(() => useInvitationLanding(), {
      wrapper: makeWrapperWithUserToggle(() => currentUser),
    });
    expect(result.current.state.kind).toBe('pre_auth');

    act(() => {
      currentUser = { uid: 'user-1' } as User;
    });
    rerender();

    // pre_auth persists (no immediate idle transition); claim event arrives
    // within the 30s window, transitions to claimed, and Effect 4's cleanup
    // clears the pending grace-timer.
    act(() => {
      window.dispatchEvent(
        new CustomEvent('spert:models-changed', {
          detail: {
            claimed: [
              { appId: 'spertahp', modelId: 'm1', modelName: 'Pricing decision' },
            ],
          },
        }),
      );
    });

    expect(result.current.state).toEqual({
      kind: 'claimed',
      modelNames: ['Pricing decision'],
    });
  });

  it('grace timer does not fire when claim event arrives first (cleanup races)', () => {
    vi.useFakeTimers();
    try {
      setUrl('/?invite=tok123');
      let currentUser: User | null = null;
      const { result, rerender } = renderHook(() => useInvitationLanding(), {
        wrapper: makeWrapperWithUserToggle(() => currentUser),
      });
      act(() => {
        currentUser = { uid: 'user-1' } as User;
      });
      rerender();
      expect(result.current.state.kind).toBe('pre_auth');

      // Claim arrives at 5s
      act(() => {
        vi.advanceTimersByTime(5_000);
        window.dispatchEvent(
          new CustomEvent('spert:models-changed', {
            detail: {
              claimed: [
                { appId: 'spertahp', modelId: 'm1', modelName: 'Pricing decision' },
              ],
            },
          }),
        );
      });
      expect(result.current.state.kind).toBe('claimed');

      // Advance past the original 30s window — timer was cleaned up,
      // so claimed state must survive.
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(result.current.state.kind).toBe('claimed');
    } finally {
      vi.useRealTimers();
    }
  });
});
