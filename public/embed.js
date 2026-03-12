/* ============================================================
   Figma Tracker — Embeddable Contribution Heatmap JS
   Pulls live data from the /api/activity endpoint
   ============================================================ */

(function () {
  // Resolve the API base from the script's own origin, or use a relative path
  const SCRIPT_SRC = document.currentScript?.src || '';
  const API_BASE = SCRIPT_SRC
    ? new URL(SCRIPT_SRC).origin + '/api'
    : '/api';

  // Read query params
  const params = new URLSearchParams(window.location.search);
  const DAYS = parseInt(params.get('days')) || 365;
  const MINE = params.get('mine') !== 'false'; // default true
  const REFRESH_MS = 5 * 60 * 1000; // auto-refresh every 5 minutes

  // ── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadContributions();
    setInterval(loadContributions, REFRESH_MS);
  });

  // ── Load Data ─────────────────────────────────────────────
  async function loadContributions() {
    const grid = document.getElementById('heatmap-grid');
    const subtitle = document.getElementById('embed-subtitle');

    // Show loading on first render
    if (!grid.children.length) {
      grid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div>Loading contributions…</div>';
    }

    try {
      const res = await fetch(`${API_BASE}/activity?days=${DAYS}&mine=${MINE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const { dailyTotals } = data;

      renderHeatmap(dailyTotals);

      const totalEdits = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
      const who = MINE ? 'my' : 'all';
      subtitle.textContent = `${totalEdits} contributions in the last ${DAYS === 365 ? 'year' : DAYS + ' days'}`;
    } catch (err) {
      console.error('[embed] Failed to load contributions:', err);
      subtitle.textContent = 'Unable to load data';
    }
  }

  // ── Render Heatmap ────────────────────────────────────────
  function renderHeatmap(dailyTotals = {}) {
    const grid = document.getElementById('heatmap-grid');
    const monthsEl = document.getElementById('heatmap-months');
    grid.innerHTML = '';
    monthsEl.innerHTML = '';

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (DAYS - 1));
    start.setDate(start.getDate() - start.getDay()); // align to Sunday

    const maxCount = Math.max(...Object.values(dailyTotals), 1);
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
        cell.setAttribute('data-tooltip', `${dateStr}: ${count} edit${count !== 1 ? 's' : ''}`);

        // Track month labels
        if (cursor.getDate() <= 7 && cursor.getMonth() !== currentMonth) {
          currentMonth = cursor.getMonth();
          const span = document.createElement('span');
          span.textContent = cursor.toLocaleString('default', { month: 'short' });
          span.style.position = 'absolute';
          span.style.left = `${colIndex * 14}px`;
          monthsEl.appendChild(span);
        }

        if (cursor > today) cell.style.visibility = 'hidden';
        col.appendChild(cell);
        cursor.setDate(cursor.getDate() + 1);
      }
      grid.appendChild(col);
      colIndex++;
    }
  }
})();
