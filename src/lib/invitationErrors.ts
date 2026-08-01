// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

/**
 * Translate a Firebase callable error into copy the owner can act on.
 * Falls back to the raw message for unmapped codes.
 *
 * `context` disambiguates error codes shared across callables — e.g.
 * resource-exhausted means the per-day 25-cap on send, but the per-
 * invitation 5-cap on resend; permission-denied / failed-precondition
 * also need different copy for resend/revoke vs. send vs. updateVoting.
 *
 * `'updateVoting'` is the v0.12.1 context for the updateInvite callable
 * fired from the per-row Voting checkbox in the pending-invitations list.
 * The server has no resend-count cap on updateInvite, but
 * resource-exhausted is defended in case one is added later;
 * failed-precondition is the most likely real-world hit (toggle voting
 * on an invitation that just got accepted/revoked).
 */
export type InvitationErrorContext = 'send' | 'resend' | 'revoke' | 'updateVoting';

export function mapInvitationError(
  err: unknown,
  context: InvitationErrorContext = 'send',
): string {
  const code = (err as { code?: string }).code ?? '';
  const message = (err as { message?: string }).message ?? '';
  if (code === 'functions/resource-exhausted') {
    if (context === 'resend') {
      return 'This invitation has reached its resend limit (5). Revoke and re-invite to start over.';
    }
    if (context === 'updateVoting') {
      return 'Too many invitation updates — try again in a moment.';
    }
    return "You've reached today's invitation limit (25). Try again tomorrow.";
  }
  if (code === 'functions/permission-denied') {
    if (context === 'resend' || context === 'revoke') {
      return 'Only the model owner can resend or revoke this invitation.';
    }
    if (context === 'updateVoting') {
      return 'Only the model owner can update this invitation.';
    }
    return 'Only the model owner can send invitations.';
  }
  if (code === 'functions/failed-precondition') {
    if (context === 'resend' || context === 'revoke') {
      return 'This invitation can no longer be resent or revoked.';
    }
    if (context === 'updateVoting') {
      return 'This invitation can no longer be modified.';
    }
    return message || 'The invitation request could not be processed.';
  }
  if (code === 'functions/unauthenticated') {
    return 'Please sign in again before sending invitations.';
  }
  if (code === 'functions/not-found') {
    if (context === 'resend' || context === 'revoke' || context === 'updateVoting') {
      return 'This invitation no longer exists. Try reloading.';
    }
    return 'This decision could not be found. Try reloading.';
  }
  if (code === 'functions/invalid-argument') {
    return message || 'One of the invitation fields is invalid.';
  }
  if (context === 'resend') {
    return message || 'Something went wrong resending the invitation.';
  }
  if (context === 'revoke') {
    return message || 'Something went wrong revoking the invitation.';
  }
  if (context === 'updateVoting') {
    return message || 'Something went wrong updating the invitation.';
  }
  return message || 'Something went wrong sending the invitations.';
}
