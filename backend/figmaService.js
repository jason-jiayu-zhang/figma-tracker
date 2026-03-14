const axios = require("axios");
require("dotenv").config();

const BASE_URL = "https://api.figma.com/v1";

const figmaApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "X-Figma-Token": process.env.FIGMA_TOKEN,
  },
});

// Add a small delay between requests to stay within 30 req/min Figma rate limit
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get the authenticated user's profile and team info
 */
async function getMe() {
  const res = await figmaApi.get("/me");
  return res.data;
}

/**
 * Get all versions for a file key — handles Figma's 2024 cursor pagination.
 */
async function getFileVersions(fileKey) {
  const versions = [];
  let beforeCursor = null; // Can be a string or an object { before, secondary_before, etc }
  let page = 1;

  while (true) {
    const { versions: batch, nextCursor } = await getFileVersionsPage(
      fileKey,
      beforeCursor,
    );
    versions.push(...batch);

    console.log(
      `[figma] Page ${page}: fetched ${batch.length} versions (total: ${versions.length})`,
    );

    if (!nextCursor) break;
    beforeCursor = nextCursor;
    page++;
    await sleep(300); // stay under Figma's 30 req/min rate limit
  }

  return versions;
}

/**
 * Fetch a single page of up to 30 versions for a file.
 * Pass `beforeCursor` (string ID OR pagination object) to get versions older than that point.
 */
async function getFileVersionsPage(fileKey, beforeCursor = null) {
  // beforeCursor can be a simple string (the legacy version ID)
  // or an object { before, secondary_before, etc }
  let params = {};
  if (typeof beforeCursor === "string") {
    params.before = beforeCursor;
  } else if (beforeCursor && typeof beforeCursor === "object") {
    params = { ...beforeCursor };
  }

  const res = await figmaApi.get(`/files/${fileKey}/versions`, { params });
  const data = res.data;
  const versions = data.versions || [];

  // Page summary log
  console.log(`[figma] ${fileKey} — batch size: ${versions.length}`);

  // Resolve next cursor from Figma's 2024 pagination format
  // NOTE: next_page can contain unencoded spaces in date strings, so new URL() might fail
  const pagination = data.pagination || {};
  let nextCursor = null;

  if (pagination.next_page) {
    // Robustly extract all query params using regex since new URL() fails on spaces
    const queryStr = pagination.next_page.split("?")[1];
    if (queryStr) {
      nextCursor = {};
      const pairs = queryStr.split("&");
      for (const pair of pairs) {
        const [k, v] = pair.split("=");
        if (k && v) {
          // Decode URL component but handle spaces which might not be + or %20
          nextCursor[k] = decodeURIComponent(v.replace(/\+/g, " "));
        }
      }
    }
  } else if (pagination.before) {
    nextCursor = pagination.before;
  }

  return { versions, nextCursor };
}

/**
 * Get file metadata (name, lastModified, thumbnailUrl)
 */
async function getFileMeta(fileKey) {
  const res = await figmaApi.get(`/files/${fileKey}`, {
    params: { depth: 1 },
  });
  return {
    name: res.data.name,
    lastModified: res.data.lastModified,
    thumbnailUrl: res.data.thumbnailUrl,
    version: res.data.version,
  };
}

/**
 * Get projects for a team
 */
async function getTeamProjects(teamId) {
  await sleep(200);
  const res = await figmaApi.get(`/teams/${teamId}/projects`);
  return res.data.projects || [];
}

/**
 * Get files in a project
 */
async function getProjectFiles(projectId) {
  await sleep(200);
  const res = await figmaApi.get(`/projects/${projectId}/files`);
  return res.data.files || [];
}

/**
 * Get teams the authenticated user is a member of.
 * Note: Figma's API surface can vary; this tries the common /teams endpoint
 * and falls back gracefully if unavailable.
 */
async function getMyTeams() {
  await sleep(200);
  try {
    const res = await figmaApi.get(`/teams`);
    return res.data.teams || [];
  } catch (err) {
    // Some tokens/orgs may not have this endpoint available; return empty list
    console.warn("[figma] getMyTeams failed:", err.message);
    return [];
  }
}

/**
 * Best-effort: get files owned by a user.
 * Tries a few different Figma API endpoints / patterns and falls back gracefully.
 */
async function getUserFiles(userId) {
  await sleep(200);
  // Try direct user files endpoint
  try {
    const res = await figmaApi.get(`/users/${userId}/files`);
    if (res.data && res.data.files) return res.data.files;
  } catch (err) {
    // ignore and try other methods
  }

  // Try files query by owner
  try {
    const res = await figmaApi.get(`/files`, { params: { owner: userId } });
    if (res.data && res.data.files) return res.data.files;
  } catch (err) {
    // ignore
  }

  // Try search endpoint (best-effort): attempt queries that some tokens support
  try {
    const res = await figmaApi.get(`/search`, {
      params: { query: `owner:${userId}`, types: "files" },
    });
    if (res.data && res.data.files) return res.data.files;
  } catch (err) {
    // ignore
  }

  console.warn(`[figma] getUserFiles: no files discovered for user ${userId}`);
  return [];
}

module.exports = {
  getMe,
  getFileVersions,
  getFileVersionsPage,
  getFileMeta,
  getTeamProjects,
  getProjectFiles,
  getMyTeams,
};

