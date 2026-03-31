import React, { useMemo } from 'react';
import { ActivityData, FigmaFile } from '../types';
import { formatDistanceToNowStrict } from 'date-fns';

interface FileVolumeBreakdownProps {
  activity: ActivityData | null;
  files: FigmaFile[];
  selectedFileKey: string | null;
  setSelectedFileKey: (key: string | null) => void;
}

export default function FileVolumeBreakdown({ activity, files, selectedFileKey, setSelectedFileKey }: FileVolumeBreakdownProps) {
  const { displayItems, total } = useMemo(() => {
    if (!activity || !activity.rows) return { displayItems: [], total: 0 };
    const map: Record<string, { fileKey: string; name: string; count: number; lastModified?: string }> = {};
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

    // Enrich with last_modified from the files list
    files.forEach(f => {
      if (map[f.file_key]) {
        map[f.file_key].lastModified = f.last_modified;
      }
    });

    const sorted = Object.values(map).sort((a, b) => b.count - a.count);
    const top3 = sorted.slice(0, 3);
    const others = sorted.slice(3);
    const otherCount = others.reduce((acc, curr) => acc + curr.count, 0);

    const displayItems = [...top3];
    // Show Other whenever there are more than 3 files in the breakdown
    if (others.length > 0) {
      displayItems.push({ fileKey: 'other', name: 'Other Files', count: otherCount });
    }

    return { displayItems, total };
  }, [activity, files]);

  if (displayItems.length === 0) return null;

  return (
    <div className="flex-[1_0_0] gap-x-2 gap-y-2 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.70fr)] grid-rows-[minmax(0,1fr)_minmax(0,0.70fr)] min-h-px min-w-px relative w-full rounded-2xl overflow-hidden">
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
  const bgStyle = isOther ? { backgroundColor: '#0acf83' } : config.style;
  const lastEdit = item.lastModified
    ? formatDistanceToNowStrict(new Date(item.lastModified), { addSuffix: true })
    : (isOther ? null : 'No recent edits');

  return (
    <div
      className="content-stretch flex flex-col items-start justify-between justify-self-stretch p-4 relative rounded-2xl self-stretch shrink-0 whitespace-nowrap"
      style={{ ...bgStyle, ...style }}
    >
      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
        <div className="content-stretch flex flex-col gap-1 items-start leading-[normal] relative shrink-0 whitespace-nowrap">
          <p className={`font-medium overflow-hidden relative shrink-0 text-[12px] text-ellipsis tracking-[-0.12px] uppercase ${config.labelClass}`}>
            {item.name}
          </p>
          <p className={`font-extrabold relative shrink-0 text-[18px] tracking-[-0.18px] ${config.textClass}`}>
            {item.count} Edits
          </p>
          <p className={`font-medium relative shrink-0 text-[12px] tracking-[-0.12px] ${config.labelClass}`}>
            Last edit: {lastEdit || '—'}
          </p>
        </div>
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
      percentSuffix: '% of total volume'
    };
  }
  if (index === 1) {
    return {
      style: { backgroundColor: '#a259ff' },
      labelClass: 'text-white/75',
      textClass: 'text-white',
      percentSuffix: '% of total volume'
    };
  }
  if (index === 2) {
    return {
      style: { backgroundColor: '#1abcfe' },
      labelClass: 'text-white/75',
      textClass: 'text-white',
      percentSuffix: '% of total volume'
    };
  }

  return {
    style: { backgroundColor: '#0acf83' },
    labelClass: 'text-white/75',
    textClass: 'text-white',
    percentSuffix: '% of total volume'
  };
}
