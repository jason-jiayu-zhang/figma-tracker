import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  FileText,
  Search,
  Archive,
  ArchiveRestore,
  FolderTree,
  ChevronDown,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import posthog from "posthog-js";
import { useFigmaData } from "../useFigmaData";
import { formatDistanceToNow } from "date-fns";
import AddFileModal from "../components/AddFileModal";
import {
  Card,
  SectionHeader,
  Button,
  IconChip,
  SegmentedControl,
  colorForKey,
} from "../components/ui";
import { FigmaFile } from "../types";

type SortKey = "recent" | "name" | "versions";

// A file untouched this long is flagged as an archive candidate.
const STALE_DAYS = 60;
function isStale(file: FigmaFile): boolean {
  if (!file.last_modified) return false;
  const ageDays =
    (Date.now() - new Date(file.last_modified).getTime()) / 86400000;
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
          title={
            archived
              ? "Unarchive — show on your dashboard again"
              : "Archive — hide from dashboard, keep syncing"
          }
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
  const { allFiles, removeFile, archiveFile, refresh, loading } =
    useFigmaData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [groupByProject, setGroupByProject] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const handleRemoveFile = async (fileKey: string) => {
    if (confirm("Are you sure you want to stop tracking this file?")) {
      await removeFile(fileKey);
      posthog.capture("file_removed");
    }
  };

  const handleArchiveFile = async (fileKey: string, archived: boolean) => {
    await archiveFile(fileKey, archived);
    posthog.capture("file_archived", {
      action: archived ? "archive" : "unarchive",
    });
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (f: FigmaFile) =>
    !q ||
    (f.name || "").toLowerCase().includes(q) ||
    f.file_key.toLowerCase().includes(q);

  const active = useMemo(
    () => allFiles.filter((f) => !f.archived_at),
    [allFiles],
  );
  const archived = useMemo(
    () => allFiles.filter((f) => f.archived_at),
    [allFiles],
  );

  const sortFiles = (list: FigmaFile[]) => {
    const arr = [...list];
    if (sortKey === "name") {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortKey === "versions") {
      arr.sort((a, b) => (b.versionCount || 0) - (a.versionCount || 0));
    } else {
      arr.sort(
        (a, b) =>
          new Date(b.last_modified || 0).getTime() -
          new Date(a.last_modified || 0).getTime(),
      );
    }
    return arr;
  };

  const visibleActive = useMemo(
    () => sortFiles(active.filter(matchesQuery)),
    [active, q, sortKey],
  );
  const visibleArchived = useMemo(
    () => archived.filter(matchesQuery),
    [archived, q],
  );

  // Group visible active files under their project name (sorted groups).
  const groups = useMemo(() => {
    const map: Record<string, FigmaFile[]> = {};
    for (const f of visibleActive) {
      const key = f.project_name || "No project";
      (map[key] ||= []).push(f);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleActive]);

  if (loading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className="w-8 h-8 border-2 border-blue border-t-transparent rounded-full animate-spin"
          />
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }

  const hasFiles = allFiles.length > 0;

  return (
    <div className="flex flex-col gap-6 items-start w-full mb-[50px]">
      <Card className="flex flex-col gap-5 items-start p-6 w-full h-fit">
        {/* Header */}
        <SectionHeader
          plain
          icon={<FileText size={20} />}
          title="Files Tracked"
          subtitle="Check version history for each file tracked."
          action={
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add File
            </Button>
          }
        />

        {/* Toolbar: search + sort + group toggle */}
        {hasFiles && (
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files by name or key…"
                aria-label="Search files"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-canvas border border-line text-[14px] text-ink placeholder:text-muted tracking-[-0.14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
            <SegmentedControl
              ariaLabel="Sort files"
              value={sortKey}
              onChange={setSortKey}
              options={[
                { label: "Last edit", value: "recent" },
                { label: "Name", value: "name" },
                { label: "Versions", value: "versions" },
              ]}
            />
            <button
              type="button"
              aria-pressed={groupByProject}
              onClick={() => setGroupByProject((v) => !v)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg font-bold text-[14px] tracking-[-0.14px] transition-colors ${groupByProject ? "bg-ink text-white" : "bg-canvas text-body hover:text-ink"}`}
            >
              <FolderTree size={16} /> Group by project
            </button>
          </div>
        )}

        {/* Table Content */}
        {hasFiles && (
          <table className="content-stretch flex flex-col gap-2 items-start relative shrink-0 w-full rounded-lg pb-2">
            {/* Table Header */}
            <thead className="w-full">
              <tr className="content-stretch flex items-center justify-between pl-3 pr-[33.5px] py-1 relative shrink-0 w-full">
                <th
                  scope="col"
                  className="content-stretch flex flex-[1_0_0] items-center justify-start min-h-px min-w-px pr-4 relative font-medium leading-[normal] text-[14px] text-black tracking-[-0.14px]"
                >
                  File ID
                </th>
                <th
                  scope="col"
                  className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]"
                >
                  File Type
                </th>
                <th
                  scope="col"
                  className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]"
                >
                  User Seat
                </th>
                <th
                  scope="col"
                  className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]"
                >
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
                        <th
                          scope="colgroup"
                          className="flex items-center gap-2 font-bold text-[13px] text-body uppercase tracking-wider"
                        >
                          {project}
                          <span className="text-muted font-medium tabular-nums normal-case tracking-[-0.12px]">
                            {list.length}
                          </span>
                        </th>
                      </tr>
                      {list.map((file) => (
                        <FileRow
                          key={file.file_key}
                          file={file}
                          onRemove={handleRemoveFile}
                          onArchive={handleArchiveFile}
                        />
                      ))}
                    </React.Fragment>
                  ))
                : visibleActive.map((file) => (
                    <FileRow
                      key={file.file_key}
                      file={file}
                      onRemove={handleRemoveFile}
                      onArchive={handleArchiveFile}
                    />
                  ))}

              {visibleActive.length === 0 && (
                <tr className="w-full">
                  <td className="w-full py-10 text-center text-[14px] text-body">
                    No files match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Archived section — collapsed by default, muted rows */}
        {visibleArchived.length > 0 && (
          <div className="w-full flex flex-col gap-2">
            <button
              type="button"
              aria-expanded={showArchived}
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-2 text-[13px] font-bold text-body uppercase tracking-wider hover:text-ink transition-colors self-start"
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${showArchived ? "" : "-rotate-90"}`}
              />
              Archived
              <span className="text-muted font-medium tabular-nums normal-case tracking-[-0.12px]">
                {visibleArchived.length}
              </span>
            </button>
            {showArchived && (
              <table className="content-stretch flex flex-col gap-2 items-start relative shrink-0 w-full">
                <tbody className="flex flex-col gap-2 w-full">
                  {visibleArchived.map((file) => (
                    <FileRow
                      key={file.file_key}
                      file={file}
                      onRemove={handleRemoveFile}
                      onArchive={handleArchiveFile}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!hasFiles && (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center gap-4">
            <IconChip plain>
              <FileText size={20} />
            </IconChip>
            <div className="flex flex-col gap-1.5 max-w-[320px]">
              <h3 className="font-bold text-[18px] tracking-[-0.18px] text-ink">
                No files tracked yet
              </h3>
              <p className="text-[14px] text-body leading-relaxed">
                Add a Figma file to start tracking its version history and
                activity.
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add your first file
            </Button>
          </div>
        )}
      </Card>

      {/* Add File Modal */}
      <AddFileModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          refresh();
        }}
      />
    </div>
  );
}
