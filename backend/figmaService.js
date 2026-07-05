const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const BASE_URL = "https://api.figma.com/v1";

const figmaApi = axios.create({
  baseURL: BASE_URL,
});

/**
 * Build auth headers for a Figma API call.
 * Multi-account model: every call MUST use a real per-user OAuth access token.
 * The legacy global FIGMA_TOKEN (PAT) fallback has been removed — callers must
 * resolve and pass the owning user's token (see syncService.getOwnerToken).
 */
function getHeaders(token = null) {
  if (!token) {
    throw new Error(
      "Figma API call requires a per-user OAuth access token; none was provided. " +
        "The legacy FIGMA_TOKEN PAT fallback has been removed.",
    );
  }
  return { Authorization: `Bearer ${token}` };
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
 * Exchange a refresh_token for a fresh access_token.
 * Figma token endpoint: POST https://api.figma.com/v1/oauth/token (grant_type=refresh_token).
 * @returns {{ access_token: string, refresh_token: string|null, expires_in: number }}
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw new Error("refreshAccessToken: missing refresh_token");

  const payload = new URLSearchParams({
    client_id: process.env.FIGMA_CLIENT_ID,
    client_secret: process.env.FIGMA_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await axios.post(
    "https://api.figma.com/v1/oauth/token",
    payload,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    },
  );

  return {
    access_token: res.data.access_token,
    // Figma typically keeps the same refresh_token; pass through if a new one is returned.
    refresh_token: res.data.refresh_token || null,
    expires_in: res.data.expires_in,
  };
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
  }).catch((err) => {
    console.error(`[figma] getFileVersionsPage failed for ${fileKey}:`, {
      status: err.response?.status,
      data: err.response?.data,
    });
    throw err;
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
  refreshAccessToken,
  getFileVersions,
  getFileVersionsPage,
  getFileMeta,
  getTeamProjects,
  getProjectFiles,
};
