import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, FileText, Search, Archive, ArchiveRestore, FolderTree, RefreshCw, Layers, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router";
import { useFigmaData } from "../useFigmaData";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import AddFileModal from "../components/AddFileModal";
import { Button, IconChip, SegmentedControl, colorForKey } from "../components/ui";
import AppShell, { Field, SidebarControls, SidebarSkeleton, SidebarSwitcher } from "../components/AppShell";
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
// If Figma hasn't been reachable for a file this long, we can't vouch for its
// date, so show "Can't sync" instead of calling it stale.
const SYNC_LOST_DAYS = 7;
const DAY_MS = 86400000;

type FileHealth = "ok" | "stale" | "unsynced";
function fileHealth(file: FigmaFile): FileHealth {
  // Rows from before last_synced_at existed (null) are judged by date alone
  // until their first sync fills it in.
  if (file.last_synced_at) {
    const syncAge = (Date.now() - new Date(file.last_synced_at).getTime()) / DAY_MS;
    if (syncAge >= SYNC_LOST_DAYS) return "unsynced";
  }
  if (!file.last_modified) return "ok";
  const ageDays = (Date.now() - new Date(file.last_modified).getTime()) / DAY_MS;
  return ageDays >= STALE_DAYS ? "stale" : "ok";
}

/** One file row. Archived rows render muted; stale active rows get a badge. */
function FileRow({
  file,
  index = 0,
  onRemove,
  onArchive,
}: {
  file: FigmaFile;
  index?: number;
  onRemove: (fileKey: string) => void;
  onArchive: (fileKey: string, archived: boolean) => void;
}) {
  const archived = !!file.archived_at;
  const rowColor = colorForKey(file.file_key);
  const lastSync = file.last_modified
    ? formatDistanceToNow(new Date(file.last_modified), { addSuffix: true })
    : "Unknown";
  const health = archived ? "ok" : fileHealth(file);

  return (
    <tr
      role="row"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={`flex items-center justify-between gap-4 pl-6 pr-6 py-3 relative rounded-full shrink-0 w-full border border-line bg-surface shadow-card transition-[box-shadow,background-color] hover:bg-hairline/60 hover:shadow-card-hover animate-fade-in-up ${archived ? "opacity-60" : ""}`}
    >
      <td role="cell" className="flex flex-[1_0_0] items-center gap-3 min-h-px min-w-[200px] relative overflow-hidden">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: rowColor }}
        />
        <span className="flex flex-col min-w-0">
          <span className="flex items-center gap-2 max-w-[240px] w-full">
            <span className="font-extrabold relative shrink-0 text-[15px] text-ink tracking-[-0.15px] truncate">
              {file.name || "Untitled"}
            </span>
            {health === "stale" && (
              <span
                title="Reachable, but not edited in Figma for 60+ days"
                className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 rounded-full px-2 py-0.5"
              >
                Stale
              </span>
            )}
            {health === "unsynced" && (
              <span
                title="We haven't been able to reach this file in Figma for over a week (access lost or token expired), so its date may be out of date"
                className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted bg-hairline rounded-full px-2 py-0.5"
              >
                Can't sync
              </span>
            )}
          </span>
          <span className="font-medium relative shrink-0 text-[12px] text-muted tracking-[-0.12px] truncate">
            {file.file_key}
          </span>
        </span>
      </td>

      <td role="cell" className="flex-[1_0_0] font-semibold leading-[normal] min-h-px min-w-px relative text-[14px] text-body text-center tracking-[-0.14px] tabular-nums">
        {file.versionCount ?? 0}
      </td>
      <td role="cell" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-body text-center tracking-[-0.14px] tabular-nums">
        {lastSync}
      </td>

      <td role="cell" className="flex items-center gap-1">
        <button
          aria-label={`${archived ? "Unarchive" : "Archive"} ${file.name || file.file_key}`}
          title={archived ? "Unarchive — include in your widgets again" : "Archive — hide from widgets, keep syncing"}
          className="text-muted hover:text-ink transition-colors p-2 rounded-full cursor-pointer hover:bg-hairline"
          onClick={() => onArchive(file.file_key, !archived)}
        >
          {archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
        </button>
        <button
          aria-label={`Stop tracking ${file.name || file.file_key}`}
          className="text-muted hover:text-accent transition-colors p-2 rounded-full cursor-pointer hover:bg-hairline"
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

  const hasFiles = allFiles.length > 0;
  const lastSyncLabel = stats?.lastSync
    ? formatDistanceToNowStrict(new Date(stats.lastSync), { addSuffix: true })
    : "Never";

  const actions = (
    <>
      <Button size="pill" variant="ghost" onClick={() => triggerSync()} disabled={syncing} title="Sync now">
        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
        <span className="max-sm:sr-only">{syncing ? "Syncing…" : `Synced ${lastSyncLabel}`}</span>
      </Button>
      <Button size="pill" onClick={() => setShowAddModal(true)}>
        <Plus size={16} /> <span className="max-sm:sr-only">Add File</span>
      </Button>
    </>
  );

  const sidebar = (
    <SidebarControls
      label="File filters"
      sections={[
        {
          id: "find",
          label: "Find",
          icon: <Search size={15} />,
          content: (
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files…"
                aria-label="Search files"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-canvas border border-line text-[13px] font-bold text-ink placeholder:font-normal placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
          ),
        },
        {
          id: "organize",
          label: "Organize",
          icon: <SlidersHorizontal size={15} />,
          content: (
            <>
              <Field label="Sort by">
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
              </Field>
              <button
                type="button"
                role="switch"
                aria-checked={groupByProject}
                onClick={() => setGroupByProject((v) => !v)}
                className={`flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${groupByProject ? "bg-ink border-ink text-white" : "bg-canvas border-line text-body hover:text-ink"}`}
              >
                <FolderTree size={15} />
                <span className="whitespace-nowrap">Group by project</span>
              </button>
            </>
          ),
        },
      ]}
    />
  );

  return (
    <AppShell
      actions={actions}
      sidebarTop={
        <SidebarSwitcher
          label="File view"
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({
            ...v,
            count: v.id === "active" ? active.length : v.id === "archived" ? archived.length : allFiles.length,
          }))}
        />
      }
      sidebar={loading ? <SidebarSkeleton /> : hasFiles ? sidebar : <div className="hidden lg:block lg:col-start-1 lg:row-start-2 bg-surface lg:border-r lg:border-hairline" />}
    >
      {loading ? (
        <div role="status" className="flex flex-1 items-center justify-center">
          <div aria-hidden="true" className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Loading files</span>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col p-4 pb-8 lg:p-6 lg:overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[960px] mx-auto flex-1 flex flex-col">
            {hasFiles && (
            <table role="table" className="content-stretch flex flex-col gap-2 items-start relative shrink-0 w-full rounded-lg pb-2">
              {/* Table Header */}
              <thead role="rowgroup" className="w-full">
                <tr role="row" className="content-stretch flex items-center justify-between gap-4 pl-6 pr-6 py-1 relative shrink-0 w-full">
                  <th role="columnheader" scope="col" className="content-stretch flex flex-[1_0_0] items-center justify-start min-h-px min-w-[200px] pr-4 relative font-medium leading-[normal] text-[13px] text-muted tracking-[-0.13px]">
                    File ID
                  </th>
                  <th role="columnheader" scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[13px] text-muted text-center tracking-[-0.13px]">
                    Versions
                  </th>
                  <th role="columnheader" scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[13px] text-muted text-center tracking-[-0.13px]">
                    Last edit
                  </th>
                  {/* Invisible spacer matching the row actions column (two p-2/18px icon
                      buttons + gap-1) so Versions/Last edit line up with real cell centers. */}
                  <th role="columnheader" aria-hidden="true" className="flex items-center gap-1 invisible">
                    <span className="p-2"><Archive size={18} /></span>
                    <span className="p-2"><Trash2 size={18} /></span>
                  </th>
                </tr>
              </thead>

              {/* Active files (flat or grouped by project) */}
              <tbody role="rowgroup" className="flex flex-col gap-2 w-full">
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
                        {list.map((file, i) => (
                          <FileRow key={file.file_key} file={file} index={i} onRemove={handleRemoveFile} onArchive={archiveFile} />
                        ))}
                      </React.Fragment>
                    ))
                  : visible.map((file, i) => (
                      <FileRow key={file.file_key} file={file} index={i} onRemove={handleRemoveFile} onArchive={archiveFile} />
                    ))}

                {visible.length === 0 && (
                  <tr role="row" className="w-full">
                    <td role="cell" className="w-full py-10 text-center text-[14px] text-body">
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
        </div>
      )}

      {/* Add File Modal */}
      <AddFileModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); refresh(); }}
      />
    </AppShell>
  );
}
