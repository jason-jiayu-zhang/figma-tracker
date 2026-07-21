import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ActivityData, FigmaFile } from '../types';
import { formatDistanceToNowStrict } from 'date-fns';
import { colorForKey } from './ui';

interface FileVolumeBreakdownProps {
  activity: ActivityData | null;
  files: Pick<FigmaFile, "file_key" | "last_modified">[];
  // Public embed context: drop the internal <Link> empty state and allow the
  // card corner radius / text color to be themed via query params.
  embedded?: boolean;
  cardRadius?: number;
  textColor?: string;
}

export default function FileVolumeBreakdown({
  activity,
  files,
  embedded = false,
  cardRadius,
  textColor = "#ffffff",
}: FileVolumeBreakdownProps) {
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

  if (displayItems.length === 0)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full rounded-2xl bg-canvas">
        <p className="text-[13px] text-body tracking-[-0.12px] text-balance text-center">
          No edit volume to break down yet.
        </p>
        {!embedded && (
          <Link
            to="/files"
            className="text-[13px] font-bold text-white bg-accent hover:bg-accent-hover active:bg-accent-active px-4 py-2 rounded-lg transition-colors no-underline"
          >
            Add a file
          </Link>
        )}
      </div>
    );

  return (
    <div
      className="flex-[1_0_0] gap-x-2 gap-y-2 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.70fr)] grid-rows-[minmax(0,1fr)_minmax(0,0.70fr)] min-h-px min-w-px relative w-full rounded-2xl overflow-hidden"
      style={{ color: textColor }}
    >
      {displayItems.length === 1 && (
        <Card item={displayItems[0]} total={total} radius={cardRadius} isPrimary style={{ gridColumn: "1 / span 3", gridRow: "1 / span 2" }} />
      )}

      {displayItems.length === 2 && (
        <>
          <Card item={displayItems[0]} total={total} radius={cardRadius} isPrimary style={{ gridColumn: "1 / span 2", gridRow: "1 / span 2" }} />
          <Card item={displayItems[1]} total={total} radius={cardRadius} style={{ gridColumn: "3", gridRow: "1 / span 2" }} />
        </>
      )}

      {displayItems.length > 2 && (
        <>
          <Card
            item={displayItems[0]}
            total={total}
            radius={cardRadius}
            isPrimary
            style={{ gridColumn: "1", gridRow: "1 / span 2" }}
          />
          <Card
            item={displayItems[1]}
            total={total}
            radius={cardRadius}
            style={{ gridColumn: "2 / span 2", gridRow: "1" }}
          />
          <Card
            item={displayItems[2]}
            total={total}
            radius={cardRadius}
            style={{ gridColumn: displayItems.length === 3 ? "2 / span 2" : "2", gridRow: "2" }}
          />
          {displayItems[3] && (
            <Card
              item={displayItems[3]}
              total={total}
              radius={cardRadius}
              isOther={displayItems[3].fileKey === 'other'}
              style={{ gridColumn: "3", gridRow: "2" }}
            />
          )}
        </>
      )}
    </div>
  );
}

function Card({ item, total, style, radius, isOther = false, isPrimary = false }: { item: any; total: number; style?: React.CSSProperties; radius?: number; isOther?: boolean; isPrimary?: boolean }) {
  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
  const bgStyle = isOther ? { backgroundColor: '#6b7280' } : { backgroundColor: colorForKey(item.fileKey) };
  const lastEdit = item.lastModified
    ? formatDistanceToNowStrict(new Date(item.lastModified), { addSuffix: true })
    : (isOther ? null : 'No recent edits');

  return (
    <div
      className="content-stretch flex flex-col items-start justify-between justify-self-stretch p-4 relative rounded-2xl self-stretch shrink-0 whitespace-nowrap"
      style={{ ...bgStyle, ...(radius != null ? { borderRadius: radius } : null), ...style }}
    >
      <div className="content-stretch flex items-start justify-between relative shrink-0 w-full min-w-0">
        <div className="content-stretch flex flex-col gap-1 items-start leading-[normal] relative min-w-0 w-full">
          <p className="font-medium truncate max-w-full w-full text-[12px] tracking-[-0.12px] uppercase">
            {item.name}
          </p>
          <p className="font-extrabold relative shrink-0 text-[18px] tracking-[-0.18px] tabular-nums">
            {item.count} Edits
          </p>
          <p className="font-medium truncate max-w-full w-full text-[12px] tracking-[-0.12px] tabular-nums">
            Last edit: {lastEdit || '—'}
          </p>
        </div>
      </div>
      <p className="font-normal leading-[normal] relative shrink-0 text-[12px] tracking-[-0.12px] whitespace-nowrap tabular-nums">
        {percent}%{isPrimary ? ' of total volume' : ''}
      </p>
    </div>
  );
}
