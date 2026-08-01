// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useEffect, useRef, useState } from 'react';
import { TOS_URL, PRIVACY_URL } from '../../lib/consent';

interface ConsentModalProps {
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * First-time / version-mismatch consent gate for cloud sign-in.
 * The user must explicitly accept the SPERT Suite ToS + Privacy Policy
 * before any Firebase Auth popup is opened. Acceptance is recorded
 * locally (fast path on subsequent sign-ins) and in Firestore at
 * `users/{uid}` with the current TOS_VERSION.
 *
 * Mirrors the pattern from SPERT-CFD's ConsentModal.
 */
export default function ConsentModal({ onAccept, onCancel }: ConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus on mount + Escape closes
  useEffect(() => {
    modalRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        aria-describedby="consent-modal-description"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
          <h2
            id="consent-modal-title"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Enable Cloud Storage
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <p
            id="consent-modal-description"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            Cloud Storage stores your decision data in Firebase / Firestore on
            Google Cloud. Use is governed by the{' '}
            <a
              href={TOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
            >
              Privacy Policy
            </a>{' '}
            for SPERT<span className="text-gray-300 dark:text-gray-500 text-[10px] align-super">®</span>{' '}
            Suite web apps.
          </p>

          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              name="consentAgreed"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-blue-600"
            />
            <span>
              I have read and agree to the Terms of Service and Privacy Policy.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-5 py-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!agreed}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enable Cloud Storage
          </button>
        </div>
      </div>
    </div>
  );
}
