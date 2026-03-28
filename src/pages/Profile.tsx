import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useFigmaData } from '../useFigmaData';
import Heatmap from '../components/Heatmap';
import TopFilesCard from '../components/TopFilesCard';
import { Calendar, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { stats, activity, files, loading } = useFigmaData();
  // Separate unfiltered activity fetch for the heatmap — shows ALL data
  const [allActivity, setAllActivity] = useState<Record<string, number>>({});
  useEffect(() => {
    axios.get('/api/activity?mine=true&days=365').then(res => {
      setAllActivity(res.data?.dailyTotals ?? {});
    }).catch(() => {});
  }, []);

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1ABCFE]"></div>
    </div>
  );

  const user = stats?.user;
  const joinedDate = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : 'March 2026';

  return (
    <div className="flex flex-col gap-8 w-full min-h-[768px]">
      {/* Top Row: Profile Card + Active Files */}
      <div className="flex gap-8 items-stretch w-full shrink-0">
        {/* Profile Card */}
        <div className="bg-white flex flex-col gap-6 items-start p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-[300px]">
          <div className="flex flex-col gap-4 items-start w-full">
            {/* Avatar & Name */}
            <div className="flex flex-col gap-2 items-start justify-center w-full">
               <div className="relative rounded-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 size-20 overflow-hidden bg-[#F5F5F5]">
                  {user?.img_url ? (
                    <img src={user.img_url} alt={user.display_name || 'Profile'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A6A6A6]">
                      <UserIcon size={40} />
                    </div>
                  )}
               </div>
               <h1 className="font-bold text-[24px] tracking-[-0.24px] leading-tight text-black">{user?.display_name || 'Jason Zhang'}</h1>
            </div>

            {/* About Section */}
            <div className="flex flex-col gap-2 items-start w-full">
              <p className="text-[14px] text-[#737373] font-medium tracking-[-0.14px]">About</p>
              <p className="text-[14px] text-black leading-snug">
                Something something about {user?.display_name || 'Jason'} idk what im writing i just need text
              </p>
            </div>

            {/* Connections */}
            <div className="flex flex-col gap-2 items-start w-full">
              <p className="text-[14px] text-[#737373] font-medium tracking-[-0.14px]">Connections</p>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-[10px]">
                  <div className="size-6 shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="white"/>
                      <path d="M7 6H11V8.2C11.5 7.5 12.2 7 13.5 7C15.5 7 17 8.5 17 11V18H13V11.5C13 10.5 12.5 10 11.5 10C10.5 10 10 10.5 10 11.5V18H6V11.5C6 11 6.5 6 7 6Z" fill="#1ABCFE" stroke="#1ABCFE" strokeWidth="0.5"/>
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM18.2 12.5C18.2 13.2 18.2 13.9 18.2 14.6C18.2 15.3 18.2 16 18.2 16.7C18.2 17.4 18.2 18 18.2 18.7C18.2 19.4 18.2 19.4 17.5 19.4C16.8 19.4 16.1 19.4 15.4 19.4C14.7 19.4 14.7 19.4 14.7 18.7C14.7 18 14.7 17.3 14.7 16.6C14.7 15.9 14.7 15.2 14.7 14.5C14.7 13.8 14.7 13.1 14.7 12.4C14.7 11.7 14.7 11 14.7 10.3C14.7 9.6 14.7 9.3 14 9.3C13.3 9.3 12.8 9.6 12.8 10.3C12.8 11 12.8 11.7 12.8 12.4C12.8 13.1 12.8 13.8 12.8 14.5C12.8 15.2 12.8 15.9 12.8 16.6C12.8 17.3 12.8 18 12.8 18.7C12.8 19.4 12.8 19.4 12.1 19.4C11.4 19.4 10.7 19.4 10 19.4C9.3 19.4 9.3 19.4 9.3 18.7C9.3 18 9.3 17.3 9.3 16.6C9.3 15.9 9.3 15.2 9.3 14.5C9.3 13.8 9.3 13.1 9.3 12.4C9.3 11.7 9.3 11 9.3 10.3C9.3 9.6 9.3 8.9 9.3 8.2C9.3 7.5 9.3 6.8 9.3 6.1C9.3 5.4 9.3 5.4 10 5.4C10.7 5.4 11.4 5.4 12.1 5.4C12.8 5.4 12.8 5.4 12.8 6.1C12.8 6.8 12.8 7.5 12.8 8.2C13.5 7.5 14.4 7.2 15.5 7.2C16.9 7.2 18.2 8.4 18.2 10V12.5Z" fill="#1ABCFE"/>
                    </svg>
                  </div>
                  <a href={`mailto:${user?.email || ''}`} className="text-[14px] text-black font-medium hover:underline truncate">
                    {user?.email || 'jason.jiayu.zhang@gmail.com'}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 w-full pt-3 border-t border-[#F5F5F5]">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 text-[#A6A6A6]">
                <Calendar size={14} />
                <span className="text-[11px] font-bold tracking-tight">Joined {joinedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#A6A6A6]">
                <UserIcon size={14} />
                <span className="text-[11px] font-bold tracking-tight">Fimanu Creator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Files Card - Now part of the top row */}
        <div className="flex-1 min-w-0">
          <TopFilesCard activity={activity} files={files} />
        </div>
      </div>

      {/* Bottom Row - Activity Breakdown Heatmap */}
      <div className="bg-white flex flex-col p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] min-h-[300px]">
        <div className="flex gap-3 items-center mb-6">
          <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1A1A1A]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-bold text-[20px] tracking-[-0.24px] leading-none text-[#1A1A1A]">Activity Breakdown</h2>
            <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">Global activity across all tracked files.</p>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto pb-2 custom-scrollbar flex items-center justify-center">
          <div className="w-full max-w-[900px]">
            <Heatmap
              data={allActivity}
              theme="light"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
