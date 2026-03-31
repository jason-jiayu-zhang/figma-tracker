import React, { useState, useRef, useCallback, useMemo } from "react";
import { Zap } from "lucide-react";
import imgFimanuLogo from "../assets/Fimanu Logo.svg";
import {
  format,
  subDays,
  startOfToday,
  eachDayOfInterval,
  startOfWeek,
} from "date-fns";

/* ── Types ─────────────────────────────────────────── */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  count: number;
  dateLabel: string;
  flipped: boolean;
  overflowRight: boolean;
  overflowLeft: boolean;
}

export interface HeatmapTheme {
  rectSize?: number;
  rectRadius?: number;
  gap?: number;
  emptyColor?: string;
  levelColors?: string[];
  textColor?: string;
  tooltipBgColor?: string;
  tooltipTextColor?: string;
}

interface HeatmapProps {
  data: Record<string, number>;
  theme?: "light" | "dark";
  customTheme?: HeatmapTheme;
  profileUrl?: string;
}

/* ── Component ─────────────────────────────────────── */

export default function Heatmap({ data, theme = "light", customTheme, profileUrl }: HeatmapProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    count: 0,
    dateLabel: "",
    flipped: false,
    overflowRight: false,
    overflowLeft: false,
  });

  const isLight = theme === "light";

  const tRectSize = customTheme?.rectSize ?? 12; // default 12px (w-3)
  const tGap = customTheme?.gap ?? 4; // default 4px (gap-1)
  const tRadius = customTheme?.rectRadius ?? 2; // default 2px (rounded-sm)
  const tTextColor = customTheme?.textColor ?? (isLight ? "#A6A6A6" : "var(--text-muted)");
  const tEmptyColor = customTheme?.emptyColor ?? (isLight ? "#ebebeb" : "rgba(255,255,255,0.07)");
  const tLevelColors = customTheme?.levelColors ?? (isLight
    ? ["#0acf83", "#1abcfe", "#a259ff", "#ef4444"]
    : ["var(--green)", "var(--blue)", "var(--purple)", "var(--red)"]);
  const tTooltipBg = customTheme?.tooltipBgColor ?? "#2C2C2C";
  const tTooltipText = customTheme?.tooltipTextColor ?? "white";

  const scale = tRectSize / 12;
  const tFontSize = 10 * scale;
  const tSmallFontSize = 9 * scale;

  const weeks = useMemo(() => {
    const today = startOfToday();
    const end = today;
    const start = subDays(startOfWeek(end, { weekStartsOn: 0 }), 52 * 7);

    const daysArr = eachDayOfInterval({ start, end });
    const result: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    daysArr.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
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
      const firstDay = week.find((d) => d !== null);
      if (firstDay && firstDay.getDate() <= 7) {
        const label = format(firstDay, "MMM");
        if (!labels.find((m) => m.label === label)) {
          labels.push({ label, x: i * (tRectSize + tGap) });
        }
      }
    });
    return labels;
  }, [weeks, tRectSize, tGap]);

  const getLevel = (count: number) => {
    if (!count) return 0;
    if (count < 3) return 1;
    if (count < 6) return 2;
    if (count < 10) return 3;
    return 4;
  };

  const getCellColor = (level: number) => {
    if (level === 0) return tEmptyColor;
    return tLevelColors[level - 1] || tLevelColors[tLevelColors.length - 1];
  };

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, day: Date, count: number) => {
      const container = containerRef.current;
      const component = componentRef.current;
      if (!container || !component) return;
      
      const componentRect = component.getBoundingClientRect();
      const cellRect = e.currentTarget.getBoundingClientRect();
      
      const cellCenterX = (cellRect.left - componentRect.left) + (cellRect.width / 2);
      const cellTop = (cellRect.top - componentRect.top);
      const cellBottom = (cellRect.bottom - componentRect.top);
      
      // Flip below if there's less than 60px of space above the component
      const flipped = (cellRect.top - componentRect.top) < 60;
      
      // Horizontal flip check: if tooltip would overflow right edge
      // Assuming tooltip is roughly 120px wide
      const overflowRight = cellCenterX + 60 > componentRect.width;
      const overflowLeft = cellCenterX - 60 < 0;

      setTooltip({
        visible: true,
        x: cellCenterX,
        y: flipped ? cellBottom + 8 : cellTop - 8,
        count,
        dateLabel: format(day, "MMM d, yyyy"),
        flipped,
        overflowRight,
        overflowLeft,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((t) => ({ ...t, visible: false }));
  }, []);

  return (
    <div ref={componentRef} className="flex flex-col gap-4 w-full relative">
      <div 
        ref={containerRef} 
        onScroll={handleMouseLeave}
        className="overflow-x-auto custom-scrollbar relative"
      >
        {/* Grid Container */}
        <div className="pb-0.5" style={{ minWidth: weeks.length * (tRectSize + tGap) + 28 }}>
          {/* Month labels */}
          <div className="relative mb-1 pointer-events-none" style={{ height: tGap * 4, marginLeft: (tRectSize * 2) + tGap }}>
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="absolute leading-none whitespace-nowrap"
                style={{ left: m.x, color: tTextColor, fontSize: tFontSize }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: tGap }}>
            {/* Day labels */}
            <div className="flex-shrink-0 flex flex-col pointer-events-none" style={{ width: tRectSize * 2 }}>
              {[null, "Mon", null, "Wed", null, "Fri", null].map((label, i) => (
                <div
                  key={i}
                  className="flex items-center leading-none"
                  style={{ height: tRectSize, marginBottom: i < 6 ? tGap : 0, color: tTextColor, fontSize: tSmallFontSize }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex" style={{ gap: tGap }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: tGap }}>
                  {week.map((day, di) => {
                    if (!day) return <div key={di} style={{ width: tRectSize, height: tRectSize }} />;
                    const dateKey = format(day, "yyyy-MM-dd");
                    const count = data[dateKey] || 0;
                    const level = getLevel(count);
                    const cellColor = getCellColor(level);
                    return (
                      <div
                        key={di}
                        className="transition-all duration-100 hover:scale-110 hover:z-10 hover:ring-1 hover:ring-white/30 flex-shrink-0 cursor-default relative"
                        style={{
                          width: tRectSize,
                          height: tRectSize,
                          borderRadius: tRadius,
                          backgroundColor: cellColor,
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, day, count)}
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

      {/* Tooltip Overlay */}
      <div
        className={`absolute font-medium rounded-md whitespace-nowrap pointer-events-none z-[100] shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-opacity duration-150 ease-out px-2 py-1.5 flex flex-col items-center gap-1 ${tooltip.visible ? "opacity-100" : "opacity-0"}`}
        style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: `
            ${tooltip.overflowRight ? "translateX(-100%)" : tooltip.overflowLeft ? "translateX(0%)" : "translateX(-50%)"}
            ${tooltip.flipped ? "" : "translateY(-100%)"}
          `,
          backgroundColor: tTooltipBg,
          color: tTooltipText,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span className="font-bold text-[13px] leading-none">
          {tooltip.count} edit{tooltip.count !== 1 ? "s" : ""}
        </span>
        <span className="opacity-70 text-[11px] leading-none">
          {tooltip.dateLabel}
        </span>
        {/* Arrow */}
        {tooltip.flipped ? (
          <div
            className="absolute top-[-5px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px]"
            style={{ borderBottomColor: tTooltipBg, left: tooltip.overflowRight ? 'auto' : (tooltip.overflowLeft ? '0' : '50%'), right: tooltip.overflowRight ? '0' : 'auto', transform: tooltip.overflowRight || tooltip.overflowLeft ? 'none' : 'translateX(-50%)' }}
          />
        ) : (
          <div
            className="absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px]"
            style={{ borderTopColor: tTooltipBg, left: tooltip.overflowRight ? 'auto' : (tooltip.overflowLeft ? '0' : '50%'), right: tooltip.overflowRight ? '0' : 'auto', transform: tooltip.overflowRight || tooltip.overflowLeft ? 'none' : 'translateX(-50%)' }}
          />
        )}
      </div>

      {/* Legend Row */}
      <div className="flex items-center justify-between w-full mt-2" style={{ paddingRight: tGap / 2 }}>
        <div
          className="flex items-center flex-shrink-0"
          style={{ color: tTextColor, marginLeft: (tRectSize * 2) + tGap, gap: tGap, fontSize: tFontSize }}
        >
          <span>Less</span>
          <div className="flex items-center" style={{ gap: tGap / 1.5 }}>
            <div
              className="flex-shrink-0"
              style={{ width: tRectSize, height: tRectSize, borderRadius: tRadius, backgroundColor: tEmptyColor }}
            />
            {tLevelColors.map((c, i) => (
              <div
                key={i}
                className="flex-shrink-0"
                style={{ width: tRectSize, height: tRectSize, borderRadius: tRadius, backgroundColor: c }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
        {profileUrl ? (
          <a 
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="content-stretch flex items-center tracking-[-0.1px] mr-1 hover:opacity-70 transition-opacity cursor-pointer text-inherit no-underline" 
            style={{ color: tTextColor, gap: tGap, fontSize: tFontSize }}
          >
            <span className="leading-[normal]">Made by</span>
            <span className="decoration-solid underline">Fimanu</span>
            <img 
              src={imgFimanuLogo} 
              alt="Fimanu Logo" 
              style={{ height: tFontSize * 1.4, width: "auto", marginLeft: "2px" }}
            />
          </a>
        ) : (
          <div 
            className="content-stretch flex items-center tracking-[-0.1px] mr-1" 
            style={{ color: tTextColor, gap: tGap, fontSize: tFontSize }}
          >
            <span className="leading-[normal]">Made by</span>
            <span className="decoration-solid underline">Fimanu</span>
            <img 
              src={imgFimanuLogo} 
              alt="Fimanu Logo" 
              style={{ height: tFontSize * 1.4, width: "auto", marginLeft: "2px" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
