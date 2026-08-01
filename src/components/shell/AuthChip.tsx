// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useAuth, getFirstName } from '../../contexts/AuthContext';
import { useStorage } from '../../contexts/StorageContext';

interface AuthChipProps {
  /** Opens the Cloud Storage modal. All three chip states (signed-out,
   *  signed-in + local, signed-in + cloud) call this on click. */
  onOpenSettings: () => void;
}

const BRAND = '#0070f3';

export default function AuthChip({ onOpenSettings }: AuthChipProps) {
  const { user, firebaseAvailable, loading } = useAuth();
  const { mode } = useStorage();

  // Hide entirely when Firebase isn't configured — no sign-in option exists
  if (!firebaseAvailable) return null;
  if (loading) return null;

  // Signed in + cloud: avatar + name | cloud icon → opens Cloud Storage modal
  if (user && mode === 'cloud') {
    const firstName = getFirstName(user);
    const initial = (firstName[0] ?? '?').toUpperCase();
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Open cloud storage settings"
        className="flex items-center rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
      >
        <span className="flex items-center gap-1.5 pl-1 pr-2 py-0.5">
          <span
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[11px] font-medium"
            style={{ backgroundColor: BRAND }}
          >
            {initial}
          </span>
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{firstName}</span>
        </span>
        <span className="border-l border-gray-300 dark:border-gray-600 px-2 py-1" style={{ color: BRAND }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9H17.5a4.5 4.5 0 0 1 0 9z" />
          </svg>
        </span>
      </button>
    );
  }

  // Signed in + local: avatar + name | lock icon → opens Cloud Storage modal
  if (user && mode === 'local') {
    const firstName = getFirstName(user);
    const initial = (firstName[0] ?? '?').toUpperCase();
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Open cloud storage settings"
        className="flex items-center rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
      >
        <span className="flex items-center gap-1.5 pl-1 pr-2 py-0.5">
          <span
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[11px] font-medium"
            style={{ backgroundColor: BRAND }}
          >
            {initial}
          </span>
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{firstName}</span>
        </span>
        <span className="border-l border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-500 dark:text-gray-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </button>
    );
  }

  // Signed out: lock icon + "Local only" | "Sign in"
  return (
    <button
      type="button"
      onClick={onOpenSettings}
      aria-label="Sign in"
      className="flex items-center rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
    >
      <span className="flex items-center gap-1.5 px-2 py-0.5 text-[13px] text-gray-500 dark:text-gray-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Local only
      </span>
      <span className="border-l border-gray-300 dark:border-gray-600 px-2 py-1 text-[12px] font-medium" style={{ color: BRAND }}>
        Sign in
      </span>
    </button>
  );
}
