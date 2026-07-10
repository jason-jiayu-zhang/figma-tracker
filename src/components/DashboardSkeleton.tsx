import React from "react";

/* Structural mirror of the real Dashboard: a KPI row of four StatTiles
   (bg-surface + shadow-card, chip + value + label) above three stacked
   cards (Activity, Insights, Volume) with header + chart placeholders.
   Shapes/radii match the live components; all fills are bg-hairline. */

function CardShell({
  height,
  children,
}: {
  height: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="bg-surface rounded-4xl shadow-card p-6 flex flex-col gap-5 w-full"
      style={{ height }}
    >
      <div className="flex gap-3 items-center">
        <div className="size-10 rounded-xl bg-hairline shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-40 rounded bg-hairline" />
          <div className="h-3 w-56 rounded bg-hairline" />
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-6 animate-pulse w-full"
    >
      <span className="sr-only">Loading dashboard</span>

      {/* KPI tiles — mirror the four StatTiles (chip + value + label). */}
      <div className="flex gap-4 items-stretch w-full">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface flex items-center gap-3 p-4 rounded-3xl shadow-card flex-1 min-w-0"
          >
            <div className="size-10 rounded-xl bg-hairline shrink-0" />
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="h-5 w-2/3 rounded bg-hairline" />
              <div className="h-3 w-1/2 rounded bg-hairline" />
            </div>
          </div>
        ))}
      </div>

      {/* Activity Breakdown — header + heatmap panel. */}
      <CardShell height={280}>
        <div className="bg-hairline rounded-2xl w-full flex-1" />
      </CardShell>

      {/* Insights — header + metric grid. */}
      <CardShell height={320}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full flex-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-hairline rounded-2xl" />
          ))}
        </div>
      </CardShell>

      {/* Volume Breakdown — header + tiled breakdown (matches h-[455px]). */}
      <CardShell height={455}>
        <div className="bg-hairline rounded-2xl w-full flex-1" />
      </CardShell>
    </div>
  );
}
