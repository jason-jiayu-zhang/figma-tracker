import { useState, useEffect, useCallback } from "react";
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

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, activityRes, filesRes, historyRes] = await Promise.all([
        axios.get(`/api/stats?mine=${filterMine}`),
        axios.get(`/api/activity?mine=${filterMine}`),
        axios.get(`/api/files?mine=${filterMine}`),
        axios.get("/api/sync-history"),
      ]);

      setStats(statsRes.data);
      setActivity(activityRes.data);
      setFiles(filesRes.data);
      setSyncHistory(historyRes.data);
    } catch (err) {
      console.error("Failed to fetch Figma data:", err);
    } finally {
      setLoading(false);
    }
  }, [filterMine]);

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
      await axios.post("/api/user/files", { fileKey });
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Failed to add file:", err);
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
    refresh: fetchData,
  };
}
