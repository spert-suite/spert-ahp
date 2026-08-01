// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FirebaseError } from 'firebase/app';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, type SendInvitationEmailResult } from '../../lib/firebase';
import { callSendInvitationEmail } from '../../lib/callables';
import { INVITATIONS_ENABLED } from '../../lib/featureFlags';
import { mapInvitationError } from '../../lib/invitationErrors';
import { parseBulkEmails } from '../../lib/parseBulkEmails';
import { useAuth } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';
import { useProfiles } from '../../hooks/useProfiles';
import PendingInvitesList from './PendingInvitesList';
import type {
  UseAHPReturn,
  CollaboratorDoc,
  CollaboratorRole,
  PendingInvite,
} from '../../types/ahp';

interface SharingSectionProps {
  ahpState: UseAHPReturn;
}

async function lookupUidByEmail(email: string): Promise<{ uid: string; displayName?: string } | null> {
  if (!db) return null;
  // limit(1) is required by the spertahp_profiles list rule (v0.7.2) to
  // block bulk profile enumeration while preserving this email-to-uid
  // lookup. Email equality is unique in practice, so a hit is deterministic.
  const q = query(
    collection(db, 'spertahp_profiles'),
    where('email', '==', email.trim().toLowerCase()),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0]!;
  const data = first.data() as { displayName?: string };
  return { uid: first.id, displayName: data.displayName };
}

