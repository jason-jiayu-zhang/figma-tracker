import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  X,
  Plus,
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
    addFile,
  } = useFigmaData();

  const [selectedFile, setSelectedFile] = useState<FigmaFile | null>(null);
  const [versions, setVersions] = useState<FigmaVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [newFileKey, setNewFileKey] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddFile = async () => {
    if (!newFileKey.trim()) return;
    setIsAdding(true);
    const res = await addFile(newFileKey.trim());
    setIsAdding(false);
    if (res.success) {
      setNewFileKey("");
      setShowAddInput(false);
    } else {
      alert("Failed to track file. Check the key.");
    }
  };

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

        {/* ACTIVITY HEATMAP */}
        <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center bg-[#F24E1E]/10 text-[#F24E1E] rounded-lg">
                <Activity size={14} />
              </div>
              <h2 className="text-[14px] font-bold text-[#181818]">Activity</h2>
              <span className="text-[11px] font-medium text-[#A6A6A6] bg-[#F5F5F5] border border-[#EBEBEB] px-2 py-0.5 rounded-full">
                {totalEdits} edits · last year
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ToggleGroup
                value={filterMine}
                onChange={setFilterMine}
                options={[
                  { label: "My Edits", value: true },
                  { label: "All Edits", value: false },
                ]}
              />
              <button
                className={`flex items-center gap-2 bg-[#181818] text-white px-4 py-1.5 rounded-lg text-[13px] font-bold hover:bg-[#333] transition-all active:scale-95 ${syncing ? "opacity-50 pointer-events-none" : ""}`}
                onClick={triggerSync}
                disabled={syncing}
              >
                <RefreshCw
                  size={14}
                  className={syncing ? "animate-spin" : ""}
                />
                {syncing ? "Syncing…" : "Sync Now"}
              </button>
            </div>
          </div>
          <div className="p-6 overflow-x-auto">
            <Heatmap data={activity?.dailyTotals ?? {}} theme="light" />
          </div>
        </section>

        {/* FILES TABLE */}
        <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center bg-[#A259FF]/10 text-[#A259FF] rounded-lg">
                <FileText size={14} />
              </div>
              <h2 className="text-[14px] font-bold text-[#181818]">
                Tracked Files
              </h2>
              {files.length > 0 && (
                <span className="text-[11px] font-medium text-[#A6A6A6] bg-[#F5F5F5] border border-[#EBEBEB] px-2 py-0.5 rounded-full">
                  {files.length}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {showAddInput ? (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                  <input
                    autoFocus
                    type="text"
                    value={newFileKey}
                    onChange={(e) => setNewFileKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddFile()}
                    placeholder="Enter file key..."
                    className="px-3 py-1.5 bg-[#f5f5f5] border border-[#EBEBEB] rounded-lg text-xs outline-none focus:border-[#1ABCFE] transition-all w-48 font-mono"
                  />
                  <button 
                    onClick={handleAddFile}
                    disabled={isAdding || !newFileKey.trim()}
                    className="bg-[#1ABCFE] text-white p-1.5 rounded-lg hover:bg-[#16a6e0] transition-all disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    onClick={() => setShowAddInput(false)}
                    className="p-1.5 text-[#A6A6A6] hover:text-[#181818] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddInput(true)}
                  className="flex items-center gap-2 text-[#1ABCFE] hover:bg-[#1ABCFE]/5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all"
                >
                  <Plus size={14} /> Add File
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#F5F5F5]">
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    Team / Project
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    Versions
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    Last Modified
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, i) => (
                  <tr
                    key={file.id}
                    className={`hover:bg-[#F9F9F9] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
                  >
                    <td className="px-6 py-4">
                      <button
                        className="text-[13px] font-bold text-[#1ABCFE] hover:underline"
                        onClick={() => handleFileClick(file)}
                      >
                        {file.name}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] font-medium text-[#A6A6A6] bg-[#F5F5F5] border border-[#EBEBEB] px-2 py-0.5 rounded-md">
                        {file.teamName ?? "No Team"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] tabular-nums text-[#181818]">
                      {file.versionCount}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-[#A6A6A6]">
                      {file.last_modified
                        ? format(new Date(file.last_modified), "MMM d, yyyy")
                        : "—"}
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-12 text-[#A6A6A6] italic text-[13px]"
                    >
                      No files tracked yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* TIMELINE */}
        {selectedFile && (
          <section
            className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm"
            id="timeline-panel"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center bg-[#1ABCFE]/10 text-[#1ABCFE] rounded-lg">
                  <Clock size={14} />
                </div>
                <h2 className="text-[14px] font-bold text-[#181818]">
                  Version History
                </h2>
                <span className="text-[11px] font-medium text-[#A6A6A6] bg-[#F5F5F5] border border-[#EBEBEB] px-2 py-0.5 rounded-full">
                  {selectedFile.name}
                </span>
              </div>
              <button
                className="text-[12px] font-bold text-[#A6A6A6] hover:text-[#181818] flex items-center gap-1.5 transition-colors"
                onClick={closeTimeline}
              >
                <X size={14} /> Close
              </button>
            </div>
            <div className="p-6">
              {loadingVersions ? (
                <div className="text-center py-12 text-[#A6A6A6] italic text-[13px]">
                  Loading versions…
                </div>
              ) : versions.length > 0 ? (
                <div className="flex flex-col">
                  {versions.map((v, i) => (
                    <div className="relative flex gap-5" key={v.version_id}>
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1ABCFE] mt-1.5 shadow-[0_0_8px_rgba(26,188,254,0.4)]" />
                        {i < versions.length - 1 && (
                          <div className="w-px flex-1 bg-[#EBEBEB] my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="text-[15px] font-bold text-[#181818] mb-1">
                          {v.label || "Untitled Version"}
                        </div>
                        {v.description && (
                          <div className="text-[#A6A6A6] text-sm leading-relaxed mb-2">
                            {v.description}
                          </div>
                        )}
                        <div className="flex gap-4 text-[11px] text-[#A6A6A6] font-bold">
                          <span className="flex items-center gap-1.5">
                            <Clock size={11} />{" "}
                            {v.created_at
                              ? format(new Date(v.created_at), "MMM d, h:mm a")
                              : "—"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileText size={11} /> {v.created_by_handle}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[#A6A6A6] italic text-[13px]">
                  No versions found for this filter.
                </div>
              )}
            </div>
          </section>
        )}

        {/* SYNC HISTORY */}
        <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#EBEBEB]">
            <div className="w-7 h-7 flex items-center justify-center bg-[#0ACF83]/10 text-[#0ACF83] rounded-lg">
              <Activity size={14} />
            </div>
            <h2 className="text-[14px] font-bold text-[#181818]">
              Sync History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#F5F5F5]">
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    Files Synced
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    New Versions
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map((sync, i) => (
                  <tr
                    key={sync.id}
                    className={`hover:bg-[#F9F9F9] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
                  >
                    <td className="px-6 py-4 text-[13px] text-[#181818]">
                      {sync.synced_at
                        ? format(new Date(sync.synced_at), "MMM d, h:mm a")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-[13px] tabular-nums text-[#181818]">
                      {sync.files_synced}
                    </td>
                    <td className="px-6 py-4 text-[13px] tabular-nums text-[#181818]">
                      {sync.new_versions_found}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sync.status === "success" ? "bg-[#0ACF83]/10 text-[#0ACF83]" : "bg-[#EF4444]/10 text-[#EF4444]"}`}
                      >
                        {sync.status === "success" ? "✓ SUCCESS" : "✗ FAILED"}
                      </span>
                    </td>
                  </tr>
                ))}
                {syncHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-12 text-[#A6A6A6] italic text-[13px]"
                    >
                      No sync history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({
  value,
  label,
  icon,
  color,
  small,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="group bg-white border border-[#EBEBEB] rounded-xl px-5 py-4 shadow-sm hover:border-[#D1D1D1] transition-all hover:-translate-y-1 flex flex-col gap-1">
      <div
        className="w-8 h-8 flex items-center justify-center rounded-lg mb-1 transition-transform group-hover:scale-110"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className={`font-bold text-[#181818] leading-tight text-[24px]`}>
        {value}
      </div>
      <div className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

/* ── Toggle Group ──────────────────────────────────────── */
function ToggleGroup<T>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div className="flex bg-[#F5F5F5] border border-[#EBEBEB] rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${value === opt.value ? "bg-white text-[#181818] shadow-sm" : "text-[#A6A6A6] hover:text-[#181818]"}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
