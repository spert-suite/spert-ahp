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
    // The frame's caution notice (`.sf-notice--caution`, contract §3). The button keeps its wording, "Dismiss", in the
    // frame's 28 px outlined dismiss style.
    <div role="status" className="sf-notice sf-notice--caution">
      <p>
        Part of &ldquo;{title || 'this decision'}&rdquo; could not be read and was left out so the decision could open.
      </p>
      <button
        type="button"
        onClick={() => dismissGuardedLoad(modelId)}
        className="sf-notice-dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}
