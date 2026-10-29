// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useSyncExternalStore } from 'react';
import { dismissGuardedLoad, isGuardedLoad, subscribeGuardedLoads } from '../../lib/cloudLoadNotices';

interface CloudLoadNoticeProps {
  modelId: string;
  title: string;
}

/**
 * Shown when part of a cloud model could not be read and was left out so the
 * model could open (see `guardModelDoc`). Names the model, never the value.
 */
export default function CloudLoadNotice({ modelId, title }: CloudLoadNoticeProps) {
  const shown = useSyncExternalStore(subscribeGuardedLoads, () => isGuardedLoad(modelId));
  if (!shown) return null;
  return (
    <div role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 flex items-center justify-between gap-3 dark:border-amber-700/50 dark:bg-amber-900/20">
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Part of &ldquo;{title || 'this decision'}&rdquo; could not be read and was left out so the decision could open.
      </p>
      <button
        type="button"
        onClick={() => dismissGuardedLoad(modelId)}
        className="text-sm font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline flex-shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}
