// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let functionsInstance: Functions | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0
    ? initializeApp(firebaseConfig as Record<string, string>)
    : getApps()[0]!;
  // memoryLocalCache: avoids stale security rule decisions cached in IndexedDB
  // (GanttApp lesson — persistent cache retains stale permission_denied state)
  dbInstance = initializeFirestore(app, { localCache: memoryLocalCache() });
  authInstance = getAuth(app);
  // Region must match the deployed Cloud Functions region (us-central1).
  functionsInstance = getFunctions(app, 'us-central1');
}

export const db = dbInstance;
export const auth = authInstance;
export const functions = functionsInstance;
export const isFirebaseAvailable = isFirebaseConfigured && app !== null;

// ─── Cloud Function callables (suite-wide, shared spert-suite project) ───
// Schemas defined in spert-landing-page/functions/src. Region us-central1.

export interface SendInvitationEmailInput {
  appId: 'spertahp';
  modelId: string;
  emails: string[];
  role: 'editor' | 'viewer';
  isVoting: boolean;
}

export interface SendInvitationEmailResult {
  added: string[];
  invited: string[];
  failed: Array<{
    email: string;
    reason: 'invalid-email' | 'already-member' | 'already-invited' | 'send-failed';
  }>;
}

export interface ClaimedInvitation {
  appId: string;
  modelId: string;
  modelName: string;
}

export interface ClaimPendingInvitationsResult {
  claimed: ClaimedInvitation[];
}

// ─── Revoke / Resend (Phase 3.5) ────────────────────────────

export interface RevokeInviteInput {
  tokenId: string;
}

export interface RevokeInviteResult {
  revoked: true;
}

export interface ResendInviteInput {
  tokenId: string;
}

export interface ResendInviteResult {
  resent: true;
  emailSendCount: number;
}

// ─── Update pending invitation (v0.12.0) ────────────────────

export interface UpdateInviteInput {
  tokenId: string;
  isVoting: boolean;
}

export interface UpdateInviteResult {
  updated: true;
}

// Callable wrappers live in src/lib/callables.ts (Lesson 61). Import
// callSendInvitationEmail / callClaimPendingInvitations / callRevokeInvite /
// callResendInvite / callUpdateInvite from there, not from this module.
