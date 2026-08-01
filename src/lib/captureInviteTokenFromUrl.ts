// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { INVITATIONS_ENABLED } from './featureFlags';

export const INVITE_SESSION_KEY = 'spert:pendingInviteToken';
export const INVITE_QUERY_PARAM = 'invite';

/**
 * Captures the ?invite=<token> URL param if present, persists it to
 * sessionStorage (so it survives an OAuth popup round-trip), and
 * strips the param from the address bar so reloads don't replay the
 * banner. Returns the captured token, or null if no token was present.
 *
 * Vite SPA — no SSR guard needed; no module-level IIFE because AHP's
 * shell has no router-level index redirect to outrun (Lesson 55).
 * Extracted from useInvitationLanding for testability (Lesson 58).
 */
export function captureInviteTokenFromUrl(
  enabled: boolean = INVITATIONS_ENABLED,
): string | null {
  if (!enabled) return null;
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get(INVITE_QUERY_PARAM);
    if (!token) return null;
    sessionStorage.setItem(INVITE_SESSION_KEY, token);
    url.searchParams.delete(INVITE_QUERY_PARAM);
    // Preserve pathname + remaining search + fragment so deep links
    // and anchor scrolls survive the strip.
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    return token;
  } catch {
    return null;
  }
}
