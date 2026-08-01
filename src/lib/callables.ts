// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { httpsCallable, type Functions } from 'firebase/functions';
import { functions } from './firebase';
import type {
  SendInvitationEmailInput,
  SendInvitationEmailResult,
  ClaimPendingInvitationsResult,
  RevokeInviteInput,
  RevokeInviteResult,
  ResendInviteInput,
  ResendInviteResult,
  UpdateInviteInput,
  UpdateInviteResult,
} from './firebase';

/**
 * Throws when Firebase Functions has not been initialized (no
 * VITE_FIREBASE_* env vars). Callers that legitimately need to
 * no-op in unconfigured builds should gate on `isFirebaseAvailable`
 * before invoking these wrappers (Lesson 61).
 */
export function requireFunctions(): Functions {
  if (!functions) {
    throw new Error(
      'Firebase Functions is not initialized — VITE_FIREBASE_* env vars are missing.',
    );
  }
  return functions;
}

// Async wrappers — synchronous requireFunctions() throw becomes a
// rejected Promise, matching the documented contract that callers see
// rejections (not synchronous throws) from these helpers.

export async function callSendInvitationEmail(
  input: SendInvitationEmailInput,
): Promise<SendInvitationEmailResult> {
  const r = await httpsCallable<SendInvitationEmailInput, SendInvitationEmailResult>(
    requireFunctions(),
    'sendInvitationEmail',
  )(input);
  return r.data;
}

export async function callClaimPendingInvitations(): Promise<ClaimPendingInvitationsResult> {
  const r = await httpsCallable<Record<string, never>, ClaimPendingInvitationsResult>(
    requireFunctions(),
    'claimPendingInvitations',
  )({});
  return r.data;
}

export async function callRevokeInvite(tokenId: string): Promise<RevokeInviteResult> {
  const r = await httpsCallable<RevokeInviteInput, RevokeInviteResult>(
    requireFunctions(),
    'revokeInvite',
  )({ tokenId });
  return r.data;
}

export async function callResendInvite(tokenId: string): Promise<ResendInviteResult> {
  const r = await httpsCallable<ResendInviteInput, ResendInviteResult>(
    requireFunctions(),
    'resendInvite',
  )({ tokenId });
  return r.data;
}

export async function callUpdateInvite(
  tokenId: string,
  isVoting: boolean,
): Promise<UpdateInviteResult> {
  const r = await httpsCallable<UpdateInviteInput, UpdateInviteResult>(
    requireFunctions(),
    'updateInvite',
  )({ tokenId, isVoting });
  return r.data;
}
