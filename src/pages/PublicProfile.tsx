import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Heatmap from "../components/Heatmap";
import TopFilesCard from "../components/TopFilesCard";
import { ActivityData, FigmaFile } from "../types";
import { User as UserIcon, Calendar } from "lucide-react";

function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  } catch {
    return "America/Los_Angeles";
  }
}

interface PublicUser {
  handle?: string | null;
  img_url?: string | null;
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const tz = browserTz();
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, activityRes, filesRes] = await Promise.allSettled([
          axios.get(`/api/public/${encodeURIComponent(slug)}/stats`),
          axios.get(`/api/public/${encodeURIComponent(slug)}/activity?mode=all&days=365&tz=${encodeURIComponent(tz)}`),
          axios.get(`/api/public/${encodeURIComponent(slug)}/files?mode=all`),
        ]);
        if (cancelled) return;

        if (statsRes.status === "fulfilled") {
          const d = statsRes.value.data || {};
          setUser({ handle: d.handle ?? d.user?.handle ?? d.user?.display_name ?? null, img_url: d.img_url ?? d.user?.img_url ?? null });
        } else {
          setNotFound(true);
        }
        if (activityRes.status === "fulfilled") setActivity(activityRes.value.data);
        if (filesRes.status === "fulfilled") setFiles(filesRes.value.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1ABCFE]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-3 text-center px-6">
        <h1 className="text-2xl font-black text-ink">Profile not available</h1>
        <p className="text-body">This profile is private or does not exist.</p>
      </div>
    );
  }

  const dailyTotals = activity?.dailyTotals ?? {};
  const displayName = user?.handle || "Fimanu User";

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[1000px] flex flex-col gap-8">
        {/* Header */}
        <div className="bg-surface flex items-center gap-4 p-6 rounded-4xl shadow-card">
          <div className="relative rounded-full shadow-sm size-16 overflow-hidden bg-hairline shrink-0">
            {user?.img_url ? (
              <img src={user.img_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <UserIcon size={32} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-[24px] tracking-[-0.24px] leading-none text-black">{displayName}</h1>
            <div className="flex items-center gap-1.5 text-muted">
              <Calendar size={13} />
              <span className="text-[12px] font-bold tracking-tight">Public Figma activity</span>
            </div>
          </div>
        </div>

        {/* Top files */}
        {files.length > 0 && <TopFilesCard activity={activity} files={files} />}

        {/* Heatmap */}
        <div className="bg-surface flex flex-col p-6 rounded-4xl shadow-card">
          <h2 className="font-bold text-[20px] tracking-[-0.24px] text-ink mb-6">Activity</h2>
          <div className="overflow-x-auto pb-2 custom-scrollbar flex justify-center">
            <div className="w-full max-w-[900px]">
              <Heatmap data={dailyTotals} theme="light" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
