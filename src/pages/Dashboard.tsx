import React, { useState } from 'react';
import { RefreshCw, X, Clock, FileText, Activity, Layers, GitCommit, Zap, RotateCcw } from 'lucide-react';
import { useFigmaData } from '../useFigmaData';
import { format, subDays, startOfToday, eachDayOfInterval } from 'date-fns';
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[var(--text-muted)] uppercase tracking-[0.12em] font-semibold">Loading Dashboard</span>
        </div>
      </div>
    );
  }

  const totalEdits = activity ? Object.values(activity.dailyTotals).reduce((a, b) => a + b, 0) : 0;

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-8 flex flex-col gap-6">

      {/* STATS BAR */}
      <section className="grid grid-cols-4 gap-4">
        <StatCard
          value={stats?.filesTracked ?? '—'}
          label="Files Tracked"
          icon={<Layers size={16} />}
          color="var(--accent)"
        />
        <StatCard
          value={stats?.totalVersions ?? '—'}
          label="Total Versions"
          icon={<GitCommit size={16} />}
          color="var(--purple)"
        />
        <StatCard
          value={stats?.editsToday ?? '—'}
          label="Edits Today"
          icon={<Zap size={16} />}
          color="var(--green)"
        />
        <StatCard
          value={stats?.lastSync ? format(new Date(stats.lastSync), 'MMM d, h:mm a') : '—'}
          label="Last Sync"
          icon={<RotateCcw size={16} />}
          color="var(--blue)"
          small
        />
      </section>

      {/* ACTIVITY HEATMAP */}
      <section className="card overflow-hidden">
        <div className="section-header">
          <div className="flex items-center gap-2.5">
            <div className="section-icon" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>
              <Activity size={14} />
            </div>
            <h2 className="section-title">Activity</h2>
            <span className="badge">{totalEdits} edits · last year</span>
          </div>
          <div className="flex items-center gap-3">
            <ToggleGroup
              value={filterMine}
              onChange={setFilterMine}
              options={[
                { label: 'My Edits', value: true },
                { label: 'All Edits', value: false },
              ]}
            />
            <button
              className={`btn-primary ${syncing ? 'spinning' : ''}`}
              onClick={triggerSync}
              disabled={syncing}
            >
              <RefreshCw size={14} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
        </div>
        <Heatmap data={activity?.dailyTotals ?? {}} />
      </section>

      {/* FILES TABLE */}
      <section className="card overflow-hidden">
        <div className="section-header">
          <div className="flex items-center gap-2.5">
            <div className="section-icon" style={{ background: 'rgba(162,89,255,0.15)', color: 'var(--purple)' }}>
              <FileText size={14} />
            </div>
            <h2 className="section-title">Tracked Files</h2>
            {files.length > 0 && <span className="badge">{files.length} file{files.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
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
              {files.map((file, i) => (
                <tr key={file.id} className={i % 2 === 0 ? 'row-even' : ''}>
                  <td>
                    <button className="file-link" onClick={() => handleFileClick(file)}>
                      {file.name}
                    </button>
                  </td>
                  <td>
                    <span className="chip">{file.teamName ?? 'No Team'}</span>
                  </td>
                  <td className="tabular-nums">{file.versionCount}</td>
                  <td className="text-[var(--text-muted)]">{format(new Date(file.last_modified), 'MMM d, yyyy')}</td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">No files tracked yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* TIMELINE */}
      {selectedFile && (
        <section className="card overflow-hidden" id="timeline-panel">
          <div className="section-header">
            <div className="flex items-center gap-2.5">
              <div className="section-icon" style={{ background: 'rgba(26,188,254,0.15)', color: 'var(--blue)' }}>
                <Clock size={14} />
              </div>
              <h2 className="section-title">Version History</h2>
              <span className="badge">{selectedFile.name}</span>
            </div>
            <button className="btn-ghost" onClick={closeTimeline}>
              <X size={14} /> Close
            </button>
          </div>
          <div className="p-6">
            {loadingVersions ? (
              <div className="empty-state">Loading versions…</div>
            ) : versions.length > 0 ? (
              <div className="flex flex-col">
                {versions.map((v, i) => (
                  <div className="timeline-entry" key={v.version_id}>
                    <div className="timeline-line" style={{ opacity: i < versions.length - 1 ? 1 : 0 }} />
                    <div className="timeline-dot" />
                    <div className="flex-1 pb-6">
                      <div className="font-semibold text-[15px] mb-1">{v.label || 'Untitled Version'}</div>
                      {v.description && <div className="text-[var(--text-muted)] text-sm leading-relaxed mb-2">{v.description}</div>}
                      <div className="flex gap-4 text-[11px] text-[var(--text-muted)] font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} /> {format(new Date(v.created_at), 'MMM d, h:mm a')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileText size={11} /> {v.created_by_handle}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No versions found for this filter.</div>
            )}
          </div>
        </section>
      )}

      {/* SYNC HISTORY */}
      <section className="card overflow-hidden">
        <div className="section-header">
          <div className="flex items-center gap-2.5">
            <div className="section-icon" style={{ background: 'rgba(10,207,131,0.15)', color: 'var(--green)' }}>
              <Activity size={14} />
            </div>
            <h2 className="section-title">Sync History</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
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
              {syncHistory.map((sync, i) => (
                <tr key={sync.id} className={i % 2 === 0 ? 'row-even' : ''}>
                  <td>{format(new Date(sync.synced_at), 'MMM d, h:mm a')}</td>
                  <td className="tabular-nums">{sync.files_synced}</td>
                  <td className="tabular-nums">{sync.new_versions_found}</td>
                  <td>
                    <span
                      className="status-chip"
                      style={{ color: sync.status === 'success' ? 'var(--green)' : 'var(--red)', background: sync.status === 'success' ? 'rgba(10,207,131,0.1)' : 'rgba(239,68,68,0.1)' }}
                    >
                      {sync.status === 'success' ? '✓' : '✗'} {sync.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {syncHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">No sync history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </main>
  );
}

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({ value, label, icon, color, small }: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="stat-card" style={{ '--card-accent': color } as React.CSSProperties}>
      <div className="stat-card-icon" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
        {icon}
      </div>
      <div className={`stat-value ${small ? 'text-xl' : 'text-[36px]'}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ── Toggle Group ──────────────────────────────────────── */
function ToggleGroup<T>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div className="toggle-group">
      {options.map(opt => (
        <button
          key={String(opt.value)}
          className={`toggle-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Heatmap ───────────────────────────────────────────── */
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
    if (count < 3) return 1;
    if (count < 6) return 2;
    if (count < 10) return 3;
    return 4;
  };

  const monthLabels: { label: string; index: number }[] = [];
  weeks.forEach((week, i) => {
    const firstDay = week[0];
    if (firstDay && firstDay.getDate() <= 7) {
      const label = format(firstDay, 'MMM');
      if (!monthLabels.find(m => m.label === label)) {
        monthLabels.push({ label, index: i });
      }
    }
  });

  const cellColors = ['rgba(255,255,255,0.07)', 'var(--green)', 'var(--blue)', 'var(--purple)', 'var(--red)'];

  return (
    <div className="px-6 pb-6 pt-2 overflow-x-auto">
      {/* Month labels */}
      <div className="relative mb-1.5 ml-7 h-4 text-[10px] text-[var(--text-muted)]">
        {monthLabels.map((m, i) => (
          <span key={i} className="absolute" style={{ left: `${m.index * 13}px` }}>{m.label}</span>
        ))}
      </div>
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 text-[10px] text-[var(--text-muted)] w-7 pt-0.5 leading-[12px]">
          <span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>
        </div>
        {/* Grid */}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div className="flex flex-col gap-1" key={wi}>
              {week.map((day, di) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const count = data[dateKey] || 0;
                const level = getLevel(count);
                return (
                  <div
                    key={di}
                    className="w-3 h-3 rounded-[2px] transition-all duration-150 hover:scale-125 hover:z-10 cursor-default"
                    style={{ backgroundColor: cellColors[level] }}
                    title={`${count} edits on ${format(day, 'MMM d, yyyy')}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex justify-end gap-1.5 items-center text-[11px] text-[var(--text-muted)]">
        <span>Less</span>
        {cellColors.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
