// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import {
  Radar,
  RadarChart as RadarChartBase,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { StructuredItem } from '../../types/ahp';
import type { ProfileInfo } from '../../hooks/useProfiles';

const VOTER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface VoterRadarChartProps {
  criteria: StructuredItem[];
  individualPriorities: Record<string, number[]>;
  profileMap: Record<string, ProfileInfo>;
}

export default function VoterRadarChart({ criteria, individualPriorities, profileMap }: VoterRadarChartProps) {
  if (!criteria || !individualPriorities) return null;

  const voterIds = Object.keys(individualPriorities);
  if (voterIds.length === 0) return null;

  const displayNameFor = (userId: string): string => {
    const name = profileMap[userId]?.displayName?.trim();
    if (name) return name;
    return userId.slice(0, 8) + '…';
  };

  const data = criteria.map((crit, i) => {
    const point: Record<string, string | number> = { criterion: crit.label };
    voterIds.forEach((userId) => {
      point[userId] = individualPriorities[userId]?.[i] ?? 0;
    });
    return point;
  });

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Voter Priority Comparison</h3>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChartBase data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          {voterIds.map((userId, i) => (
            <Radar
              key={userId}
              name={displayNameFor(userId)}
              dataKey={userId}
              stroke={VOTER_COLORS[i % VOTER_COLORS.length]}
              fill={VOTER_COLORS[i % VOTER_COLORS.length]}
              fillOpacity={0.1}
            />
          ))}
          <Legend />
        </RadarChartBase>
      </ResponsiveContainer>
    </div>
  );
}
