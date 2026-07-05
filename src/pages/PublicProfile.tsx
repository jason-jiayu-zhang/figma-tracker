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
      <div className="min-h-screen bg-[#fffaf4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1ABCFE]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#fffaf4] flex flex-col items-center justify-center gap-3 text-center px-6">
        <h1 className="text-2xl font-black text-[#181818]">Profile not available</h1>
        <p className="text-[#737373]">This profile is private or does not exist.</p>
      </div>
    );
  }

  const dailyTotals = activity?.dailyTotals ?? {};
  const displayName = user?.handle || "Fimanu User";

  return (
    <div className="min-h-screen bg-[#fffaf4] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[1000px] flex flex-col gap-8">
        {/* Header */}
        <div className="bg-white flex items-center gap-4 p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)]">
          <div className="relative rounded-full shadow-sm size-16 overflow-hidden bg-[#F5F5F5] shrink-0">
            {user?.img_url ? (
              <img src={user.img_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A6A6A6]">
                <UserIcon size={32} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-[24px] tracking-[-0.24px] leading-none text-black">{displayName}</h1>
            <div className="flex items-center gap-1.5 text-[#A6A6A6]">
              <Calendar size={13} />
              <span className="text-[12px] font-bold tracking-tight">Public Figma activity</span>
            </div>
          </div>
        </div>

        {/* Top files */}
        {files.length > 0 && <TopFilesCard activity={activity} files={files} />}

        {/* Heatmap */}
        <div className="bg-white flex flex-col p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)]">
          <h2 className="font-bold text-[20px] tracking-[-0.24px] text-[#1A1A1A] mb-6">Activity</h2>
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
