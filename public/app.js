/* ============================================================
   Figma Tracker — Frontend App Logic
   ============================================================ */

const API = 'http://localhost:3001/api';
let filterMine = true; // default: show only the authenticated user's edits

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadActivity();
  loadFiles();
  loadSyncHistory();
  loadUserInfo();
});

// ── Filter toggle ──────────────────────────────────────────────
function setFilter(mine) {
  filterMine = mine;
  document.getElementById('btn-mine').classList.toggle('active', mine);
  document.getElementById('btn-all').classList.toggle('active', !mine);
  // Reload all filter-sensitive data
  loadStats();
  loadActivity();
  loadFiles();
  // Close timeline if open so it doesn't show stale data
  document.getElementById('timeline-panel').style.display = 'none';
}

// ── User Info from sync_sessions / users table via stats ──────
async function loadUserInfo() {
  try {
    const files = await fetchJSON(`${API}/files`);
    // User info isn't stored in stats, show generic info
    const handle = document.getElementById('user-handle');
    const avatar = document.getElementById('user-avatar');
    if (files && files.length > 0) {
      // No user endpoint exposed; just leave as-is until first sync
    }
    // Pull avatar src from first version's author if available
    const firstVersionsRes = await fetchJSON(`${API}/versions/${files[0]?.file_key}`).catch(() => null);
    if (firstVersionsRes && firstVersionsRes.versions && firstVersionsRes.versions.length > 0) {
      const author = firstVersionsRes.versions[0].created_by_handle;
      if (author) handle.textContent = author;
    }
  } catch (_) {
    // silent fail — user info is a nice-to-have
  }
}

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await fetchJSON(`${API}/stats?mine=${filterMine}`);
    document.getElementById('stat-files').textContent = data.filesTracked ?? '—';
    document.getElementById('stat-versions').textContent = data.totalVersions ?? '—';
    document.getElementById('stat-today').textContent = data.editsToday ?? '—';
    document.getElementById('stat-last-sync').textContent =
      data.lastSync ? timeAgo(data.lastSync) : 'Never';
  } catch (err) {
    console.error('Stats load failed:', err);
  }
}

// ── Activity Heatmap ──────────────────────────────────────────
async function loadActivity() {
  try {
    const data = await fetchJSON(`${API}/activity?days=365&mine=${filterMine}`);
    const { dailyTotals } = data;
    renderHeatmap(dailyTotals);

    const totalEdits = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
    const who = filterMine ? 'your' : 'all';
    document.getElementById('heatmap-subtitle').textContent =
      `${totalEdits} version events (${who} edits) in the last year`;
  } catch (err) {
    console.error('Activity load failed:', err);
  }
}

function renderHeatmap(dailyTotals = {}) {
  const grid = document.getElementById('heatmap-grid');
  const monthsEl = document.getElementById('heatmap-months');
  grid.innerHTML = '';
  monthsEl.innerHTML = '';

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // Sunday

  const maxCount = Math.max(...Object.values(dailyTotals), 1);
  const monthLabels = [];
  let currentMonth = -1;
  let colIndex = 0;

  const cursor = new Date(start);
  while (cursor <= today) {
    const col = document.createElement('div');
    col.className = 'heatmap-col';

    for (let day = 0; day < 7; day++) {
      const cell = document.createElement('div');
      cell.className = 'hm-cell';
      const dateStr = cursor.toISOString().slice(0, 10);
      const count = dailyTotals[dateStr] || 0;
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));
      
      cell.setAttribute('data-level', level);
      cell.setAttribute('data-tooltip', `${dateStr}: ${count} version(s)`);

      if (cursor.getDate() <= 7 && cursor.getMonth() !== currentMonth) {
        currentMonth = cursor.getMonth();
        monthLabels.push({ 
          col: colIndex, 
          label: cursor.toLocaleString('default', { month: 'short' }) 
        });
      }

      if (cursor > today) cell.style.visibility = 'hidden';
      col.appendChild(cell);
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.appendChild(col);
    colIndex++;
  }

  // Render month labels with precise column alignment
  // Each column is 13px + 3px gap = 16px
  for (const m of monthLabels) {
    const span = document.createElement('span');
    span.textContent = m.label;
    span.style.position = 'absolute';
    span.style.left = `${m.col * 16}px`;
    monthsEl.appendChild(span);
  }
}

