import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Stats,
  ActivityData,
  FigmaFile,
  SyncSession,
  Insights,
} from "./types";

// Poll interval for auto-refresh so the dashboard stays live (spec §6).
const POLL_MS = 45000;

// Browser IANA timezone, sent to /api/activity so the backend buckets version
// dates into the SAME calendar days the Heatmap renders (fixes the off-by-one).
function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  } catch {
    return "America/Los_Angeles";
  }
}

export function useFigmaData() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  // `files` = active (non-archived) files, used by the dashboard/embed.
  // `allFiles` also carries archived rows for the Files page's archived section.
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [allFiles, setAllFiles] = useState<FigmaFile[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // filterMine=true  => "My changes"  => mode=individual
  // filterMine=false => "All changes" => mode=all
  const [filterMine, setFilterMine] = useState(true);
  const [selectedFileKeys, setSelectedFileKeys] = useState<string[]>([]);
  const [days, setDays] = useState(365);
  const fetchIdRef = useRef(0);

  const mode = filterMine ? "individual" : "all";

  const fetchData = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    const tz = browserTz();
    const fileKeysParam =
      selectedFileKeys.length > 0
        ? `&fileKeys=${encodeURIComponent(selectedFileKeys.join(","))}`
        : "";

    const statsUrl = `/api/stats?scope=mine&mode=${mode}`;
    const activityUrl = `/api/activity?days=${days}&mode=${mode}&tz=${encodeURIComponent(tz)}${fileKeysParam}`;
    const filesUrl = `/api/files?mode=${mode}&includeArchived=1`;
    const insightsUrl = `/api/insights?mode=${mode}&tz=${encodeURIComponent(tz)}${fileKeysParam}`;

    try {
      const [statsRes, activityRes, filesRes] = await Promise.all([
        axios.get(statsUrl),
        axios.get(activityUrl),
        axios.get(filesUrl),
      ]);

      // Ignore results from a superseded fetch (stale-guard).
      if (fetchIdRef.current !== currentFetchId) return;

      setStats(statsRes.data);
      setActivity(activityRes.data);
      const all: FigmaFile[] = filesRes.data;
      setAllFiles(all);
      setFiles(all.filter((f) => !f.archived_at));
      setError(null);

      // Insights is non-critical (depends on the comments/dev-resource tables and
      // newer scopes): fetch it separately so its failure never blanks the dashboard.
      axios
        .get(insightsUrl)
        .then((res) => {
          if (fetchIdRef.current !== currentFetchId) return;
          // Guard against the SPA index.html fallback (200 text/html) that the
          // server returns for an unknown /api route — never feed HTML to state.
          const d = res.data;
          if (d && typeof d === "object" && d.streak) setInsights(d as Insights);
        })
        .catch((e) => console.error("Failed to fetch insights:", e));
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId) return;
      console.error("Failed to fetch Figma data:", err);
      setError("Couldn't load your dashboard data. Retrying automatically…");
    } finally {
      if (fetchIdRef.current === currentFetchId) setLoading(false);
    }
  }, [mode, selectedFileKeys, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh: poll on an interval while the tab is visible. Uses a ref so the
  // interval always calls the latest fetchData without being torn down on every
  // param change; the fetchIdRef stale-guard above still protects overlaps.
  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        fetchDataRef.current();
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await axios.post("/api/sync");
      await fetchData();
    } catch (err) {
      console.error("Sync failed:", err);
      setError("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const fetchVersions = async (fileKey: string) => {
    try {
      const res = await axios.get(`/api/versions/${fileKey}?mode=${mode}`);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch versions:", err);
      return null;
    }
  };

  const addFile = async (fileKey: string) => {
    try {
      await axios.post("/api/user/files", { fileKey });
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Failed to add file:", err);
      return { success: false, error: err };
    }
  };

  const removeFile = async (fileKey: string) => {
    try {
      await axios.delete(`/api/user/files/${fileKey}`);
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Failed to remove file:", err);
      return { success: false, error: err };
    }
  };

  const archiveFile = async (fileKey: string, archived: boolean) => {
    try {
      await axios.patch(`/api/user/files/${fileKey}`, { archived });
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Failed to archive file:", err);
      return { success: false, error: err };
    }
  };

  return {
    stats,
    insights,
    activity,
    files,
    allFiles,
    syncHistory,
    loading,
    syncing,
    error,
    filterMine,
    setFilterMine,
    mode,
    triggerSync,
    fetchVersions,
    addFile,
    removeFile,
    archiveFile,
    refresh: fetchData,
    days,
    setDays,
    selectedFileKeys,
    setSelectedFileKeys,
  };
}
