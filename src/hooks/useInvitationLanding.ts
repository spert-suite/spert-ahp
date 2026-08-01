// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../contexts/StorageContext';
import { INVITATIONS_ENABLED } from '../lib/featureFlags';
import {
  captureInviteTokenFromUrl,
  INVITE_SESSION_KEY as SESSION_KEY,
} from '../lib/captureInviteTokenFromUrl';

const GRACE_TIMEOUT_MS = 30_000;

export type InvitationLandingState =
  | { kind: 'idle' }
  | { kind: 'pre_auth'; tokenId: string }
  | { kind: 'claimed'; modelNames: string[] };

interface ClaimedDetail {
  appId: string;
  modelId: string;
  modelName: string;
}

/**
 * Manages the ?invite=tokenId landing flow. Three-state machine matching
 * the Story Map canonical implementation (Lessons 7, 27, 59):
 *
 *   idle → pre_auth → claimed       (happy path)
 *           pre_auth → idle         (30s grace timer expires; user never
 *                                    arrived, or signed in with the wrong
 *                                    account, or claim failed silently)
 *
 *   - Effect 1: capture ?invite= on mount, persist to sessionStorage,
 *     strip URL, and pre-flip storage mode to 'cloud' so the freshly-
 *     claimed model is visible after sign-in.
 *   - Effect 2: rehydrate pre_auth from sessionStorage on remount when
 *     state is idle (handles route changes and React re-mounts).
 *   - Effect 3: spert:models-changed listener with SESSION_KEY gate
 *     (Lesson 27) — without the gate, a normal sign-in by a user with
 *     pending invitations would show a spurious 'claimed' banner.
 *     SESSION_KEY is consumed BEFORE setState (Lesson 59) so a second
 *     event can't re-trigger the banner after dismissal.
 *   - Effect 4: 30s grace timer when pre_auth + user signed in. Catches
 *     "signed in with wrong account" and "claim failed silently"; both
 *     auto-dismiss after 30s rather than stranding the banner.
 *   - dismiss() consumes SESSION_KEY before setState (Lesson 59).
 *
 * Behind INVITATIONS_ENABLED — short-circuits to 'idle' when off.
 */
export function useInvitationLanding(): {
  state: InvitationLandingState;
  dismiss: () => void;
} {
  const { user, firebaseAvailable } = useAuth();
  const { adapter, switchMode, isCloudAvailable } = useStorage();
  const [state, setState] = useState<InvitationLandingState>({ kind: 'idle' });

  // Effect 1 — capture ?invite= on mount; auto-flip storage mode.
  // deps intentionally [] — mount-only landing capture; adapter/switchMode/
  // isCloudAvailable captured at mount, subsequent changes don't replay
  // the URL handling. URL capture extracted to captureInviteTokenFromUrl
  // for testability (Lesson 58).
  useEffect(() => {
    if (!INVITATIONS_ENABLED) return;
    const token = captureInviteTokenFromUrl();
    if (!token) return;
    // Pre-flip the storage preference so that whatever path the user
    // takes to sign in (banner CTA or header AuthChip), they end up in
    // cloud mode and can see the freshly-claimed shared project.
    //
    // localProjectCount === 0 gate (Lesson 28): never auto-flip when the
    // device already has local projects — silently flipping would orphan
    // the user's local data path. The check is async (adapter capability)
    // and fire-and-forget so it doesn't block the pre_auth transition.
    if (isCloudAvailable) {
      void adapter.hasLocalProjects().then((has) => {
        if (!has) switchMode('cloud');
      });
    }
    setState({ kind: 'pre_auth', tokenId: token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2 — rehydrate pre_auth from sessionStorage on remount when idle.
  // Handles route changes / React re-mounts where Effect 1's mount-only logic
  // doesn't replay. Only fires when state is idle and user not yet signed in.
  useEffect(() => {
    if (!INVITATIONS_ENABLED) return;
    if (typeof window === 'undefined') return;
    if (state.kind !== 'idle') return;
    if (user) return;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(SESSION_KEY);
    } catch {
      // sessionStorage unavailable — non-fatal.
    }
    if (stored) {
      setState({ kind: 'pre_auth', tokenId: stored });
    }
  }, [state.kind, user]);

  // Effect 3 — listen for claim confirmation from AuthContext.
  //
  // SESSION_KEY gate (Lesson 27): only transition to 'claimed' if the user
  // arrived via an invite link this session. Without this gate, any user
  // with a non-empty pending-invitation claim payload (e.g. a returning
  // user whose claim CF resolved cached invitations) would see a spurious
  // banner — projects should appear silently in that case.
  //
  // Consume-before-transition (Lesson 59): removeItem before setState so
  // a second event firing in the same tick can't re-trigger the banner
  // after dismissal.
  useEffect(() => {
    if (!INVITATIONS_ENABLED) return;
    if (typeof window === 'undefined') return;
    const onChanged = (evt: Event) => {
      let stored: string | null = null;
      try {
        stored = sessionStorage.getItem(SESSION_KEY);
      } catch {
        // sessionStorage unavailable — non-fatal.
      }
      if (!stored) return;
      const detail = (evt as CustomEvent<{ claimed?: ClaimedDetail[] }>).detail;
      const claimed = detail?.claimed ?? [];
      if (claimed.length === 0) return;
      const names = claimed.map((c) => c.modelName).filter((n) => n.length > 0);
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // sessionStorage unavailable — non-fatal.
      }
      setState({ kind: 'claimed', modelNames: names });
    };
    window.addEventListener('spert:models-changed', onChanged);
    return () => window.removeEventListener('spert:models-changed', onChanged);
  }, []);

  // Effect 4 — 30s grace timer. Fires when pre_auth + user is signed in.
  // Two cases (Lesson 7):
  //   (a) right account, slow CF cold start: claim resolves in 5–15s;
  //       Effect 3 fires first; this timer's cleanup clears the timeout.
  //   (b) wrong account / expired invite / silent failure: claim returns
  //       empty or never fires; timer auto-dismisses to idle after 30s.
  // Both consume SESSION_KEY before setState (Lesson 59).
  useEffect(() => {
    if (!INVITATIONS_ENABLED) return;
    if (state.kind !== 'pre_auth') return;
    if (!user) return;
    if (!firebaseAvailable) return;
    const timeout = setTimeout(() => {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // sessionStorage unavailable — non-fatal.
      }
      setState({ kind: 'idle' });
    }, GRACE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [state.kind, user, firebaseAvailable]);

  return {
    state,
    dismiss: () => {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // sessionStorage unavailable — non-fatal.
      }
      setState({ kind: 'idle' });
    },
  };
}