// ── Files Table ───────────────────────────────────────────────
async function loadFiles() {
  const tbody = document.getElementById('files-tbody');
  try {
    const files = await fetchJSON(`${API}/files?mine=${filterMine}`);
    if (!files || files.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No files tracked yet — click <strong>Sync Now</strong> to start.</td></tr>`;
      return;
    }

    tbody.innerHTML = files.map((f) => `
      <tr>
        <td>
          <a class="file-name" onclick="loadTimeline('${f.file_key}', '${escHtml(f.name || f.file_key)}')">${escHtml(f.name || f.file_key)}</a>
          <br/><span class="timestamp" style="font-size:11px;">${f.file_key}</span>
        </td>
        <td>
          ${f.teamName ? `<span class="badge">${escHtml(f.teamName)}</span>` : ''}
          ${f.project_name ? `<span class="badge" style="margin-left:4px;">${escHtml(f.project_name)}</span>` : '<span class="timestamp">—</span>'}
        </td>
        <td><span class="badge-count">${f.versionCount}</span></td>
        <td class="timestamp">${f.last_modified ? formatDate(f.last_modified) : '—'}</td>
        <td>
          <a class="file-name" href="https://www.figma.com/design/${f.file_key}" target="_blank" style="font-size:12px;">Open ↗</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Failed to load files: ${err.message}</td></tr>`;
  }
}

// ── Version Timeline ──────────────────────────────────────────
async function loadTimeline(fileKey, fileName) {
  const panel = document.getElementById('timeline-panel');
  const list = document.getElementById('timeline-list');
  const title = document.getElementById('timeline-file-name');

  panel.style.display = '';
  list.innerHTML = '<div style="padding:20px;color:var(--text-muted)">Loading…</div>';
  title.textContent = `${fileName}${filterMine ? ' · My Edits' : ' · All Edits'}`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const data = await fetchJSON(`${API}/versions/${fileKey}?limit=100&mine=${filterMine}`);
    const { versions } = data;

    if (!versions || versions.length === 0) {
      list.innerHTML = '<div style="padding:20px;color:var(--text-muted)">No versions recorded yet.</div>';
      return;
    }

    list.innerHTML = versions.map((v) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-body">
          <div class="timeline-label">${escHtml(v.label || `Version ${v.version_id}`)}</div>
          ${v.description ? `<div class="timeline-desc">${escHtml(v.description)}</div>` : ''}
          <div class="timeline-meta">
            <span>🕐 ${formatDate(v.created_at)}</span>
            ${v.created_by_handle ? `<span>👤 ${escHtml(v.created_by_handle)}</span>` : ''}
            <span style="font-family:monospace;font-size:10px;color:var(--border);">${v.version_id}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div style="padding:20px;color:var(--red)">Error: ${err.message}</div>`;
  }
}

function closeTimeline() {
  document.getElementById('timeline-panel').style.display = 'none';
}

// ── Sync History ──────────────────────────────────────────────
async function loadSyncHistory() {
  const tbody = document.getElementById('sync-tbody');
  try {
    const sessions = await fetchJSON(`${API}/sync-history`);
    if (!sessions || sessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No syncs yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = sessions.map((s) => `
      <tr>
        <td class="timestamp">${formatDate(s.synced_at)}</td>
        <td>${s.files_synced ?? 0}</td>
        <td>${s.new_versions_found ?? 0}</td>
        <td>
          <span class="badge ${s.status === 'success' ? 'badge-success' : 'badge-error'}">
            ${s.status}
          </span>
          ${s.error_message ? `<span class="timestamp" style="margin-left:8px;">${escHtml(s.error_message)}</span>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">Failed to load sync history.</td></tr>`;
  }
}

// ── Sync Trigger ──────────────────────────────────────────────
async function triggerSync() {
  const btn = document.getElementById('btn-sync');
  btn.disabled = true;
  btn.classList.add('syncing');
  btn.innerHTML = '<span class="sync-icon">↻</span> Syncing…';

  try {
    const result = await fetchJSON(`${API}/sync`, { method: 'POST' });
    showToast(`✓ Sync complete! ${result.new_versions_found} new version(s) found.`, 'success');
    // Reload all data
    await Promise.all([loadStats(), loadActivity(), loadFiles(), loadSyncHistory()]);
  } catch (err) {
    showToast(`✗ Sync failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('syncing');
    btn.innerHTML = '<span class="sync-icon">↻</span> Sync Now';
  }
}

// ── Helpers ───────────────────────────────────────────────────
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 4000);
}
