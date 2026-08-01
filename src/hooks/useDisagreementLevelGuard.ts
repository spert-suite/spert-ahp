// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useMemo } from 'react';
import type { AHPState } from '../types/ahp';

export function useDisagreementLevelGuard(ahpState: AHPState): { level3Allowed: boolean; voterCount: number } {
  return useMemo(() => {
    const voterCount = ahpState.synthesis?.summary?.votersIncluded?.length ?? 0;
    return {
      level3Allowed: voterCount >= 4,
      voterCount,
    };
  }, [ahpState.synthesis?.summary?.votersIncluded]);
}
