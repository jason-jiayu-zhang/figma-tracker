import React, { useMemo } from 'react';
import { ActivityData, FigmaFile } from '../types';

interface FileVolumeBreakdownProps {
  activity: ActivityData | null;
  files: FigmaFile[];
  selectedFileKey: string | null;
  setSelectedFileKey: (key: string | null) => void;
}

export default function FileVolumeBreakdown({ activity, files, selectedFileKey, setSelectedFileKey }: FileVolumeBreakdownProps) {
  const { displayItems, total } = useMemo(() => {
    if (!activity || !activity.rows) return { displayItems: [], total: 0 };
    const map: Record<string, { fileKey: string; name: string; count: number }> = {};
    let total = 0;
    
    activity.rows.forEach(row => {
      if (!row.figma_files) return;
      const { file_key, name } = row.figma_files;
      if (!map[file_key]) {
         map[file_key] = { fileKey: file_key, name, count: 0 };
      }
      map[file_key].count += row.version_count;
      total += row.version_count;
    });
    
    const sorted = Object.values(map).sort((a, b) => b.count - a.count);
    const top3 = sorted.slice(0, 3);
    const otherCount = sorted.slice(3).reduce((acc, curr) => acc + curr.count, 0);
    
    const displayItems = [...top3];
    if (otherCount > 0) {
      displayItems.push({ fileKey: 'other', name: 'Other Assets', count: otherCount });
    }
    
    return { displayItems, total };
  }, [activity]);

  if (displayItems.length === 0) return null;

  return (
    <div className="flex-[1_0_0] gap-x-[8px] gap-y-[8px] grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.70fr)] grid-rows-[minmax(0,1fr)_minmax(0,0.70fr)] min-h-px min-w-px relative shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] w-full rounded-[16px] overflow-hidden">
      {displayItems.length === 1 && (
        <Card item={displayItems[0]} index={0} total={total} style={{ gridColumn: "1 / span 3", gridRow: "1 / span 2" }} />
      )}
      
      {displayItems.length === 2 && (
        <>
          <Card item={displayItems[0]} index={0} total={total} style={{ gridColumn: "1 / span 2", gridRow: "1 / span 2" }} />
          <Card item={displayItems[1]} index={1} total={total} style={{ gridColumn: "3", gridRow: "1 / span 2" }} />
        </>
      )}

      {displayItems.length > 2 && (
        <>
          <Card 
            item={displayItems[0]} 
            index={0} 
            total={total} 
            style={{ gridColumn: "1", gridRow: "1 / span 2" }}
          />
          <Card 
            item={displayItems[1]} 
            index={1} 
            total={total} 
            style={{ gridColumn: "2 / span 2", gridRow: "1" }}
          />
          <Card 
            item={displayItems[2]} 
            index={2} 
            total={total} 
            style={{ gridColumn: displayItems.length === 3 ? "2 / span 2" : "2", gridRow: "2" }}
          />
          {displayItems[3] && (
            <Card 
              item={displayItems[3]} 
              index={3} 
              total={total} 
              isOther={displayItems[3].fileKey === 'other'}
              style={{ gridColumn: "3", gridRow: "2" }}
            />
          )}
        </>
      )}
    </div>
  );
}

function Card({ item, index, total, style, isOther = false }: { item: any; index: number; total: number; style?: React.CSSProperties; isOther?: boolean }) {
  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
  const config = getCardConfig(index);
  
  return (
    <div 
      className="content-stretch flex flex-col items-start justify-between justify-self-stretch p-[16px] relative rounded-[16px] self-stretch shrink-0 whitespace-nowrap"
      style={{ ...config.style, ...style }}
    >
      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
        <div className="content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 whitespace-nowrap">
          <p className={`font-medium overflow-hidden relative shrink-0 text-[12px] text-ellipsis tracking-[-0.12px] uppercase ${config.labelClass}`}>
            {item.name}
          </p>
          <p className={`font-extrabold relative shrink-0 text-[18px] tracking-[-0.18px] ${config.textClass}`}>
            {item.count} Edits
          </p>
          <p className={`font-medium relative shrink-0 text-[12px] tracking-[-0.12px] ${config.labelClass}`}>
            Last edit: {item.lastEdit || '2 hours ago'}
          </p>
        </div>
        {!isOther && (
          <div className="h-[20px] relative shrink-0 w-[17.5px]">
            {config.icon}
          </div>
        )}
      </div>
      <p className={`font-normal leading-[normal] relative shrink-0 text-[12px] tracking-[-0.12px] whitespace-nowrap ${config.textClass}`}>
        {percent}{config.percentSuffix}
      </p>
    </div>
  );
}

function getCardConfig(index: number) {
  if (index === 0) {
    return {
      style: { backgroundColor: '#f24e1e' }, 
      labelClass: 'text-white/75',
      textClass: 'text-white',
      percentSuffix: '% of total volume',
      icon: <svg width="17.5" height="20" viewBox="0 0 17.5 20" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 0L17.5 5V15L8.75 20L0 15V5L8.75 0Z" opacity="0.8"/></svg>
    };
  }
  if (index === 1) {
    return {
      style: { backgroundColor: '#a259ff' }, 
      labelClass: 'text-white/75',
      textClass: 'text-white',
      percentSuffix: '% of total volume',
      icon: <svg width="17.5" height="20" viewBox="0 0 17.5 20" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 0L17.5 5V15L8.75 20L0 15V5L8.75 0Z" opacity="0.8"/></svg>
    };
  }
  if (index === 2) {
    return {
      style: { backgroundColor: '#1abcfe' }, 
      labelClass: 'text-white/75',
      textClass: 'text-white',
      percentSuffix: '% of total volume',
      icon: <svg width="17.5" height="20" viewBox="0 0 17.5 20" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 0L17.5 5V15L8.75 20L0 15V5L8.75 0Z" opacity="0.8"/></svg>
    };
  }
  
  return {
    style: { backgroundColor: '#0acf83' }, 
    labelClass: 'text-white/75',
    textClass: 'text-white',
    percentSuffix: '% of total volume',
    icon: <svg width="17.5" height="20" viewBox="0 0 17.5 20" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 0L17.5 5V15L8.75 20L0 15V5L8.75 0Z" opacity="0.8"/></svg>
  };
}
