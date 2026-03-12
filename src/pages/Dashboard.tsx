import React, { useState } from 'react';
import { RefreshCw, X, Clock, FileText, Activity } from 'lucide-react';
import { useFigmaData } from '../useFigmaData';
import { format, subDays, startOfToday, eachDayOfInterval, isSameDay } from 'date-fns';
import { FigmaFile, FigmaVersion } from '../types';

export default function Dashboard() {
  const {
    stats,
    activity,
    files,
    syncHistory,
    loading,
    syncing,
    filterMine,
    setFilterMine,
    triggerSync,
    fetchVersions
  } = useFigmaData();

  const [selectedFile, setSelectedFile] = useState<FigmaFile | null>(null);
  const [versions, setVersions] = useState<FigmaVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const handleFileClick = async (file: FigmaFile) => {
    setSelectedFile(file);
    setLoadingVersions(true);
    const data = await fetchVersions(file.file_key);
    if (data) setVersions(data.versions);
    setLoadingVersions(false);
    
    // Smooth scroll to timeline
    setTimeout(() => {
      document.getElementById('timeline-panel')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const closeTimeline = () => {
    setSelectedFile(null);
    setVersions([]);
  };

  if (loading && !stats) {
    return (
      <div className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div className="stat-label">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <main className="main">
      {/* STATS BAR */}
      <section className="stats-bar">
        <div className="stat-card">
          <span className="stat-value">{stats?.filesTracked ?? '—'}</span>
          <span className="stat-label">Files tracked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.totalVersions ?? '—'}</span>
          <span className="stat-label">Total versions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.editsToday ?? '—'}</span>
          <span className="stat-label">Edits today</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ fontSize: '14px', marginTop: '12px' }}>
            {stats?.lastSync ? format(new Date(stats.lastSync), 'MMM d, h:mm a') : '—'}
          </span>
          <span className="stat-label">Last sync</span>
        </div>
        <div className="stat-actions">
          <button 
            className={`btn-sync ${syncing ? 'spinning' : ''}`} 
            onClick={triggerSync}
            disabled={syncing}
          >
            <RefreshCw size={16} /> {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </section>

      {/* ACTIVITY HEATMAP */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Activity</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="panel-subtitle">
              {activity ? `${Object.values(activity.dailyTotals).reduce((a, b) => a + b, 0)} edits in the last year` : ''}
            </span>
            <div className="toggle-group">
              <button 
                className={`toggle-btn ${filterMine ? 'active' : ''}`} 
                onClick={() => setFilterMine(true)}
              >
                My Edits
              </button>
              <button 
                className={`toggle-btn ${!filterMine ? 'active' : ''}`} 
                onClick={() => setFilterMine(false)}
              >
                All Edits
              </button>
            </div>
          </div>
        </div>
        <Heatmap data={activity?.dailyTotals ?? {}} />
      </section>

      {/* FILES TABLE */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Tracked Files</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Team / Project</th>
                <th>Versions</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id}>
                  <td>
                    <span className="file-name" onClick={() => handleFileClick(file)}>{file.name}</span>
                  </td>
                  <td>
                    <span className="badge">{file.teamName ?? 'No Team'}</span>
                  </td>
                  <td>{file.versionCount}</td>
                  <td>{format(new Date(file.last_modified), 'MMM d, yyyy')}</td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr><td colSpan={4} className="empty-row">No files tracked yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* TIMELINE */}
      {selectedFile && (
        <section className="panel" id="timeline-panel">
          <div className="panel-header">
            <h2 className="panel-title">Version History — {selectedFile.name}</h2>
            <button className="btn-close" onClick={closeTimeline}>
              <X size={14} style={{ marginRight: '4px' }} /> Close
            </button>
          </div>
          <div className="timeline">
            {loadingVersions ? (
              <div className="empty-row">Loading versions...</div>
            ) : versions.length > 0 ? (
              versions.map((v, i) => (
                <div className="timeline-item" key={v.version_id}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-label">{v.label || 'Untitled Version'}</div>
                    {v.description && <div className="timeline-desc">{v.description}</div>}
                    <div className="timeline-meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {format(new Date(v.created_at), 'MMM d, h:mm a')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={12} /> by {v.created_by_handle}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-row">No versions found for this filter.</div>
            )}
          </div>
        </section>
      )}

      {/* SYNC HISTORY */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Sync History</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Files Synced</th>
                <th>New Versions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {syncHistory.map(sync => (
                <tr key={sync.id}>
                  <td>{format(new Date(sync.synced_at), 'MMM d, h:mm a')}</td>
                  <td>{sync.files_synced}</td>
                  <td>{sync.new_versions_found}</td>
                  <td>
                    <span className={`badge`} style={{ color: sync.status === 'success' ? 'var(--green)' : 'var(--red)' }}>
                      {sync.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {syncHistory.length === 0 && (
                <tr><td colSpan={4} className="empty-row">No sync history yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Heatmap({ data }: { data: Record<string, number> }) {
  // Generate 52 weeks of dates
  const today = startOfToday();
  const startDate = subDays(today, 364);
  const days = eachDayOfInterval({ start: startDate, end: today });

  // Group days into weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  // Pivot to start on Sunday for GitHub style
  const startOffset = startDate.getDay();
  for (let i = 0; i < startOffset; i++) {
    // currentWeek.push(null); // Not needed for simple grid
  }

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
    <div className="heatmap-wrap">
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
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="legend-box" data-level="0" />
        <div className="legend-box" data-level="1" />
        <div className="legend-box" data-level="2" />
        <div className="legend-box" data-level="3" />
        <div className="legend-box" data-level="4" />
        <span>More</span>
      </div>
    </div>
  );
}
