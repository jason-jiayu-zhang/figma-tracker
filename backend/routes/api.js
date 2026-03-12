const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { runSync, runSyncAfterDelay } = require('../syncService');

// POST /api/webhook — triggered by Figma
router.post('/webhook', async (req, res) => {
  console.log('[webhook] Received Figma notification');
  // Figma sends a 'passcode' or we can check 'event_type'
  // For now, just trigger a delayed sync on any hit
  runSyncAfterDelay(30000); 
  res.status(200).send('OK');
});

// Helper: get the first stored Figma user ID (the tracked user)
async function getMyUserId() {
  const { data } = await supabase
    .from('users')
    .select('figma_user_id')
    .limit(1)
    .maybeSingle();
  return data ? data.figma_user_id : null;
}

// POST /api/sync — trigger a manual sync
router.post('/sync', async (req, res) => {
  try {
    const result = await runSync();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/stats — high-level summary (?mine=true to filter to authenticated user)
router.get('/stats', async (req, res) => {
  try {
    const mine = req.query.mine === 'true';
    const myId = mine ? await getMyUserId() : null;
    const today = new Date().toISOString().slice(0, 10);

    let versionsQuery = supabase.from('file_versions').select('id', { count: 'exact', head: true });
    if (mine && myId) versionsQuery = versionsQuery.eq('created_by_figma_user_id', myId);

    // Edits today: query file_versions directly so mine filter works consistently
    let todayQuery = supabase.from('file_versions').select('id', { count: 'exact', head: true }).eq('created_at::date', today);
    // Use date range instead of cast for compatibility
    const todayStart = today + 'T00:00:00.000Z';
    const todayEnd = today + 'T23:59:59.999Z';
    let todayQ = supabase.from('file_versions').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart).lte('created_at', todayEnd);
    if (mine && myId) todayQ = todayQ.eq('created_by_figma_user_id', myId);

    const [filesRes, versionsRes, sessionRes, todayRes] = await Promise.all([
      supabase.from('figma_files').select('id', { count: 'exact', head: true }),
      versionsQuery,
      supabase
        .from('sync_sessions')
        .select('synced_at, status')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      todayQ
    ]);

    res.json({
      filesTracked: filesRes.count || 0,
      totalVersions: versionsRes.count || 0,
      editsToday: todayRes.count || 0,
      lastSync: sessionRes.data ? sessionRes.data.synced_at : null,
      lastSyncStatus: sessionRes.data ? sessionRes.data.status : null,
      filterMine: mine,
      myFigmaUserId: myId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files — all tracked files with version counts (?mine=true)
router.get('/files', async (req, res) => {
  try {
    const mine = req.query.mine === 'true';
    const myId = mine ? await getMyUserId() : null;

    const { data: files, error } = await supabase
      .from('figma_files')
      .select(`
        id, file_key, name, thumbnail_url, last_modified, updated_at, project_name,
        teams ( name )
      `)
      .order('last_modified', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Get version count per file, optionally filtered to current user
    let countQuery = supabase.from('file_versions').select('file_id, created_by_figma_user_id');
    if (mine && myId) countQuery = countQuery.eq('created_by_figma_user_id', myId);
    const { data: counts } = await countQuery;

    const countMap = {};
    for (const r of counts || []) {
      countMap[r.file_id] = (countMap[r.file_id] || 0) + 1;
    }

    const result = (files || []).map((f) => ({
      ...f,
      teamName: f.teams ? f.teams.name : null,
      versionCount: countMap[f.id] || 0
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/versions/:fileKey — version timeline (?mine=true to filter by author)
router.get('/versions/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const mine = req.query.mine === 'true';
    const myId = mine ? await getMyUserId() : null;

    const { data: fileRow, error: fErr } = await supabase
      .from('figma_files')
      .select('id, name')
      .eq('file_key', fileKey)
      .maybeSingle();

    if (fErr || !fileRow) {
      return res.status(404).json({ error: 'File not found. Run a sync first.' });
    }

    let query = supabase
      .from('file_versions')
      .select('version_id, label, description, created_at, created_by_handle, created_by_figma_user_id')
      .eq('file_id', fileRow.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (mine && myId) query = query.eq('created_by_figma_user_id', myId);

    const { data: versions, error: vErr } = await query;
    if (vErr) return res.status(500).json({ error: vErr.message });

    res.json({ fileName: fileRow.name, fileKey, filterMine: mine, versions: versions || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity?days=90&mine=true — daily edit counts
// When mine=true, queries file_versions directly (filtered by user) instead of the aggregate table
router.get('/activity', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 365;
    const mine = req.query.mine === 'true';
    const myId = mine ? await getMyUserId() : null;

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    let rows = [];
    if (mine && myId) {
      // Query raw file_versions so we can filter by author
      const { data: vRows, error: vErr } = await supabase
        .from('file_versions')
        .select('created_at, file_id, figma_files!inner( file_key, name )')
        .eq('created_by_figma_user_id', myId)
        .gte('created_at', sinceStr + 'T00:00:00.000Z');

      if (vErr) return res.status(500).json({ error: vErr.message });

      // Group by date + file
      const grouped = {};
      for (const v of vRows || []) {
        const date = v.created_at.slice(0, 10);
        const key = `${date}__${v.file_id}`;
        if (!grouped[key]) grouped[key] = { activity_date: date, version_count: 0, figma_files: v.figma_files };
        grouped[key].version_count++;
      }
      rows = Object.values(grouped).sort((a, b) => b.activity_date.localeCompare(a.activity_date));
    } else {
      // Use pre-aggregated table for all-user view
      const { data, error } = await supabase
        .from('daily_activity')
        .select('activity_date, version_count, figma_files ( id, file_key, name )')
        .gte('activity_date', sinceStr)
        .order('activity_date', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      rows = data || [];
    }

    const dailyTotals = {};
    for (const r of rows) {
      dailyTotals[r.activity_date] = (dailyTotals[r.activity_date] || 0) + r.version_count;
    }

    res.json({ rows, dailyTotals, days, filterMine: mine, myFigmaUserId: myId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync-history — last 20 sync sessions
router.get('/sync-history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sync_sessions')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
