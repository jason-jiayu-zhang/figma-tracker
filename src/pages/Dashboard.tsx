import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, FileText, Activity, Layers, GitCommit, Zap, Flame } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { format, subDays, startOfToday, formatDistanceToNowStrict } from "date-fns";
import { FigmaFile, FigmaVersion } from "../types";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import FileVolumeBreakdown from "../components/FileVolumeBreakdown";
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

const fimanuTheme: HeatmapTheme = {
  rectSize: 12,
  rectRadius: 2,
  gap: 4,
  emptyColor: "#d9d9d9",
  levelColors: ["#1bca7c", "#1ab7fa", "#9851f9", "#f23b27"],
  textColor: "#A6A6A6",
  tooltipBgColor: "#2C2C2C",
  tooltipTextColor: "white",
};

export default function Dashboard() {
  const {
    stats,
    activity,
    files,
    syncHistory,
    loading,
    syncing,
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

  const [autoRotate, setAutoRotate] = useState(false);
  const rotateIndexRef = useRef(0);

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

  useEffect(() => {
    if (!autoRotate) return;
    if (!files || files.length === 0) return;
    rotateIndexRef.current = 0;
    const id = setInterval(() => {
      const idx = rotateIndexRef.current % files.length;
      setSelectedFileKey(files[idx].file_key);
      rotateIndexRef.current = (rotateIndexRef.current + 1) % files.length;
    }, 1000);
    return () => clearInterval(id);
  }, [autoRotate, files, setSelectedFileKey]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[#A6A6A6] uppercase tracking-[0.12em] font-semibold">
            Loading Dashboard
          </span>
        </div>
      </div>
    );
  }

  const contrib = computeContribStats(activity?.dailyTotals ?? {});

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

      {/* KPI ROW */}
      <div className="flex gap-4 items-stretch w-full shrink-0">
        <StatTile color="blue" icon={<FileText size={20} />} value={(stats?.filesTracked ?? files.length).toLocaleString()} label="Files tracked" />
        <StatTile color="purple" icon={<GitCommit size={20} />} value={(stats?.totalVersions ?? 0).toLocaleString()} label="Total versions" />
        <StatTile color="green" icon={<Zap size={20} />} value={(stats?.editsToday ?? 0).toLocaleString()} label="Edits today" />
        {/* Sync tile — clickable, wired to the existing manual-sync action */}
        <StatTile
          color="accent"
          icon={<RefreshCw size={20} className={syncing ? "animate-spin" : ""} />}
          value={<span className="text-[16px] leading-tight">{syncing ? "Syncing…" : lastSyncLabel}</span>}
          label={syncing ? "Please wait" : "Last synced · tap to sync"}
          onClick={() => triggerSync()}
          disabled={syncing}
          title="Sync now"
        />
      </div>

      {/* ACTIVITY BREAKDOWN SECTION */}
      <Card className="flex flex-col gap-4 items-center p-6 w-full">
        <SectionHeader
          color="blue"
          icon={<Activity size={20} />}
          title="Activity Breakdown"
          subtitle={
            <StatInline
              items={[
                { label: `${contrib.total.toLocaleString()} edits`, strong: true },
                { icon: <Flame size={13} className="text-accent" />, label: `${contrib.current}-day streak` },
                { label: `best ${contrib.best.count}` },
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

      {/* VOLUME BREAKDOWN SECTION */}
      <Card className="flex flex-col gap-4 items-start p-6 w-full h-[455px]">
        <SectionHeader
          color="purple"
          icon={<Layers size={20} />}
          title="Volume Breakdown"
          subtitle="Percentage of total edit volume per file."
          action={<SegmentedControl value={days} onChange={setDays} options={rangeOptions} />}
          className="mb-2"
        />
        <FileVolumeBreakdown
          activity={activity}
          files={files}
          selectedFileKey={selectedFileKey}
          setSelectedFileKey={setSelectedFileKey}
        />
      </Card>

    </div>
  );
}
