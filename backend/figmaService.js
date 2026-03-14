const axios = require("axios");
require("dotenv").config();

const BASE_URL = "https://api.figma.com/v1";

const figmaApi = axios.create({
  baseURL: BASE_URL,
});

/**
 * Creates request config with either OAuth or Personal Access Token
 */
function getHeaders(token = null) {
  const pat = process.env.FIGMA_TOKEN;
  if (token) return { Authorization: `Bearer ${token}` };
  if (pat) return { "X-Figma-Token": pat };
  return {};
}

// Add a small delay between requests to stay within 30 req/min Figma rate limit
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get the authenticated user's profile and team info
 */
async function getMe(token = null) {
  const res = await figmaApi.get("/me", { headers: getHeaders(token) });
  return res.data;
}

/**
 * Get all versions for a file key — handles Figma's 2024 cursor pagination.
 */
async function getFileVersions(fileKey, token = null) {
  const versions = [];
  let beforeCursor = null; 
  let page = 1;

  while (true) {
    const batchData = await getFileVersionsPage(fileKey, beforeCursor, token);
    const { versions: batch, nextCursor } = batchData;
    versions.push(...batch);

    console.log(
      `[figma] Page ${page}: fetched ${batch.length} versions (total: ${versions.length})`,
    );

    if (!nextCursor) break;
    beforeCursor = nextCursor;
    page++;
    await sleep(300);
  }

  return versions;
}

/**
 * Fetch a single page of up to 30 versions for a file.
 * Pass `beforeCursor` (string ID OR pagination object) to get versions older than that point.
 */
async function getFileVersionsPage(fileKey, beforeCursor = null, token = null) {
  let params = {};
  if (typeof beforeCursor === "string") {
    params.before = beforeCursor;
  } else if (beforeCursor && typeof beforeCursor === "object") {
    params = { ...beforeCursor };
  }

  const res = await figmaApi.get(`/files/${fileKey}/versions`, { 
    params,
    headers: getHeaders(token)
  });
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
async function getFileMeta(fileKey, token = null) {
  try {
    const res = await figmaApi.get(`/files/${fileKey}`, {
      params: { depth: 1 },
      headers: getHeaders(token)
    });
    return {
      name: res.data.name,
      lastModified: res.data.lastModified,
      thumbnailUrl: res.data.thumbnailUrl,
      version: res.data.version,
    };
  } catch (err) {
    console.error(`[figma] getFileMeta failed for ${fileKey}:`, err.response?.data || err.message);
    throw err;
  }
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

module.exports = {
  getMe,
  getFileVersions,
  getFileVersionsPage,
  getFileMeta,
  getTeamProjects,
  getProjectFiles,
};
