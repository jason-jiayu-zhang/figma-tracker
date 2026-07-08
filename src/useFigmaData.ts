import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Stats,
  ActivityData,
  FigmaFile,
  SyncSession,
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
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
    const filesUrl = `/api/files?mode=${mode}`;

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
      setFiles(filesRes.data);
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId) return;
      console.error("Failed to fetch Figma data:", err);
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
      const message =
        (axios.isAxiosError(err) && err.response?.data?.error) ||
        "Failed to track file. Make sure the URL or key is valid.";
      return { success: false, error: message };
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

  return {
    stats,
    activity,
    files,
    syncHistory,
    loading,
    syncing,
    filterMine,
    setFilterMine,
    mode,
    triggerSync,
    fetchVersions,
    addFile,
    removeFile,
    refresh: fetchData,
    days,
    setDays,
    selectedFileKeys,
    setSelectedFileKeys,
  };
}
