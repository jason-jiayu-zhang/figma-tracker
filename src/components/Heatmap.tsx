import React, { useState, useRef, useCallback, useMemo } from 'react';
import { format, subDays, startOfToday, eachDayOfInterval, startOfWeek, isSameMonth } from 'date-fns';

/* ── Types ─────────────────────────────────────────── */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  count: number;
  dateLabel: string;
}

interface HeatmapProps {
  data: Record<string, number>;
  theme?: 'light' | 'dark';
}

/* ── Component ─────────────────────────────────────── */

export default function Heatmap({ data, theme = 'light' }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, count: 0, dateLabel: '' });

  const isLight = theme === 'light';

  const weeks = useMemo(() => {
    const today = startOfToday();
    // Start exactly 52 weeks ago from the start of this week (Sunday)
    const end = today;
    const start = subDays(startOfWeek(end, { weekStartsOn: 0 }), 52 * 7);
    
    const daysArr = eachDayOfInterval({ start, end });
    const result: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    daysArr.forEach((day, i) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      // Pad last week if necessary
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      result.push(currentWeek);
    }

    return result;
  }, []);

  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    weeks.forEach((week, i) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay && firstDay.getDate() <= 7) {
        const label = format(firstDay, 'MMM');
        if (!labels.find(m => m.label === label)) {
          // 12px (w-3) + 4px (gap-1) = 16px per week
          labels.push({ label, x: i * 16 });
        }
      }
    });
    return labels;
  }, [weeks]);

  const getLevel = (count: number) => {
    if (!count) return 0;
    if (count < 3) return 1;
    if (count < 6) return 2;
    if (count < 10) return 3;
    return 4;
  };

  const levelColors = isLight 
    ? ['bg-[#ebebeb]', 'bg-[#0acf83]', 'bg-[#1abcfe]', 'bg-[#a259ff]', 'bg-[#ef4444]']
    : ['rgba(255,255,255,0.07)', 'var(--green)', 'var(--blue)', 'var(--purple)', 'var(--red)'];

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
    <div className="flex flex-col gap-1">
      <div ref={containerRef} className="overflow-visible relative">
        {/* Tooltip */}
        <div
          className={`absolute transform -translate-x-1/2 -translate-y-[calc(100%+12px)] bg-[#2C2C2C] text-white font-medium rounded-[6px] whitespace-nowrap pointer-events-none z-[100] shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-white/10 transition-all duration-150 ease-out px-2 py-1.5 flex flex-col items-center gap-1 ${tooltip.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <span className="font-bold text-[13px] leading-none">{tooltip.count} edit{tooltip.count !== 1 ? 's' : ''}</span>
          <span className="text-[#A6A6A6] text-[11px] leading-none">{tooltip.dateLabel}</span>
          <div className="absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#2C2C2C]" />
        </div>

        {/* Grid Container */}
        <div className="pb-0.5" style={{ minWidth: weeks.length * 16 + 32 }}>
          {/* Month labels */}
          <div className="relative h-4 mb-1 ml-8">
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className={`absolute text-[10px] leading-none whitespace-nowrap ${isLight ? 'text-[#A6A6A6]' : 'text-[var(--text-muted)]'}`}
                style={{ left: m.x }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0">
            {/* Day labels */}
            <div className="w-8 flex-shrink-0 flex flex-col pt-[1px]">
              {[null, 'Mon', null, 'Wed', null, 'Fri', null].map((label, i) => (
                <div
                  key={i}
                  className={`h-3 text-[9px] flex items-center leading-none ${i < 6 ? 'mb-1' : ''} ${isLight ? 'text-[#A6A6A6]' : 'text-[var(--text-muted)]'}`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="w-3 h-3" />;
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const count = data[dateKey] || 0;
                    const level = getLevel(count);
                    return (
                      <div
                        key={di}
                        className={`w-3 h-3 rounded-[2px] transition-transform duration-100 hover:scale-125 flex-shrink-0 cursor-default ${levelColors[level]}`}
                        style={!isLight && level === 0 ? { backgroundColor: 'rgba(255,255,255,0.07)' } : undefined}
                        onMouseEnter={e => handleMouseEnter(e, day, count)}
                        onMouseLeave={handleMouseLeave}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={`mt-2 flex items-center gap-1 text-[10px] flex-shrink-0 ml-8 ${isLight ? 'text-[#A6A6A6]' : 'text-[var(--text-muted)]'}`}>
        <span>Less</span>
        {levelColors.map((c, i) => (
          <div 
            key={i} 
            className={`w-3 h-3 rounded-[2px] flex-shrink-0 ${c}`} 
            style={!isLight && i === 0 ? { backgroundColor: 'rgba(255,255,255,0.07)' } : undefined}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
