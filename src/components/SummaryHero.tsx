import { Flame, TrendingUp, TrendingDown, Minus, Zap, GitCommit } from "lucide-react";

/* Mobile-style hero: an accent-filled top section whose semicircle gauge
   draws the eye straight to the one number that summarizes the dashboard —
   the current streak, arced against your personal best. Everything here is
   derived from data already on the page (no backend call). */

interface SummaryHeroProps {
  streakCurrent: number;
  streakLongest: number;
  weekEdits: number;
  prevWeekEdits: number;
  editsToday: number;
  totalEdits: number;
}

/** Semicircle progress arc. `pct` is 0..1; fills a 180° dome left→right. */
function GaugeArc({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(1, pct));
  // pathLength=100 lets stroke-dasharray map straight to percent.
  const dome = "M 12 100 A 88 88 0 0 1 188 100";
  return (
    <svg viewBox="0 0 200 108" className="w-full block" aria-hidden="true">
      <path
        d={dome}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={14}
        strokeLinecap="round"
        pathLength={100}
      />
      <path
        d={dome}
        fill="none"
        stroke="#ffffff"
        strokeWidth={14}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${clamped * 100} 100`}
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}

/** Translucent stat pill sitting on the accent background. */
function Pill({
  icon,
  value,
  label,
  trend,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-0 bg-white/15 rounded-2xl px-3 py-2.5 flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-white/70">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.08em] font-semibold truncate">{label}</span>
      </div>
      <p className="text-[18px] font-bold leading-none tabular-nums text-white flex items-baseline gap-1.5">
        {value}
        {trend}
      </p>
    </div>
  );
}

export default function SummaryHero({
  streakCurrent,
  streakLongest,
  weekEdits,
  prevWeekEdits,
  editsToday,
  totalEdits,
}: SummaryHeroProps) {
  // Arc fills current streak against your best; a fresh record = full dome.
  const atBest = streakCurrent > 0 && streakCurrent >= streakLongest;
  const pct = streakLongest > 0 ? streakCurrent / streakLongest : streakCurrent > 0 ? 1 : 0;

  const caption = atBest
    ? "Personal best — keep it going"
    : streakCurrent === 0
    ? "Make an edit today to start a streak"
    : `${streakLongest - streakCurrent} to beat your best of ${streakLongest}`;

  const weekDelta = weekEdits - prevWeekEdits;
  const WeekIcon = weekDelta > 0 ? TrendingUp : weekDelta < 0 ? TrendingDown : Minus;
  const weekTrend = (
    <span className="text-[11px] font-semibold text-white/70 flex items-center gap-0.5">
      <WeekIcon size={12} />
      {weekDelta >= 0 ? "+" : ""}
      {weekDelta}
    </span>
  );

  return (
    <div className="w-full rounded-4xl bg-accent shadow-card overflow-hidden">
      <div className="flex flex-col items-center p-6 gap-4">
        <div className="flex items-center gap-1.5 text-white/80 text-[11px] uppercase tracking-[0.12em] font-semibold">
          <Flame size={13} />
          Current streak
        </div>

        {/* Gauge with the hero number seated in the mouth of the dome. */}
        <div className="relative w-[240px] max-w-full">
          <GaugeArc pct={pct} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
            <span className="text-[52px] font-bold leading-none tabular-nums text-white">
              {streakCurrent}
            </span>
            <span className="text-[12px] text-white/75 tracking-[-0.12px] mt-1">
              {streakCurrent === 1 ? "day" : "days"} in a row
            </span>
          </div>
        </div>

        <p className="text-[13px] text-white/85 tracking-[-0.13px] text-center -mt-1">{caption}</p>

        <div className="flex gap-2.5 w-full">
          <Pill
            icon={<TrendingUp size={12} />}
            label="This week"
            value={<span className="tabular-nums">{weekEdits.toLocaleString()}</span>}
            trend={weekTrend}
          />
          <Pill
            icon={<Zap size={12} />}
            label="Today"
            value={<span className="tabular-nums">{editsToday.toLocaleString()}</span>}
          />
          <Pill
            icon={<GitCommit size={12} />}
            label="Total edits"
            value={<span className="tabular-nums">{totalEdits.toLocaleString()}</span>}
          />
        </div>
      </div>
    </div>
  );
}
