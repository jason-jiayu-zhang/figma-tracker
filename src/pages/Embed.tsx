import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useFigmaData } from '../useFigmaData';
import { format, subDays, startOfToday, eachDayOfInterval } from 'date-fns';

/* ── Types ─────────────────────────────────────────────────── */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  count: number;
  dateLabel: string;
}

/* ── Sub-components ────────────────────────────────────────── */

const FigmaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="7" height="7" rx="0" fill="#A259FF" />
    <rect x="13" y="4" width="7" height="7" rx="0" fill="#F24E1E" />
    <rect x="4" y="13" width="7" height="7" rx="0" fill="#0ACF83" />
    <circle cx="16.5" cy="16.5" r="3.5" fill="#1ABCFE" />
  </svg>
);

const EmbedHeader = ({ totalEdits }: { totalEdits: number }) => (
  <div className="flex justify-between items-center flex-shrink-0">
    <div className="flex items-center gap-2 text-[13px] font-bold text-[#181818]">
      <FigmaIcon />
      Figma Contributions
    </div>
    <span className="text-[11px] text-[#A6A6A6]">
      {totalEdits} edits in the last year
    </span>
  </div>
);

const ActivityTooltip = ({ tooltip }: { tooltip: TooltipState }) => {
  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-[calc(100%+12px)] bg-[#2C2C2C] text-white font-medium rounded-[6px] whitespace-nowrap pointer-events-none z-[100] shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-white/10 transition-all duration-150 ease-out ${tooltip.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      /*this section doesnt work without style lol*/
      style={{
        left: tooltip.x,
        top: tooltip.y,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      <span className="font-bold text-[13px] leading-none">{tooltip.count} edit{tooltip.count !== 1 ? 's' : ''}</span>
      <span className="text-[#A6A6A6] text-[11px] leading-none">{tooltip.dateLabel}</span>
      <div className="absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#2C2C2C]" />
    </div>
  );
};

const ActivityGrid = ({
  weeks,
  data,
  onMouseEnter,
  onMouseLeave
}: {
  weeks: Date[][];
  data: Record<string, number>;
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>, day: Date, count: number) => void;
  onMouseLeave: () => void;
}) => {
  const getLevel = (count: number) => {
    if (!count) return 0;
    if (count < 3) return 1;
    if (count < 6) return 2;
    if (count < 10) return 3;
    return 4;
  };

  const levelColors = ['bg-[#ebebeb]', 'bg-[#0acf83]', 'bg-[#1abcfe]', 'bg-[#a259ff]', 'bg-[#ef4444]'];

  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    weeks.forEach((week, i) => {
      const firstDay = week[0];
      if (firstDay && firstDay.getDate() <= 7) {
        const label = format(firstDay, 'MMM');
        if (!labels.find(m => m.label === label)) {
          labels.push({ label, x: i * 16 });
        }
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="pb-0.5 pr-8" style={{ minWidth: weeks.length * 16 + 32 }}>
      {/* Month labels */}
      <div className="relative h-3.5 mb-1 ml-8">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-[#A6A6A6] leading-none whitespace-nowrap"
            style={{ left: m.x }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Day labels + grid */}
      <div className="flex gap-0">
        {/* Day-of-week labels */}
        <div className="w-8 flex-shrink-0 flex flex-col">
          {[null, 'Mon', null, 'Wed', null, 'Fri', null].map((label, i) => (
            <div
              key={i}
              className={`h-3 text-[9px] text-[#A6A6A6] flex items-center leading-none ${i < 6 ? 'mb-1' : ''}`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid columns */}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const day = week[dayIndex];
                if (!day) return <div key={dayIndex} className="w-2.5 h-2.5" />;
                const dateKey = format(day, 'yyyy-MM-dd');
                const count = data[dateKey] || 0;
                const level = getLevel(count);
                return (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-[2px] transition-transform duration-100 hover:scale-125 flex-shrink-0 cursor-default ${levelColors[level]}`}
                    onMouseEnter={e => onMouseEnter(e, day, count)}
                    onMouseLeave={onMouseLeave}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HeatmapLegend = () => {
  const levelColors = ['bg-[#ebebeb]', 'bg-[#0acf83]', 'bg-[#1abcfe]', 'bg-[#a259ff]', 'bg-[#ef4444]'];
  return (
    <div className="mt-2 flex items-center gap-1 text-[10px] text-[#A6A6A6] flex-shrink-0 ml-8">
      <span>Less</span>
      {levelColors.map((c, i) => (
        <div key={i} className={`w-3 h-3 rounded-[2px] flex-shrink-0 ${c}`} />
      ))}
      <span>More</span>
    </div>
  );
};

/* ── Main Components ────────────────────────────────────────── */

function Heatmap({ data }: { data: Record<string, number> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, count: 0, dateLabel: '' });

  const weeks = useMemo(() => {
    const today = startOfToday();
    const startDate = subDays(today, 364);
    const daysArr = eachDayOfInterval({ start: startDate, end: today });
    const result: Date[][] = [];
    let currentWeek: Date[] = [];
    daysArr.forEach((day) => {
      if (day.getDay() === 0 && currentWeek.length > 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, day: Date, count: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: cellRect.left - rect.left + 6,
      y: cellRect.top - rect.top + 4,
      count,
      dateLabel: format(day, 'MMM d, yyyy'),
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div ref={containerRef} className="overflow-visible relative">
        <ActivityTooltip tooltip={tooltip} />
        <ActivityGrid
          weeks={weeks}
          data={data}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      <HeatmapLegend />
    </div>
  );
}

export default function Embed() {
  const { activity, loading } = useFigmaData();

  const totalEdits = useMemo(() => {
    return activity ? Object.values(activity.dailyTotals).reduce((a, b) => a + b, 0) : 0;
  }, [activity]);

  if (loading && !activity) return null;

  return (
    <div
      className="bg-[#f5f5f5] text-[#181818] font-sans p-8 rounded-none border border-[#e0e0e0] flex flex-col gap-4 box-border min-h-screen"
      style={{ padding: 32 }}
    >
      <EmbedHeader totalEdits={totalEdits} />
      <Heatmap data={activity?.dailyTotals ?? {}} />
    </div>
  );
}
