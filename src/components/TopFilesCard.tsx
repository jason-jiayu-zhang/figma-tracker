import React, { useMemo } from 'react';
import { ActivityData, FigmaFile } from '../types';
import { formatDistanceToNowStrict } from 'date-fns';

interface TopFilesCardProps {
  activity: ActivityData | null;
  files: FigmaFile[];
}

export default function TopFilesCard({ activity, files }: TopFilesCardProps) {
  const { displayItems, otherItem, total } = useMemo(() => {
    // 1. Initialize map from files array to ensure all tracked files are considered
    const map: Record<string, { fileKey: string; name: string; count: number; lastModified?: string }> = {};
    files.forEach(f => {
      map[f.file_key] = { 
        fileKey: f.file_key, 
        name: f.name, 
        count: 0, 
        lastModified: f.last_modified 
      };
    });

    if (!activity || !activity.rows) {
      const sorted = Object.values(map).sort((a, b) => b.count - a.count);
      const top3 = sorted.slice(0, 3);
      const others = sorted.slice(3);
      const otherCount = others.reduce((acc, curr) => acc + curr.count, 0);
      return { 
        displayItems: top3, 
        otherItem: others.length > 0 ? { count: otherCount, fileCount: others.length } : null,
        total: 0 
      };
    }
    
    // 2. Add activity counts
    let total = 0;
    activity.rows.forEach(row => {
      if (!row.figma_files) return;
      const { file_key } = row.figma_files;
      if (map[file_key]) {
        map[file_key].count += row.version_count;
        total += row.version_count;
      }
    });

    // 3. Sort and pick top 3 + Other (only show Other if it has actual edits)
    const sorted = Object.values(map).sort((a, b) => b.count - a.count);
    const top3 = sorted.slice(0, 3);
    const others = sorted.slice(3);
    const otherCount = others.reduce((acc, curr) => acc + curr.count, 0);
    
    return { 
      displayItems: top3, 
      otherItem: others.length > 0 ? { count: otherCount, fileCount: others.length } : null,
      total 
    };
  }, [activity, files]);

  if (displayItems.length === 0) return (
    <div className="bg-white p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] flex items-center justify-center w-full h-full min-h-40">
      <p className="text-sm text-[#737373] italic">No file activity tracked.</p>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] flex flex-col gap-5 w-full h-full min-h-[300px]">
      <div className="flex gap-3 items-center">
        <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1A1A1A]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-bold text-[20px] tracking-[-0.24px] leading-none text-[#1A1A1A]">Most Active Files</h2>
          <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">Global activity breakdown by volume.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1">
        {displayItems.map((item, index) => (
          <Card key={item.fileKey} item={item} index={index} total={total} />
        ))}
        {otherItem && (
          <OtherCard count={otherItem.count} fileCount={otherItem.fileCount} total={total} />
        )}
      </div>
    </div>
  );
}

function Card({ item, index, total }: { item: any; index: number; total: number }) {
  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
  const colors = [
    { bg: '#f24e1e', icon: <svg width="17" height="20" viewBox="0 0 17 20" fill="white"><path d="M8.5 0L17 5V15L8.5 20L0 15V5L8.5 0Z" opacity="0.8"/></svg> },
    { bg: '#a259ff', icon: <svg width="17" height="20" viewBox="0 0 17 20" fill="white"><path d="M8.5 0L17 5V15L8.5 20L0 15V5L8.5 0Z" opacity="0.8"/></svg> },
    { bg: '#1abcfe', icon: <svg width="17" height="20" viewBox="0 0 17 20" fill="white"><path d="M8.5 0L17 5V15L8.5 20L0 15V5L8.5 0Z" opacity="0.8"/></svg> },
  ];
  
  const color = colors[index % colors.length];
  const lastEdit = item.lastModified
    ? formatDistanceToNowStrict(new Date(item.lastModified), { addSuffix: true })
    : 'No edits';

  return (
    <div 
      className="flex flex-col items-start justify-between p-4 rounded-3xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] transition-transform hover:scale-[1.02] cursor-default"
      style={{ backgroundColor: color.bg }}
    >
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[10px] text-white/75 font-extrabold uppercase tracking-wider truncate">
            {item.name}
          </p>
          <p className="text-[20px] text-white font-extrabold tracking-tight leading-none">
            {item.count} Edits
          </p>
          <p className="text-[11px] text-white/75 font-medium tracking-tight">
            {lastEdit}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          {color.icon}
        </div>
      </div>
      <p className="text-[11px] text-white font-bold tracking-tight">
        {percent}% of total
      </p>
    </div>
  );
}

function OtherCard({ count, fileCount, total }: { count: number; fileCount: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col items-start justify-between p-4 rounded-3xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] transition-transform hover:scale-[1.02] cursor-default bg-[#0acf83]">
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[10px] text-white/75 font-extrabold uppercase tracking-wider truncate">
            Other Files ({fileCount})
          </p>
          <p className="text-[20px] text-white font-extrabold tracking-tight leading-none">
            {count} Edits
          </p>
          <p className="text-[11px] text-white/75 font-medium tracking-tight">
            Various files
          </p>
        </div>
        <div className="shrink-0 mt-1">
          <svg width="17" height="20" viewBox="0 0 17 20" fill="white"><path d="M8.5 0L17 5V15L8.5 20L0 15V5L8.5 0Z" opacity="0.8"/></svg>
        </div>
      </div>
      <p className="text-[11px] text-white font-bold tracking-tight">
        {percent}% of total
      </p>
    </div>
  );
}
