import React, { useState } from "react";
import { RefreshCw, FileText, Activity, Layers, GitCommit, Zap, Flame } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { format, subDays, startOfToday, formatDistanceToNowStrict } from "date-fns";
import { FigmaFile, FigmaVersion } from "../types";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import FileVolumeBreakdown from "../components/FileVolumeBreakdown";
import InsightsPanel from "../components/InsightsPanel";
import SummaryHero from "../components/SummaryHero";
import DashboardSkeleton from "../components/DashboardSkeleton";
import { Card, SectionHeader, StatInline, StatTile, SegmentedControl } from "../components/ui";

/* Contribution stats derived entirely from the heatmap's dailyTotals — no
   backend call needed. Streaks walk the 365-day window ending today. */
function computeContribStats(dailyTotals: Record<string, number>) {
  const total = Object.values(dailyTotals).reduce((a, b) => a + b, 0);

  let best = { count: 0, date: "" };
  for (const [date, count] of Object.entries(dailyTotals)) {
    if (count > best.count) best = { count, date };
  }

  const active = new Set(
    Object.entries(dailyTotals)
      .filter(([, c]) => c > 0)
      .map(([d]) => d)
  );

  const today = startOfToday();
  const todayKey = format(today, "yyyy-MM-dd");

  // Current streak: count back from today. If today is empty, still allow the
  // streak to run through yesterday (GitHub-style) so it doesn't reset midday.
  let current = 0;
  const startOffset = active.has(todayKey) ? 0 : 1;
  for (let i = startOffset; i < 366; i++) {
    if (active.has(format(subDays(today, i), "yyyy-MM-dd"))) current++;
    else break;
  }

  // Longest streak inside the visible 365-day window.
  let longest = 0;
  let run = 0;
  for (let i = 364; i >= 0; i--) {
    if (active.has(format(subDays(today, i), "yyyy-MM-dd"))) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  return { total, best, current, longest };
}

/* Edits in the last 7 days vs the 7 before that, straight from dailyTotals
   so the hero's weekly momentum needs no separate insights call. */
function computeWeekly(dailyTotals: Record<string, number>) {
  const today = startOfToday();
  let last7 = 0;
  let prev7 = 0;
  for (let i = 0; i < 14; i++) {
    const v = dailyTotals[format(subDays(today, i), "yyyy-MM-dd")] ?? 0;
    if (i < 7) last7 += v;
    else prev7 += v;
  }
  return { last7, prev7 };
}

const fimanuTheme: HeatmapTheme = {
  rectSize: 12,
  rectRadius: 2,
  gap: 4,
  emptyColor: "#d9d9d9",
  levelColors: ["#1bca7c", "#1ab7fa", "#9851f9", "#f23b27"],
  textColor: "#737373",
  tooltipBgColor: "#2C2C2C",
  tooltipTextColor: "white",
};

export default function Dashboard() {
  const {
    stats,
    insights,
    activity,
    files,
    syncHistory,
    loading,
    syncing,
    error,
    filterMine,
    setFilterMine,
    triggerSync,
    fetchVersions,
    refresh,
    selectedFileKeys,
    setSelectedFileKeys,
    days,
    setDays,
  } = useFigmaData();

  const selectedFileKey = selectedFileKeys.length === 1 ? selectedFileKeys[0] : null;
  const setSelectedFileKey = (key: string | null) => setSelectedFileKeys(key ? [key] : []);

  const [selectedFile, setSelectedFile] = useState<FigmaFile | null>(null);
  const [versions, setVersions] = useState<FigmaVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const handleFileClick = async (file: FigmaFile) => {
    setSelectedFile(file);
    // also set the global selected file key so activity chart filters
    setSelectedFileKeys([file.file_key]);
    setLoadingVersions(true);
    const data = await fetchVersions(file.file_key);
    if (data) setVersions(data.versions);
    setLoadingVersions(false);
    setTimeout(() => {
      document
        .getElementById("timeline-panel")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const closeTimeline = () => {
    setSelectedFile(null);
    setVersions([]);
    setSelectedFileKey(null);
  };

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  const contrib = computeContribStats(activity?.dailyTotals ?? {});
  const weekly = computeWeekly(activity?.dailyTotals ?? {});

  const lastSyncLabel = stats?.lastSync
    ? formatDistanceToNowStrict(new Date(stats.lastSync), { addSuffix: true })
    : "Never";

  const rangeOptions = [
    { label: "1W", value: 7 },
    { label: "1M", value: 30 },
    { label: "90D", value: 90 },
    { label: "1Y", value: 365 },
    { label: "YTD", value: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000) + 1 },
    { label: "All", value: 3650 },
  ];

  return (
    <div className="flex flex-col gap-6 items-start w-full">

      {/* SUMMARY HERO — accent gauge draws the eye to the overall streak */}
      <SummaryHero
        streakCurrent={contrib.current}
        streakLongest={contrib.longest}
        weekEdits={weekly.last7}
        prevWeekEdits={weekly.prev7}
        editsToday={stats?.editsToday ?? 0}
        totalEdits={contrib.total}
      />

      {/* KPI ROW */}
      <div className="flex gap-4 items-stretch w-full shrink-0">
        <StatTile plain icon={<FileText size={20} />} value={<span className="tabular-nums">{(stats?.filesTracked ?? files.length).toLocaleString()}</span>} label="Files tracked" />
        <StatTile plain icon={<GitCommit size={20} />} value={<span className="tabular-nums">{(stats?.totalVersions ?? 0).toLocaleString()}</span>} label="Total versions" />
        <StatTile plain icon={<Zap size={20} />} value={<span className="tabular-nums">{(stats?.editsToday ?? 0).toLocaleString()}</span>} label="Edits today" />
        {/* Sync tile — clickable, wired to the existing manual-sync action */}
        <StatTile
          plain
          icon={<RefreshCw size={20} className={syncing ? "animate-spin" : ""} />}
          value={<span className="text-[16px] leading-tight">{syncing ? "Syncing…" : lastSyncLabel}</span>}
          label={syncing ? "Please wait" : "Last synced · tap to sync"}
          onClick={() => triggerSync()}
          disabled={syncing}
          title="Sync now"
        />
      </div>

      <div aria-live="assertive" className="w-full empty:hidden">
        {error && (
          <p className="text-[13px] font-medium text-accent tracking-[-0.12px]">
            {error}
          </p>
        )}
      </div>

      {/* ACTIVITY BREAKDOWN SECTION */}
      <Card className="flex flex-col gap-5 items-center p-6 w-full">
        <SectionHeader
          plain
          icon={<Activity size={20} />}
          title="Activity Breakdown"
          subtitle={
            <StatInline
              items={[
                { label: <><span className="tabular-nums">{contrib.total.toLocaleString()}</span> edits</>, strong: true },
                { icon: <Flame size={13} className="text-accent" />, label: <><span className="tabular-nums">{contrib.current}</span>-day streak</> },
                { label: <>best <span className="tabular-nums">{contrib.best.count.toLocaleString()}</span></> },
              ]}
            />
          }
          action={
            <SegmentedControl
              value={filterMine}
              onChange={setFilterMine}
              options={[
                { label: "My changes", value: true },
                { label: "All changes", value: false },
              ]}
            />
          }
        />
        <div className="bg-canvas flex flex-col gap-3 items-start justify-end p-4 rounded-2xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full">
          <Heatmap data={activity?.dailyTotals ?? {}} theme="light" customTheme={fimanuTheme} profileUrl="/profile" />
        </div>
      </Card>

      {/* INSIGHTS SECTION */}
      <InsightsPanel insights={insights} />

      {/* VOLUME BREAKDOWN SECTION */}
      <Card className="flex flex-col gap-5 items-start p-6 w-full h-[455px]">
        <SectionHeader
          plain
          icon={<Layers size={20} />}
          title="Volume Breakdown"
          subtitle="Percentage of total edit volume per file."
          action={<SegmentedControl value={days} onChange={setDays} options={rangeOptions} />}
        />
        <FileVolumeBreakdown activity={activity} files={files} />
      </Card>

    </div>
  );
}
