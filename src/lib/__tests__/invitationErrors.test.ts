// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect } from 'vitest';
import { mapInvitationError } from '../invitationErrors';

describe('mapInvitationError', () => {
  it('maps resource-exhausted to the per-day cap message (default send context)', () => {
    expect(mapInvitationError({ code: 'functions/resource-exhausted' })).toBe(
      "You've reached today's invitation limit (25). Try again tomorrow.",
    );
  });

  it('maps permission-denied to the owner-only message', () => {
    expect(mapInvitationError({ code: 'functions/permission-denied' })).toBe(
      'Only the model owner can send invitations.',
    );
  });

  it('maps unauthenticated to a re-sign-in prompt', () => {
    expect(mapInvitationError({ code: 'functions/unauthenticated' })).toMatch(
      /sign in/i,
    );
  });

  it('maps not-found to a reload hint', () => {
    expect(mapInvitationError({ code: 'functions/not-found' })).toMatch(/reloading/i);
  });

  it('uses the original message for invalid-argument when present', () => {
    expect(
      mapInvitationError({
        code: 'functions/invalid-argument',
        message: 'isVoting must be a boolean.',
      }),
    ).toBe('isVoting must be a boolean.');
  });

  it('falls back to the raw message for unmapped codes', () => {
    expect(mapInvitationError({ code: 'functions/unknown', message: 'oh no' })).toBe(
      'oh no',
    );
  });

  it('falls back to a generic message when neither code nor message is present', () => {
    expect(mapInvitationError({})).toMatch(/something went wrong/i);
  });

  // ─── Phase 3.5: context-aware copy for resend / revoke ──

  it('maps resource-exhausted to the per-invitation cap message when context=resend', () => {
    expect(
      mapInvitationError({ code: 'functions/resource-exhausted' }, 'resend'),
    ).toBe(
      'This invitation has reached its resend limit (5). Revoke and re-invite to start over.',
    );
  });

  it('maps permission-denied to the resend/revoke variant when context=resend', () => {
    expect(
      mapInvitationError({ code: 'functions/permission-denied' }, 'resend'),
    ).toBe('Only the model owner can resend or revoke this invitation.');
  });

  it('maps permission-denied to the resend/revoke variant when context=revoke', () => {
    expect(
      mapInvitationError({ code: 'functions/permission-denied' }, 'revoke'),
    ).toBe('Only the model owner can resend or revoke this invitation.');
  });

  it('maps failed-precondition to the non-pending message for resend/revoke', () => {
    expect(
      mapInvitationError({ code: 'functions/failed-precondition' }, 'resend'),
    ).toBe('This invitation can no longer be resent or revoked.');
    expect(
      mapInvitationError({ code: 'functions/failed-precondition' }, 'revoke'),
    ).toBe('This invitation can no longer be resent or revoked.');
  });

  it('maps not-found to a different copy for resend/revoke contexts', () => {
    expect(
      mapInvitationError({ code: 'functions/not-found' }, 'resend'),
    ).toMatch(/no longer exists/i);
    expect(
      mapInvitationError({ code: 'functions/not-found' }, 'revoke'),
    ).toMatch(/no longer exists/i);
  });

  it('falls back to a context-appropriate generic for unmapped resend/revoke errors', () => {
    expect(mapInvitationError({}, 'resend')).toMatch(/resending/i);
    expect(mapInvitationError({}, 'revoke')).toMatch(/revoking/i);
  });

  // ─── v0.12.1: context-aware copy for updateVoting ──

  it('maps resource-exhausted to the rate-limit message when context=updateVoting', () => {
    expect(
      mapInvitationError({ code: 'functions/resource-exhausted' }, 'updateVoting'),
    ).toBe('Too many invitation updates — try again in a moment.');
  });

  it('maps permission-denied to the owner-only update message when context=updateVoting', () => {
    expect(
      mapInvitationError({ code: 'functions/permission-denied' }, 'updateVoting'),
    ).toBe('Only the model owner can update this invitation.');
  });

  it('maps failed-precondition to the non-modifiable message when context=updateVoting', () => {
    expect(
      mapInvitationError({ code: 'functions/failed-precondition' }, 'updateVoting'),
    ).toBe('This invitation can no longer be modified.');
  });

  it('maps not-found to a reload hint when context=updateVoting', () => {
    expect(
      mapInvitationError({ code: 'functions/not-found' }, 'updateVoting'),
    ).toMatch(/no longer exists/i);
  });

  it('falls back to a context-appropriate generic for unmapped updateVoting errors', () => {
    expect(mapInvitationError({}, 'updateVoting')).toMatch(/updating/i);
  });
});
