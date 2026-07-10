import { BarChart3, Flame, Tag, FileText, MessageSquare, Link2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, SectionHeader } from "./ui";
import { Insights } from "../types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Compact labelled metric with an optional sublabel. */
function Metric({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-canvas flex flex-col gap-1 p-4 rounded-2xl min-w-0">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.08em] font-semibold truncate">{label}</span>
      </div>
      <p className="font-semibold text-[22px] tracking-[-0.22px] text-ink leading-none tabular-nums">{value}</p>
      {sub != null && <p className="text-[12px] text-body tracking-[-0.12px] leading-none tabular-nums">{sub}</p>}
    </div>
  );
}

/** Mini vertical bar chart, normalized to the series max. */
function MiniBars({
  data,
  labels,
  highlight,
  color = "#0acf83",
}: {
  data: number[];
  labels?: string[];
  highlight?: number | null;
  color?: string;
}) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-[3px] h-16 w-full">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${labels ? labels[i] : i}: ${v}`}>
          <div className="flex-1 flex items-end w-full">
            <div
              className="w-full rounded-[2px] transition-[height] duration-200 ease-out"
              style={{
                height: `${Math.max(3, (v / max) * 100)}%`,
                backgroundColor: i === highlight ? color : "rgba(10,207,131,0.38)",
              }}
            />
          </div>
          {labels && <span className="text-[9px] text-muted leading-none tabular-nums">{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

function VelocityTrend({ current, prev }: { current: number; prev: number }) {
  const delta = current - prev;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls = delta > 0 ? "text-[#047857]" : delta < 0 ? "text-accent" : "text-muted";
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : null;
  return (
    <span className={`flex items-center gap-1 tabular-nums ${cls}`}>
      <Icon size={13} />
      {delta >= 0 ? "+" : ""}
      {delta} vs prev {pct !== null ? `(${pct >= 0 ? "+" : ""}${pct}%)` : ""}
    </span>
  );
}

function hourLabel(h: number | null): string {
  if (h === null) return "—";
  const ampm = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}

export default function InsightsPanel({ insights }: { insights: Insights | null }) {
  if (!insights || !Array.isArray(insights.byHour) || !Array.isArray(insights.byWeekday)) return null;
  const { streak, named, documented, velocity, comments, devResources, byHour, byWeekday, busiestHour, busiestWeekday } =
    insights;

  const hourLabels = Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? String(i) : ""));

  return (
    <Card className="flex flex-col gap-5 items-start p-6 w-full">
      <SectionHeader
        plain
        icon={<BarChart3 size={20} />}
        title="Insights"
        subtitle="Derived from your synced version and comment history."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
        <Metric
          icon={<Flame size={13} />}
          value={`${streak.current}d`}
          label="Current streak"
          sub={`Longest ${streak.longest}d`}
        />
        <Metric
          icon={<TrendingUp size={13} />}
          value={velocity.last7}
          label="Edits · 7d"
          sub={<VelocityTrend current={velocity.last7} prev={velocity.prev7} />}
        />
        <Metric
          icon={<Tag size={13} />}
          value={`${named.pct}%`}
          label="Named versions"
          sub={`${named.named.toLocaleString()} of ${named.total.toLocaleString()}`}
        />
        <Metric
          icon={<FileText size={13} />}
          value={`${documented.pct}%`}
          label="Documented"
          sub={`${documented.documented.toLocaleString()} with notes`}
        />
        <Metric
          icon={<MessageSquare size={13} />}
          value={comments.unresolved}
          label="Open comments"
          sub={`${comments.resolvedPct}% resolved · ${comments.total} total`}
        />
        <Metric
          icon={<Link2 size={13} />}
          value={devResources.total}
          label="Dev links"
          sub={`${comments.last30} comments · 30d`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="bg-canvas flex flex-col gap-2 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">By hour</span>
            <span className="text-[12px] text-body">Peak {hourLabel(busiestHour)}</span>
          </div>
          <MiniBars data={byHour} labels={hourLabels} highlight={busiestHour} />
        </div>
        <div className="bg-canvas flex flex-col gap-2 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">By weekday</span>
            <span className="text-[12px] text-body">
              Peak {busiestWeekday !== null ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][busiestWeekday] : "—"}
            </span>
          </div>
          <MiniBars data={byWeekday} labels={WEEKDAYS} highlight={busiestWeekday} />
        </div>
      </div>
    </Card>
  );
}
