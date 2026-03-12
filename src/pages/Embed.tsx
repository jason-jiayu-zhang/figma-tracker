import React from 'react';
import { useFigmaData } from '../useFigmaData';
import { format, subDays, startOfToday, eachDayOfInterval } from 'date-fns';

export default function Embed() {
  const { activity, loading } = useFigmaData();

  if (loading && !activity) return null;

  return (
    <div className="embed-container">
      <div className="embed-header">
        <div className="embed-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#A259FF"/>
            <rect x="13" y="4" width="7" height="7" rx="3.5" fill="#F24E1E"/>
            <rect x="4" y="13" width="7" height="7" rx="3.5" fill="#0ACF83"/>
            <circle cx="16.5" cy="16.5" r="3.5" fill="#1ABCFE"/>
          </svg>
          <span>Figma Contributions</span>
        </div>
        <span className="embed-subtitle">
          {activity ? `${Object.values(activity.dailyTotals).reduce((a, b) => a + b, 0)} edits in the last year` : ''}
        </span>
      </div>

      <Heatmap data={activity?.dailyTotals ?? {}} />
    </div>
  );
}

// Reusing Heatmap logic for now (can be refactored into a shared component)
function Heatmap({ data }: { data: Record<string, number> }) {
  const today = startOfToday();
  const startDate = subDays(today, 364);
  const days = eachDayOfInterval({ start: startDate, end: today });

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  days.forEach((day) => {
    if (day.getDay() === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const getLevel = (count: number) => {
    if (!count) return 0;
    if (count < 5) return 1;
    if (count < 10) return 2;
    if (count < 20) return 3;
    return 4;
  };

  return (
    <div className="heatmap-wrap" style={{ padding: '0' }}>
      <div className="heatmap-grid-wrap">
        <div className="heatmap-days">
          <span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>
        </div>
        <div className="heatmap-grid">
          {weeks.map((week, wi) => (
            <div className="heatmap-col" key={wi}>
              {week.map((day, di) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const count = data[dateKey] || 0;
                return (
                  <div 
                    key={di} 
                    className="hm-cell" 
                    data-level={getLevel(count)}
                    title={`${count} edits on ${format(day, 'MMM d, yyyy')}`}
                    style={{ width: '10px', height: '10px' }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-footer" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        <div className="heatmap-legend" style={{ padding: '0' }}>
          <span>Less</span>
          <div className="legend-box" data-level="0" />
          <div className="legend-box" data-level="1" />
          <div className="legend-box" data-level="2" />
          <div className="legend-box" data-level="3" />
          <div className="legend-box" data-level="4" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
