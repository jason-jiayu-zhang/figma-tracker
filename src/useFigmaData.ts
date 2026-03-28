import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Stats,
  ActivityData,
  FigmaFile,
  FigmaVersion,
  SyncSession,
} from "./types";

export function useFigmaData() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterMine, setFilterMine] = useState(true);
  const [selectedFileKeys, setSelectedFileKeys] = useState<string[]>([]);
  const [userIdOverride, setUserIdOverride] = useState<string | null>(null);
  const [days, setDays] = useState(365);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const currentFetchId = ++fetchIdRef.current;
      const statsUrl = `/api/stats?mine=${filterMine}`;
      const fileKeysParam = selectedFileKeys.length > 0 ? `&fileKeys=${selectedFileKeys.join(",")}` : "";
      const userParam = userIdOverride ? `&userId=${userIdOverride}` : "";
      const activityUrl = `/api/activity?mine=${filterMine}&days=${days}${fileKeysParam}${userParam}`;
      const filesUrl = `/api/files?mine=${filterMine}`;
      const historyUrl = `/api/sync-history`;

      console.debug("useFigmaData: activityUrl:", activityUrl);

      const [statsRes, activityRes, filesRes, historyRes] = await Promise.all([
        axios.get(statsUrl),
        axios.get(activityUrl),
        axios.get(filesUrl),
        axios.get(historyUrl),
      ]);

      console.debug("useFigmaData: activityRes.data keys count:", activityRes.data?.dailyTotals ? Object.keys(activityRes.data.dailyTotals).length : 0);

      // ignore if a newer fetch started
      if (fetchIdRef.current !== currentFetchId) {
        console.debug("stale fetch ignored", currentFetchId);
        return;
      }
      setStats(statsRes.data);
      setActivity(activityRes.data);
      console.debug("activity data:", activityRes.data);
      setFiles(filesRes.data);
      setSyncHistory(historyRes.data);
    } catch (err) {
      console.error("Failed to fetch Figma data:", err);
    } finally {
      setLoading(false);
    }
  }, [filterMine, selectedFileKeys, userIdOverride, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  

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
      const res = await axios.get(
        `/api/versions/${fileKey}?mine=${filterMine}`,
      );
      return res.data;
    } catch (err) {
      console.error("Failed to fetch versions:", err);
      return null;
    }
  };

  const addFile = async (fileKey: string) => {
    try {
      // Ensure user is connected; if not, start OAuth and pass the file key
      const meRes = await axios.get("/api/user/me");
      if (!meRes.data?.connected) {
        const startRes = await axios.post("/api/oauth/start", { fileKeys: fileKey });
        if (startRes.data?.url) {
          window.location.href = startRes.data.url;
          return { success: false, redirecting: true };
        }
        return { success: false, error: "Failed to start OAuth" };
      }

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

  return {
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
    removeFile,
    refresh: fetchData,
    days,
    setDays,
    selectedFileKeys,
    setSelectedFileKeys,
    userIdOverride,
    setUserIdOverride,
  };
}
