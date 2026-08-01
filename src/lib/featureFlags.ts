// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * Compile-time feature flags. Flip in code + ship a release to toggle.
 *
 * INVITATIONS_ENABLED: Email-based project invitation flow (v0.11.0).
 *   Off → SharingSection renders the legacy single-email-input UI and
 *         AuthContext does not call claimPendingInvitations.
 *   On  → SharingSection renders the bulk textarea + pending-invite list,
 *         and AuthContext fires claimPendingInvitations on every auth
 *         resolution.
 */
export const INVITATIONS_ENABLED = true;
