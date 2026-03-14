import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  X,
  Clock,
  FileText,
  Activity,
  Layers,
  GitCommit,
  Zap,
  RotateCcw,
} from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { format } from "date-fns";
import { FigmaFile, FigmaVersion } from "../types";
import Heatmap from "../components/Heatmap";
import StatCard from "../components/StatCard";
import ToggleGroup from "../components/ToggleGroup";
import RecentCard from "../components/RecentCard";
import ActivityPanel from "../components/ActivityPanel";
import FilesTable from "../components/FilesTable";
import TimelinePanel from "../components/TimelinePanel";
import SyncHistory from "../components/SyncHistory";

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
  } = useFigmaData();

  const [selectedFile, setSelectedFile] = useState<FigmaFile | null>(null);
  const [versions, setVersions] = useState<FigmaVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const handleFileClick = async (file: FigmaFile) => {
    setSelectedFile(file);
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
  };

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

  const totalEdits = activity
    ? Object.values(activity.dailyTotals).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="bg-[#f5f5f5] min-h-screen flex flex-col items-center">
      <main className="w-full max-w-[1100px] px-6 py-8 flex flex-col gap-6 text-[#181818]">
        <RecentCard activity={activity} />
        {/* STATS BAR */}
        <section className="grid grid-cols-4 gap-4">
          <StatCard
            value={stats?.filesTracked ?? "—"}
            label="Files Tracked"
            icon={<Layers size={16} />}
            color="#A259FF"
          />
          <StatCard
            value={stats?.totalVersions ?? "—"}
            label="Total Versions"
            icon={<GitCommit size={16} />}
            color="#F24E1E"
          />
          <StatCard
            value={stats?.editsToday ?? "—"}
            label="Edits Today"
            icon={<Zap size={16} />}
            color="#0ACF83"
          />
          <StatCard
            value={
              stats?.lastSync
                ? format(new Date(stats.lastSync), "MMM d, h a")
                : "—"
            }
            label="Last Sync"
            icon={<RotateCcw size={16} />}
            color="#1ABCFE"
          />
        </section>

        <ActivityPanel
          activity={activity}
          totalEdits={totalEdits}
          filterMine={filterMine}
          setFilterMine={setFilterMine}
          syncing={syncing}
          triggerSync={triggerSync}
        />

        <FilesTable files={files} onFileClick={handleFileClick} />

        <TimelinePanel selectedFile={selectedFile} versions={versions} loadingVersions={loadingVersions} closeTimeline={closeTimeline} />

        <SyncHistory syncHistory={syncHistory} />
      </main>
    </div>
  );
}
