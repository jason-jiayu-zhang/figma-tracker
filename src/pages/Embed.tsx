import React, { useMemo } from "react";
import { useFigmaData } from "../useFigmaData";
import { format } from "date-fns";
import Heatmap from "../components/Heatmap";

/* ── Types ─────────────────────────────────────────────────── */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  count: number;
  dateLabel: string;
}

/* ── Sub-components ────────────────────────────────────────── */

const FigmaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="7" height="7" rx="0" fill="#A259FF" />
    <rect x="13" y="4" width="7" height="7" rx="0" fill="#F24E1E" />
    <rect x="4" y="13" width="7" height="7" rx="0" fill="#0ACF83" />
    <circle cx="16.5" cy="16.5" r="3.5" fill="#1ABCFE" />
  </svg>
);

const EmbedHeader = ({ totalEdits }: { totalEdits: number }) => (
  <div className="flex justify-between items-center flex-shrink-0">
    <div className="flex items-center gap-2 text-[13px] font-bold text-[#181818]">
      <FigmaIcon />
      Figma Contributions
    </div>
    <span className="text-[11px] text-[#A6A6A6]">
      {totalEdits} edits in the last year
    </span>
  </div>
);

function EmbedContent({ data }: { data: Record<string, number> }) {
  return (
    <div className="flex flex-col gap-4">
      <Heatmap data={data} theme="light" />
    </div>
  );
}

export default function Embed() {
  const { activity, loading } = useFigmaData();

  const totalEdits = useMemo(() => {
    return activity
      ? Object.values(activity.dailyTotals).reduce((a, b) => a + b, 0)
      : 0;
  }, [activity]);

  if (loading && !activity) return null;

  return (
    <div className="bg-[#f5f5f5] text-[#181818] font-sans p-4 rounded-none flex flex-col gap-4 box-border min-h-screen">
      <EmbedHeader totalEdits={totalEdits} />
      <EmbedContent data={activity?.dailyTotals ?? {}} />
    </div>
  );
}
