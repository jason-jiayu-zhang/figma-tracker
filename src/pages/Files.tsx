import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, FileText, Search, Archive, ArchiveRestore, FolderTree, RefreshCw, Layers } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useFigmaData } from "../useFigmaData";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import AddFileModal from "../components/AddFileModal";
import { Button, IconChip, SegmentedControl, Divider, colorForKey } from "../components/ui";
import { FigmaFile } from "../types";

type SortKey = "recent" | "name" | "versions";
type ViewMode = "active" | "archived" | "all";

const VIEWS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "active", label: "Active", icon: <FileText size={15} /> },
  { id: "archived", label: "Archived", icon: <Archive size={15} /> },
  { id: "all", label: "All", icon: <Layers size={15} /> },
];

// A file untouched this long is flagged as an archive candidate.
const STALE_DAYS = 60;
function isStale(file: FigmaFile): boolean {
  if (!file.last_modified) return false;
  const ageDays = (Date.now() - new Date(file.last_modified).getTime()) / 86400000;
  return ageDays >= STALE_DAYS;
}

/** One file row. Archived rows render muted; stale active rows get a badge. */
function FileRow({
  file,
  onRemove,
  onArchive,
}: {
  file: FigmaFile;
  onRemove: (fileKey: string) => void;
  onArchive: (fileKey: string, archived: boolean) => void;
}) {
  const archived = !!file.archived_at;
  const rowColor = colorForKey(file.file_key);
  const lastSync = file.last_modified
    ? formatDistanceToNow(new Date(file.last_modified), { addSuffix: true })
    : "Unknown";
  const stale = !archived && isStale(file);

  return (
    <tr
      className={`content-stretch flex items-center justify-between pl-3 pr-4 py-3 relative rounded-lg shrink-0 w-full transition-transform hover:scale-[1.01] ${archived ? "opacity-60" : ""}`}
      style={{ backgroundColor: rowColor }}
    >
      <td className="content-stretch flex flex-[1_0_0] flex-col items-start leading-[normal] min-h-px min-w-[200px] relative whitespace-nowrap overflow-hidden">
        <span className="flex items-center gap-2 max-w-[240px] w-full">
          <span className="font-extrabold relative shrink-0 text-[18px] text-white tracking-[-0.18px] truncate">
            {file.name || "Untitled"}
          </span>
          {stale && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white bg-white/25 rounded-full px-2 py-0.5">
              Stale
            </span>
          )}
        </span>
        <span className="font-medium relative shrink-0 text-[12px] text-white tracking-[-0.12px]">
          {file.file_key}
        </span>
      </td>

      <td className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-white text-center tracking-[-0.16px]">
        Figma Design
      </td>
      <td className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-white text-center tracking-[-0.16px]">
        Edit
      </td>
      <td className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-white text-center tracking-[-0.16px] tabular-nums">
        {lastSync}
      </td>

      <td className="flex items-center gap-1">
        <button
          aria-label={`${archived ? "Unarchive" : "Archive"} ${file.name || file.file_key}`}
          title={archived ? "Unarchive — include in your widgets again" : "Archive — hide from widgets, keep syncing"}
          className="text-white/75 hover:text-white transition-colors p-2 rounded-full cursor-pointer hover:bg-white/10"
          onClick={() => onArchive(file.file_key, !archived)}
        >
          {archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
        </button>
        <button
          aria-label={`Stop tracking ${file.name || file.file_key}`}
          className="text-white/75 hover:text-white transition-colors p-2 rounded-full cursor-pointer hover:bg-white/10"
          onClick={() => onRemove(file.file_key)}
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

export default function Files() {
  const { allFiles, removeFile, archiveFile, refresh, loading, stats, syncing, triggerSync } = useFigmaData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [groupByProject, setGroupByProject] = useState(false);
  const [view, setView] = useState<ViewMode>("active");

  // The nav's "+" quick-add action deep-links here with ?add=1 — open the modal
  // and strip the param so a refresh/back doesn't re-trigger it.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setShowAddModal(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("add");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  const handleRemoveFile = async (fileKey: string) => {
    if (confirm("Are you sure you want to stop tracking this file?")) {
      await removeFile(fileKey);
    }
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (f: FigmaFile) =>
    !q || (f.name || "").toLowerCase().includes(q) || f.file_key.toLowerCase().includes(q);

  const active = useMemo(() => allFiles.filter((f) => !f.archived_at), [allFiles]);
  const archived = useMemo(() => allFiles.filter((f) => f.archived_at), [allFiles]);

  const sortFiles = (list: FigmaFile[]) => {
    const arr = [...list];
    if (sortKey === "name") {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortKey === "versions") {
      arr.sort((a, b) => (b.versionCount || 0) - (a.versionCount || 0));
    } else {
      arr.sort(
        (a, b) =>
          new Date(b.last_modified || 0).getTime() - new Date(a.last_modified || 0).getTime()
      );
    }
    return arr;
  };

  const visible = useMemo(() => {
    const source = view === "active" ? active : view === "archived" ? archived : allFiles;
    return sortFiles(source.filter(matchesQuery));
  }, [allFiles, active, archived, view, q, sortKey]);

  // Group visible files under their project name (sorted groups).
  const groups = useMemo(() => {
    const map: Record<string, FigmaFile[]> = {};
    for (const f of visible) {
      const key = f.project_name || "No project";
      (map[key] ||= []).push(f);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  if (loading) {
    return (
      <div role="status" className="flex flex-1 items-center justify-center w-full">
        <div className="flex flex-col items-center gap-3">
          <div aria-hidden="true" className="w-8 h-8 border-2 border-blue border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }

  const hasFiles = allFiles.length > 0;
  const lastSyncLabel = stats?.lastSync
    ? formatDistanceToNowStrict(new Date(stats.lastSync), { addSuffix: true })
    : "Never";

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Page chrome: view switcher + actions. Primary nav lives in TopNav. */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        {hasFiles ? (
          <div role="radiogroup" aria-label="File view" className="flex items-center gap-1 p-1 rounded-full bg-surface border border-hairline shadow-card">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={view === v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${view === v.id ? "bg-canvas text-ink ring-1 ring-accent/30" : "text-muted hover:text-ink"}`}
              >
                {v.icon}
                <span>{v.label}</span>
                <span className="text-muted font-medium tabular-nums">
                  {v.id === "active" ? active.length : v.id === "archived" ? archived.length : allFiles.length}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={() => triggerSync()} disabled={syncing} title="Sync now">
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : `Synced ${lastSyncLabel}`}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add File
          </Button>
        </div>
      </div>

      {/* Stage: the list itself, sitting on the canvas. */}
      <div className="flex-1 flex flex-col w-full pt-6 pb-32">
        {hasFiles && (
        <table className="content-stretch flex flex-col gap-2 items-start relative shrink-0 w-full rounded-lg pb-2">
          {/* Table Header */}
          <thead className="w-full">
            <tr className="content-stretch flex items-center justify-between pl-3 pr-[33.5px] py-1 relative shrink-0 w-full">
              <th scope="col" className="content-stretch flex flex-[1_0_0] items-center justify-start min-h-px min-w-px pr-4 relative font-medium leading-[normal] text-[14px] text-black tracking-[-0.14px]">
                File ID
              </th>
              <th scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
                File Type
              </th>
              <th scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
                User Seat
              </th>
              <th scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
                Last edit
              </th>
            </tr>
          </thead>

          {/* Active files (flat or grouped by project) */}
          <tbody className="flex flex-col gap-2 w-full">
            {groupByProject
              ? groups.map(([project, list]) => (
                  <React.Fragment key={project}>
                    <tr className="flex items-center w-full pt-2 pb-0.5 px-3">
                      <th scope="colgroup" className="flex items-center gap-2 font-bold text-[13px] text-body uppercase tracking-wider">
                        {project}
                        <span className="text-muted font-medium tabular-nums normal-case tracking-[-0.12px]">
                          {list.length}
                        </span>
                      </th>
                    </tr>
                    {list.map((file) => (
                      <FileRow key={file.file_key} file={file} onRemove={handleRemoveFile} onArchive={archiveFile} />
                    ))}
                  </React.Fragment>
                ))
              : visible.map((file) => (
                  <FileRow key={file.file_key} file={file} onRemove={handleRemoveFile} onArchive={archiveFile} />
                ))}

            {visible.length === 0 && (
              <tr className="w-full">
                <td className="w-full py-10 text-center text-[14px] text-body">
                  {q ? `No files match “${query}”.` : `No ${view === "archived" ? "archived" : "active"} files.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}

        {!hasFiles && (
          <div className="flex-1 w-full flex flex-col items-center justify-center text-center gap-4">
            <IconChip plain>
              <FileText size={20} />
            </IconChip>
            <div className="flex flex-col gap-1.5 max-w-[320px]">
              <h3 className="display text-[18px] text-ink">No files tracked yet</h3>
              <p className="text-[14px] text-body leading-relaxed">
                Add a Figma file to start tracking its version history and activity.
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add your first file
            </Button>
          </div>
        )}
      </div>

      {/* Floating dock: search, sort and grouping — the Studio control bar. */}
      {hasFiles && (
        <div className="sticky bottom-6 z-40 w-full flex justify-center">
          <div className="bg-surface rounded-3xl shadow-card border border-hairline flex flex-wrap items-center justify-center gap-x-4 gap-y-3 px-4 py-3 max-w-full">
            <div className="relative shrink-0">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files…"
                aria-label="Search files"
                className="w-48 h-9 pl-8 pr-3 rounded-lg bg-canvas border border-line text-[13px] font-bold text-ink placeholder:font-normal placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <Divider />

            <SegmentedControl
              ariaLabel="Sort files"
              size="sm"
              value={sortKey}
              onChange={setSortKey}
              options={[
                { label: "Last edit", value: "recent" },
                { label: "Name", value: "name" },
                { label: "Versions", value: "versions" },
              ]}
            />

            <Divider />

            <button
              type="button"
              role="switch"
              aria-checked={groupByProject}
              onClick={() => setGroupByProject((v) => !v)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] font-bold shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${groupByProject ? "bg-ink border-ink text-white" : "bg-canvas border-line text-body hover:text-ink"}`}
            >
              <FolderTree size={15} />
              <span className="whitespace-nowrap">Group by project</span>
            </button>
          </div>
        </div>
      )}

      {/* Add File Modal */}
      <AddFileModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); refresh(); }}
      />
    </div>
  );
}
