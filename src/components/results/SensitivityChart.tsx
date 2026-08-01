// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import type { SweepPoint, CrossoverPoint, StructuredItem } from '../../types/ahp';

const LINE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface SensitivityChartProps {
  sweep: SweepPoint[];
  crossovers: CrossoverPoint[];
  alternatives: StructuredItem[];
  criterionName: string;
}

export default function SensitivityChart({ sweep, crossovers, alternatives, criterionName }: SensitivityChartProps) {
  if (!sweep || sweep.length === 0) return null;

  const data = sweep.map((point) => {
    const entry: Record<string, number> = { t: point.t };
    alternatives.forEach((alt, i) => {
      entry[alt.label] = point.scores[i]!;
    });
    return entry;
  });

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Sensitivity: {criterionName}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            label={{ value: `Weight of ${criterionName}`, position: 'insideBottom', offset: -5, fontSize: 12 }}
          />
          <YAxis tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip
            formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
            labelFormatter={(v) => `Weight: ${(Number(v) * 100).toFixed(0)}%`}
          />
          {alternatives.map((alt, i) => (
            <Line
              key={alt.id}
              type="monotone"
              dataKey={alt.label}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
          {crossovers?.map((c, i) => (
            <ReferenceDot
              key={i}
              x={c.t}
              y={c.score}
              r={5}
              fill="#EF4444"
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
