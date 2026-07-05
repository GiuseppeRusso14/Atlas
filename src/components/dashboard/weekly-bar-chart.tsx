"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WeeklyDatum = {
  week: string; // etichetta es. "12 mag"
  taskCompletati: number;
  progettiCompletati: number;
};

/** Andamento settimanale: colori presi dai design token (--chart-*). */
export function WeeklyBarChart({ data }: { data: WeeklyDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={28}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)" }}
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--popover-foreground)",
          }}
        />
        <Legend
          formatter={(value) =>
            value === "taskCompletati" ? "Task completati" : "Progetti completati"
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar
          dataKey="taskCompletati"
          fill="var(--chart-1)"
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="progettiCompletati"
          fill="var(--chart-2)"
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
