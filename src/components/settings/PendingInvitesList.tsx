// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import type { PendingInvite } from '../../types/ahp';

interface PendingInvitesListProps {
  pendingInvites: PendingInvite[];
  /** tokenId of the row whose action is in flight; null otherwise. Drives
   *  the per-row "Working…" label and disables every row's buttons while
   *  any one action runs. */
  actionBusy: string | null;
  onResend: (tokenId: string) => void;
  onToggleVoting: (tokenId: string, nextValue: boolean) => void;
  onRevoke: (tokenId: string) => void;
}

function formatDate(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString();
}

export default function PendingInvitesList({
  pendingInvites,
  actionBusy,
  onResend,
  onToggleVoting,
  onRevoke,
}: PendingInvitesListProps) {
  if (pendingInvites.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Pending invitations ({pendingInvites.length})
      </h4>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
        {pendingInvites.map((p) => {
          const sendCount = p.emailSendCount ?? 0;
          const rowBusy = actionBusy === p.tokenId;
          const anyBusy = actionBusy !== null;
          return (
            <li
              key={p.tokenId}
              className="flex items-center justify-between px-3 py-2 gap-2 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 dark:text-gray-100 truncate">
                  {p.inviteeEmail}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {p.role}
                  {p.lastEmailSentAt
                    ? ` · sent ${formatDate(p.lastEmailSentAt)} (${sendCount}/5)`
                    : ` · sent (${sendCount}/5)`}
                  {p.expiresAt ? ` · expires ${formatDate(p.expiresAt)}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.role === 'editor' && (
                  <label className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      name="pendingInviteVoting"
                      checked={p.isVoting}
                      onChange={(e) => onToggleVoting(p.tokenId, e.target.checked)}
                      disabled={anyBusy}
                      aria-label={`Toggle voting rights for ${p.inviteeEmail}`}
                    />
                    Voting
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => onResend(p.tokenId)}
                  disabled={anyBusy}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  aria-label={`Resend invitation to ${p.inviteeEmail}`}
                >
                  {rowBusy ? 'Working…' : 'Resend'}
                </button>
                <button
                  type="button"
                  onClick={() => onRevoke(p.tokenId)}
                  disabled={anyBusy}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  aria-label={`Revoke invitation to ${p.inviteeEmail}`}
                >
                  Revoke
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