export default function SharingSection({ ahpState }: SharingSectionProps) {
  const { user } = useAuth();
  const { mode } = useStorage();
  const [collabs, setCollabs] = useState<CollaboratorDoc[]>([]);
  // Legacy (flag off) — single email input.
  const [email, setEmail] = useState('');
  // New (flag on) — bulk-paste textarea.
  const [bulkEmails, setBulkEmails] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  // v0.12.0: voting rights set at invite time so accepted collaborators
  // land with the owner's intended isVoting from the moment of acceptance,
  // closing the gap where editors could vote/edit before the owner toggled
  // them off post-acceptance. Defaults to true (preserving v0.11.0 behavior);
  // viewers always coerce to false in the submit path.
  const [isVoting, setIsVoting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SendInvitationEmailResult | null>(null);
  // Lesson 42: invalid-format tokens (rejected client-side by EMAIL_RE,
  // never sent to the CF) surface as "Invalid" chips alongside the CF
  // result summary so users see why those addresses didn't go through.
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  // tokenId of the pending-invite row whose Resend/Revoke is in flight; null otherwise.
  // Used to disable the row's buttons (and all other rows' buttons) while a request runs.
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    setCollabs(ahpState.collaborators);
  }, [ahpState.collaborators]);

  const collabUserIds = useMemo(() => collabs.map((c) => c.userId), [collabs]);
  const profileMap = useProfiles(collabUserIds);

  const refreshPending = useCallback(async () => {
    if (!INVITATIONS_ENABLED) return;
    if (!ahpState.modelId) return;
    try {
      const list = await ahpState.storage.listPendingInvites(ahpState.modelId);
      setPendingInvites(list);
    } catch (e) {
      console.error('listPendingInvites failed:', (e as Error).message);
    }
  }, [ahpState.modelId, ahpState.storage]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  // Reset cross-user-leakable component state whenever the signed-in
  // user changes (sign-out → sign-in on a shared browser). React keeps
  // this Fiber mounted across the auth transition because the early
  // return below renders null without unmounting; without this effect,
  // lastResult and bulkEmails would persist and disclose the previous
  // user's invitation roster to the next signer-in.
  useEffect(() => {
    setLastResult(null);
    setInvalidEmails([]);
    setBulkEmails('');
    setEmail('');
    setError(null);
    setPendingInvites([]);
  }, [user?.uid]);

  if (mode !== 'cloud' || !user || !ahpState.modelId) return null;

  // Lesson 60 — four-state OwnerStatus derived from ahpState (the
  // reducer-side fetch lifecycle). Without the explicit 'error' state,
  // a failed model fetch leaves currentRole === undefined and the
  // section renders null silently — the user can't tell whether they
  // lack permission or whether the load broke.
  type OwnerStatus = 'loading' | 'owner' | 'not-owner' | 'error';
  const ownerStatus: OwnerStatus = ahpState.error
    ? 'error'
    : ahpState.loading
      ? 'loading'
      : ahpState.collaborators.find((c) => c.userId === user.uid)?.role === 'owner'
        ? 'owner'
        : 'not-owner';

  if (ownerStatus === 'loading') return null;
  if (ownerStatus === 'not-owner') return null;
  if (ownerStatus === 'error') {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sharing</h3>
        <div
          role="alert"
          className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-900 dark:text-red-200"
        >
          Couldn&rsquo;t load sharing details. Refresh the page to try again.
        </div>
      </div>
    );
  }

  // ─── Legacy add path (flag off) ────────────────────────────
  const handleAddLegacy = async () => {
    setError(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      const found = await lookupUidByEmail(email);
      if (!found) {
        setError(
          'User not found. They need to sign in to SPERT AHP at least once before they can be added.',
        );
        return;
      }
      if (ahpState.collaborators.some((c) => c.userId === found.uid)) {
        setError('Already a collaborator.');
        return;
      }
      await ahpState.storage.addCollaborator(ahpState.modelId!, {
        userId: found.uid,
        role,
        isVoting: role === 'editor' ? isVoting : false,
      });
      await ahpState.loadModel(ahpState.modelId!);
      setEmail('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ─── Invitation add path (flag on) ─────────────────────────
  const handleAddInvitations = async () => {
    setError(null);
    setLastResult(null);
    setInvalidEmails([]);
    const { valid, invalid } = parseBulkEmails(bulkEmails);
    // Lesson 42: nothing valid → no CF call. Surface invalid chips and
    // retain the textarea content so the user can correct in place.
    if (valid.length === 0) {
      if (invalid.length > 0) {
        setInvalidEmails(invalid);
        setError(
          invalid.length === 1
            ? "That doesn't look like a valid email address."
            : 'None of those look like valid email addresses.',
        );
      } else {
        setError('Enter at least one email address.');
      }
      return;
    }
    if (valid.length > 25) {
      setError('You can invite at most 25 people per submission.');
      return;
    }
    setBusy(true);
    try {
      const res = await callSendInvitationEmail({
        appId: 'spertahp',
        modelId: ahpState.modelId!,
        emails: valid,
        role,
        isVoting: role === 'editor' ? isVoting : false,
      });
      setLastResult(res);
      setInvalidEmails(invalid);
      // Lesson 43: clear textarea only when at least one address went
      // through the CF (added or invited). If everything failed
      // server-side, keep the input so the user can fix and retry
      // without re-typing.
      if (res.added.length + res.invited.length > 0) {
        setBulkEmails('');
      }
      // The auto-add path mutates the model document; refresh both
      // collaborators (via loadModel) and the pending-invite list.
      // Lesson 64 — Promise.allSettled so a loadModel failure doesn't
      // skip the pending-invite refresh, and vice versa.
      const [modelRes, pendingRes] = await Promise.allSettled([
        ahpState.loadModel(ahpState.modelId!),
        refreshPending(),
      ]);
      if (modelRes.status === 'rejected') {
        console.warn('[SharingSection] loadModel post-send failed:', modelRes.reason);
      }
      if (pendingRes.status === 'rejected') {
        console.warn('[SharingSection] refreshPending post-send failed:', pendingRes.reason);
      }
    } catch (e) {
      setError(mapInvitationError(e as FirebaseError));
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: CollaboratorRole) => {
    setBusy(true);
    setError(null);
    try {
      await ahpState.storage.updateCollaborator(ahpState.modelId!, userId, { role: newRole });
      await ahpState.loadModel(ahpState.modelId!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVoting = async (userId: string, isVoting: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await ahpState.storage.updateCollaborator(ahpState.modelId!, userId, { isVoting });
      await ahpState.loadModel(ahpState.modelId!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleResendInvite = async (tokenId: string) => {
    setActionBusy(tokenId);
    setError(null);
    try {
      await ahpState.storage.resendInvite(tokenId);
      await refreshPending();
    } catch (e) {
      setError(mapInvitationError(e as FirebaseError, 'resend'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleTogglePendingVoting = async (tokenId: string, nextValue: boolean) => {
    setActionBusy(tokenId);
    setError(null);
    try {
      await ahpState.storage.updateInvite(tokenId, nextValue);
      await refreshPending();
    } catch (e) {
      setError(mapInvitationError(e as FirebaseError, 'updateVoting'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleRevokeInvite = async (tokenId: string) => {
    if (!window.confirm("Revoke this invitation? The invitee won't be able to claim it.")) return;
    setActionBusy(tokenId);
    setError(null);
    try {
      await ahpState.storage.revokeInvite(tokenId);
      await refreshPending();
    } catch (e) {
      setError(mapInvitationError(e as FirebaseError, 'revoke'));
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm('Remove this collaborator?')) return;
    setBusy(true);
    setError(null);
    try {
      // Routed through the adapter (replaces a direct updateDoc bypass that
      // previously lived here). FirestoreAdapter.removeCollaborator handles
      // the embedded array + members map atomically.
      await ahpState.storage.removeCollaborator(ahpState.modelId!, userId);
      await ahpState.loadModel(ahpState.modelId!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renderResultSummary = () => {
    const lines: string[] = [];
    if (lastResult) {
      if (lastResult.added.length > 0) {
        lines.push(`Added ${lastResult.added.length}: ${lastResult.added.join(', ')}`);
      }
      if (lastResult.invited.length > 0) {
        lines.push(`Invited ${lastResult.invited.length}: ${lastResult.invited.join(', ')}`);
      }
      if (lastResult.failed.length > 0) {
        const grouped = lastResult.failed.map((f) => `${f.email} (${f.reason})`).join(', ');
        lines.push(`Skipped ${lastResult.failed.length}: ${grouped}`);
      }
    }
    if (invalidEmails.length > 0) {
      lines.push(`Invalid ${invalidEmails.length}: ${invalidEmails.join(', ')}`);
    }
    if (lines.length === 0) return null;
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sharing</h3>
      {INVITATIONS_ENABLED ? (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Invite collaborators by email. Existing SPERT users are added immediately;
            new emails receive a one-time invitation link (expires in 30 days).
          </p>
          <textarea
            name="bulkInviteEmails"
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
            disabled={busy}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            aria-label="Email addresses to invite"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <select
              name="bulkInviteRole"
              value={role}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              disabled={busy}
              className="px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
              aria-label="Role for invitees"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            {role === 'editor' && (
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  name="bulkInviteIsVoting"
                  checked={isVoting}
                  onChange={(e) => setIsVoting(e.target.checked)}
                  disabled={busy}
                  aria-label="Grant voting rights to invitees"
                />
                Can vote
              </label>
            )}
            <button
              onClick={handleAddInvitations}
              disabled={busy || !bulkEmails.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Add'}
            </button>
            <span className="text-xs text-gray-400">Max 25 per day.</span>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Add collaborators by email. They must sign in to SPERT AHP at least once first.
          </p>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="email"
              name="legacyInviteEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              disabled={busy}
              autoComplete="off"
              aria-label="Collaborator email"
              className="flex-1 min-w-[12rem] px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              name="legacyInviteRole"
              value={role}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              disabled={busy}
              aria-label="Role for invitee"
              className="px-2 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            {role === 'editor' && (
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  name="legacyInviteIsVoting"
                  checked={isVoting}
                  onChange={(e) => setIsVoting(e.target.checked)}
                  disabled={busy}
                  aria-label="Grant voting rights"
                />
                Can vote
              </label>
            )}
            <button
              onClick={handleAddLegacy}
              disabled={busy || !email.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {INVITATIONS_ENABLED && renderResultSummary()}

      <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
        {collabs.map((c) => {
          const isSelf = c.userId === user.uid;
          return (
            <li key={c.userId} className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                  {profileMap[c.userId]?.displayName || `${c.userId.slice(0, 8)}…`}
                  {isSelf && <span className="ml-1 text-gray-400">(you)</span>}
                </div>
                {profileMap[c.userId]?.email && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {profileMap[c.userId]!.email}
                  </div>
                )}
              </div>
              {c.role === 'owner' ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">Owner</span>
              ) : (
                <>
                  <select
                    name="collaboratorRole"
                    value={c.role}
                    onChange={(e) => handleRoleChange(c.userId, e.target.value as CollaboratorRole)}
                    disabled={busy}
                    aria-label={`Role for ${profileMap[c.userId]?.displayName || c.userId.slice(0, 8)}`}
                    className="text-xs px-1 py-0.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {c.role === 'editor' && (
                    <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        name="collaboratorIsVoting"
                        checked={c.isVoting}
                        onChange={(e) => handleToggleVoting(c.userId, e.target.checked)}
                        disabled={busy}
                        aria-label={`Voting rights for ${profileMap[c.userId]?.displayName || c.userId.slice(0, 8)}`}
                      />
                      Voting
                    </label>
                  )}
                  <button
                    onClick={() => handleRemove(c.userId)}
                    disabled={busy}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {INVITATIONS_ENABLED && (
        <PendingInvitesList
          pendingInvites={pendingInvites}
          actionBusy={actionBusy}
          onResend={handleResendInvite}
          onToggleVoting={handleTogglePendingVoting}
          onRevoke={handleRevokeInvite}
        />
      )}
    </div>
  );
}
