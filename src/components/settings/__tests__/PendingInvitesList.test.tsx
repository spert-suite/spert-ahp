// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PendingInvitesList from '../PendingInvitesList';
import type { PendingInvite } from '../../../types/ahp';

function makeInvite(overrides: Partial<PendingInvite> = {}): PendingInvite {
  return {
    tokenId: 'tok-1',
    appId: 'spertahp',
    modelId: 'm-1',
    modelName: 'Test',
    inviteeEmail: 'alice@example.com',
    role: 'editor',
    isVoting: true,
    inviterUid: 'owner-uid',
    inviterName: 'Owner',
    inviterEmail: 'owner@example.com',
    status: 'pending',
    createdAt: 1_700_000_000_000,
    expiresAt: 1_702_592_000_000,
    lastEmailSentAt: 1_700_086_400_000,
    emailSendCount: 1,
    updatedAt: 1_700_086_400_000,
    ...overrides,
  };
}

function noop() {
  /* placeholder callback */
}

describe('PendingInvitesList', () => {
  it('renders nothing when the list is empty', () => {
    const { container } = render(
      <PendingInvitesList
        pendingInvites={[]}
        actionBusy={null}
        onResend={noop}
        onToggleVoting={noop}
        onRevoke={noop}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders one row per invitation with email, role, send count, and expiry', () => {
    render(
      <PendingInvitesList
        pendingInvites={[makeInvite(), makeInvite({ tokenId: 'tok-2', inviteeEmail: 'bob@example.com' })]}
        actionBusy={null}
        onResend={noop}
        onToggleVoting={noop}
        onRevoke={noop}
      />,
    );
    expect(screen.getByText('Pending invitations (2)')).toBeTruthy();
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByText('bob@example.com')).toBeTruthy();
    // Send-count "(1/5)" is in a metadata line that contains other text;
    // a substring match is enough.
    expect(screen.getAllByText(/1\/5/).length).toBeGreaterThan(0);
  });

  it('hides the voting checkbox for viewer invites', () => {
    render(
      <PendingInvitesList
        pendingInvites={[makeInvite({ role: 'viewer', isVoting: false })]}
        actionBusy={null}
        onResend={noop}
        onToggleVoting={noop}
        onRevoke={noop}
      />,
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('fires onResend with the row tokenId', () => {
    const onResend = vi.fn();
    render(
      <PendingInvitesList
        pendingInvites={[makeInvite()]}
        actionBusy={null}
        onResend={onResend}
        onToggleVoting={noop}
        onRevoke={noop}
      />,
    );
    fireEvent.click(screen.getByLabelText('Resend invitation to alice@example.com'));
    expect(onResend).toHaveBeenCalledWith('tok-1');
  });

  it('fires onToggleVoting with tokenId and the next checked value', () => {
    const onToggleVoting = vi.fn();
    render(
      <PendingInvitesList
        pendingInvites={[makeInvite({ isVoting: true })]}
        actionBusy={null}
        onResend={noop}
        onToggleVoting={onToggleVoting}
        onRevoke={noop}
      />,
    );
    fireEvent.click(screen.getByLabelText('Toggle voting rights for alice@example.com'));
    expect(onToggleVoting).toHaveBeenCalledWith('tok-1', false);
  });

  it('fires onRevoke with the row tokenId', () => {
    const onRevoke = vi.fn();
    render(
      <PendingInvitesList
        pendingInvites={[makeInvite()]}
        actionBusy={null}
        onResend={noop}
        onToggleVoting={noop}
        onRevoke={onRevoke}
      />,
    );
    fireEvent.click(screen.getByLabelText('Revoke invitation to alice@example.com'));
    expect(onRevoke).toHaveBeenCalledWith('tok-1');
  });

  it('shows "Working…" only on the busy row and disables every row', () => {
    render(
      <PendingInvitesList
        pendingInvites={[
          makeInvite({ tokenId: 'tok-1', inviteeEmail: 'alice@example.com' }),
          makeInvite({ tokenId: 'tok-2', inviteeEmail: 'bob@example.com' }),
        ]}
        actionBusy="tok-1"
        onResend={noop}
        onToggleVoting={noop}
        onRevoke={noop}
      />,
    );
    const aliceResend = screen.getByLabelText('Resend invitation to alice@example.com') as HTMLButtonElement;
    const bobResend = screen.getByLabelText('Resend invitation to bob@example.com') as HTMLButtonElement;
    expect(aliceResend.textContent).toBe('Working…');
    expect(bobResend.textContent).toBe('Resend');
    // Both rows' action buttons disabled while one action is in flight.
    expect(aliceResend.disabled).toBe(true);
    expect(bobResend.disabled).toBe(true);
    expect((screen.getByLabelText('Revoke invitation to alice@example.com') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Revoke invitation to bob@example.com') as HTMLButtonElement).disabled).toBe(true);
  });
});
