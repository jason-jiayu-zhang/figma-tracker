import React, { useState, useMemo, useEffect, useRef } from "react";
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
  CheckCircle2,
} from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { format } from "date-fns";
import { FigmaFile, FigmaVersion } from "../types";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import FileVolumeBreakdown from "../components/FileVolumeBreakdown";

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
    addFile,
    refresh,
    selectedFileKeys,
    setSelectedFileKeys,
  } = useFigmaData();

  const selectedFileKey = selectedFileKeys.length === 1 ? selectedFileKeys[0] : null;
  const setSelectedFileKey = (key: string | null) => setSelectedFileKeys(key ? [key] : []);

  const [autoRotate, setAutoRotate] = useState(false);
  const rotateIndexRef = useRef(0);

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

  const totalEdits = activity
    ? Object.values(activity.dailyTotals).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[900px]">

      {/* ACTIVITY BREAKDOWN SECTION */}
      <div className="bg-white content-stretch flex flex-col gap-[16px] items-center justify-center p-[24px] relative rounded-[32px] shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-full h-[289px]">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
            <div className="relative shrink-0 size-[40px]">
              <div className="w-10 h-10 bg-[#1abcfe]/10 flex items-center justify-center rounded-xl text-[#1abcfe]">
                <Activity size={20} />
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 text-black whitespace-nowrap">
              <p className="font-semibold relative shrink-0 text-[24px] tracking-[-0.24px]">
                Activity Breakdown
              </p>
              <p className="font-normal relative shrink-0 text-[12px] tracking-[-0.12px] text-[#737373]">
                Number of version history changes by user by file.
              </p>
            </div>
          </div>
          <div className="bg-[#fffaf4] content-stretch flex items-center p-[4px] relative rounded-[8px] shrink-0">
            <button
              onClick={() => setFilterMine(true)}
              className={`content-stretch flex h-[36px] items-center justify-center px-[16px] py-[6px] relative rounded-[8px] shrink-0 transition-all ${filterMine ? "bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] text-black" : "text-[#A6A6A6] hover:text-[#181818]"}`}
            >
              <p className="font-normal leading-[20px] relative shrink-0 text-[16px] tracking-[-0.16px] whitespace-nowrap">
                My Edits
              </p>
            </button>
            <button
              onClick={() => setFilterMine(false)}
              className={`content-stretch flex h-[36px] items-center justify-center px-[16px] py-[6px] relative rounded-[8px] shrink-0 transition-all ${!filterMine ? "bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] text-black" : "text-[#A6A6A6] hover:text-[#181818]"}`}
            >
              <p className="font-normal leading-[20px] relative shrink-0 text-[16px] tracking-[-0.16px] whitespace-nowrap">
                All Edits
              </p>
            </button>
          </div>
        </div>

        <div className="bg-[#fffaf4] content-stretch flex flex-col gap-[12px] items-start justify-end p-[16px] relative rounded-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-[852px]">
          <Heatmap data={activity?.dailyTotals ?? {}} theme="light" customTheme={fimanuTheme} />
        </div>
      </div>

      {/* VOLUME BREAKDOWN SECTION */}
      <div className="bg-white content-stretch flex flex-col gap-[16px] items-start justify-center p-[24px] relative rounded-[32px] shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-full h-[455px]">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-2">
          <div className="content-stretch flex gap-[12px] h-full items-center relative shrink-0">
            <div className="relative shrink-0 size-[40px]">
              <div className="w-10 h-10 bg-[#a259ff]/10 flex items-center justify-center rounded-xl text-[#a259ff]">
                <Layers size={20} />
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 text-black whitespace-nowrap">
              <p className="font-semibold relative shrink-0 text-[24px] tracking-[-0.24px]">
                Volume Breakdown
              </p>
              <p className="font-normal relative shrink-0 text-[12px] tracking-[-0.12px] text-[#737373]">
                Percentage of total edit volume per file.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddInput(!showAddInput)}
            className="bg-[#fffaf4] content-stretch flex gap-[8px] h-[36px] items-center justify-center pl-[14px] pr-[16px] py-[6px] relative rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-[160px] text-black hover:bg-[#f5ebd9] transition-colors"
          >
            <Plus size={16} />
            <p className="font-normal leading-[20px] relative shrink-0 text-[16px] tracking-[-0.16px] whitespace-nowrap">
              Add File
            </p>
          </button>
        </div>

        {showAddInput && (
          <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 w-full mb-4">
            <input
              autoFocus
              type="text"
              value={newFileKey}
              onChange={(e) => setNewFileKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFile()}
              placeholder="Enter file key..."
              className="px-4 py-2 bg-[#fffaf4] border border-[#EBEBEB] rounded-lg outline-none focus:border-[#1ABCFE] transition-all flex-1 font-mono"
            />
            <button
              onClick={handleAddFile}
              disabled={isAdding || !newFileKey.trim()}
              className="bg-[#1ABCFE] text-white p-2 rounded-lg hover:bg-[#16a6e0] transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
            </button>
            <button
              onClick={() => setShowAddInput(false)}
              className="p-2 text-[#A6A6A6] hover:text-[#181818] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <FileVolumeBreakdown
          activity={activity}
          files={files}
          selectedFileKey={selectedFileKey}
          setSelectedFileKey={setSelectedFileKey}
        />
      </div>
    </div>
  );
}
