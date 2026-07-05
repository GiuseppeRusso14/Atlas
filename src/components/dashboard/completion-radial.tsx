"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

/** Radiale con la % media di completamento dei progetti attivi. */
export function CompletionRadial({ percent }: { percent: number }) {
  const value = Math.round(percent);
  return (
    <div className="relative h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={[{ value }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            fill="var(--chart-1)"
            background={{ fill: "var(--muted)" }}
            cornerRadius={12}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold">{value}%</p>
        <p className="text-xs text-muted-foreground">avanzamento medio</p>
      </div>
    </div>
  );
}
