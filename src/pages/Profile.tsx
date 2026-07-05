import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useFigmaData } from '../useFigmaData';
import { useSession } from '../session';
import { APP_ORIGIN } from '../config';
import Heatmap from '../components/Heatmap';
import TopFilesCard from '../components/TopFilesCard';
import { Calendar, User as UserIcon, Globe, Lock, Settings as SettingsIcon, ExternalLink } from 'lucide-react';

function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
  } catch {
    return 'America/Los_Angeles';
  }
}

export default function Profile() {
  const { activity, files, loading } = useFigmaData();
  const { user } = useSession();

  // Separate unfiltered activity fetch for the heatmap — shows ALL data, tz-aware.
  const [allActivity, setAllActivity] = useState<Record<string, number>>({});
  useEffect(() => {
    axios
      .get(`/api/activity?mode=all&days=365&tz=${encodeURIComponent(browserTz())}`)
      .then((res) => setAllActivity(res.data?.dailyTotals ?? {}))
      .catch(() => {});
  }, []);

  if (loading && !activity) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1ABCFE]"></div>
    </div>
  );

  const displayName = user?.handle || 'Your Profile';
  const slug = user?.profile_slug || '';
  const published = !!user?.public_enabled && !!slug;
  const publicUrl = slug ? `${APP_ORIGIN}/u/${slug}` : '';

  return (
    <div className="flex flex-col gap-8 w-full min-h-[768px]">
      {/* Identity header — mirrors what visitors see on the public profile */}
      <div className="bg-white flex flex-col gap-6 p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)]">
        <div className="flex items-center gap-4">
          <div className="relative rounded-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 size-20 overflow-hidden bg-[#F5F5F5]">
            {user?.img_url ? (
              <img src={user.img_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A6A6A6]">
                <UserIcon size={40} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <h1 className="font-bold text-[24px] tracking-[-0.24px] leading-tight text-black" style={{ fontFamily: 'var(--font-sans)' }}>{displayName}</h1>
            {/* Publish status badge — links to Settings to change it */}
            {published ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0acf83] hover:opacity-80 transition-opacity w-fit"
              >
                <Globe size={14} /> Public
                <span className="text-[#A6A6A6] font-mono font-normal truncate">/u/{slug}</span>
                <ExternalLink size={12} className="text-[#A6A6A6]" />
              </a>
            ) : (
              <Link
                to="/settings"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#A6A6A6] hover:text-[#737373] transition-colors w-fit"
              >
                <Lock size={14} /> Private
                <span className="font-normal">· publish in Settings</span>
              </Link>
            )}
          </div>
          <Link
            to="/settings"
            title="Settings"
            className="ml-auto self-start size-9 flex items-center justify-center rounded-xl bg-[#fffaf4] border border-[#EBEBEB] text-[#737373] hover:text-[#1A1A1A] hover:bg-[#f5ebd9] transition-colors"
          >
            <SettingsIcon size={17} />
          </Link>
        </div>
      </div>

      {/* Top files */}
      <TopFilesCard activity={activity} files={files} />

      {/* Activity Breakdown Heatmap */}
      <div className="bg-white flex flex-col p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] min-h-[300px]">
        <div className="flex gap-3 items-center mb-6">
          <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1A1A1A]">
            <Calendar size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-bold text-[20px] tracking-[-0.24px] leading-none text-[#1A1A1A]" style={{ fontFamily: 'var(--font-sans)' }}>Activity Breakdown</h2>
            <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">Global activity across all tracked files.</p>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto pb-2 custom-scrollbar flex items-center justify-center">
          <div className="w-full max-w-[900px]">
            <Heatmap data={allActivity} theme="light" profileUrl="/profile" />
          </div>
        </div>
      </div>
    </div>
  );
}
