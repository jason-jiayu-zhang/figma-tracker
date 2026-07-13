const EventEmitter = require("events");
const axios = require("axios");
const supabase = require("../supabaseClient");
const figma = require("../figmaService");
const { runSyncAfterDelay } = require("../syncService");
const { encrypt } = require("../tokenCrypto");

class OnboardingWorker extends EventEmitter {}
const worker = new OnboardingWorker();

// Background task: Fetch Figma User Profile and complete DB upsert.
// NOTE: The primary OAuth path now performs this synchronously in the callback
// (so the session cookie can be set). This handler is kept for any other caller.
worker.on("fetch_user_profile", async ({ access_token, refresh_token, scope, expiresAt, stateMetadata }) => {
  try {
    console.log("[onboardingWorker] Fetching user profile async...");
    const meRes = await axios.get("https://api.figma.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const user = meRes.data;
    console.log("[onboardingWorker] User profile fetched:", user?.id);

    const { data: userRow, error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          figma_user_id: user?.id,
          handle: user?.handle || user?.name || null,
          display_name: user?.handle || user?.name || null,
          email: user?.email || null,
          img_url: user?.img_url || null,
          access_token: encrypt(access_token),
          refresh_token: encrypt(refresh_token || null),
          scopes: scope || null,
          token_expires_at: expiresAt,
        },
        { onConflict: "figma_user_id" },
      )
      .select("id")
      .single();

    if (upsertError) {
      console.error("[onboardingWorker] Supabase error upserting user:", upsertError.message);
    } else {
      console.log("[onboardingWorker] User profile saved successfully.");
      // If there were file keys passed during OAuth start, trigger file metadata sync
      if (stateMetadata?.fileKeys) {
        const fileKeys = stateMetadata.fileKeys.split(",").filter(Boolean);
        if (fileKeys.length > 0) {
          console.log("[onboardingWorker] Seeding files requested during OAuth:", fileKeys);
          fileKeys.forEach((fileKey) =>
            worker.emit("fetch_file_metadata", { fileKey, access_token, userId: userRow?.id }),
          );
        }
      }
    }
  } catch (err) {
    console.error("[onboardingWorker] Background user profile fetch failed:", err.message);
  }
});

// Background task: Fetch File Metadata and add to tracking for a specific owner.
worker.on("fetch_file_metadata", async ({ fileKey, access_token, userId }) => {
  try {
    console.log(`[onboardingWorker] Fetching metadata for file ${fileKey} (owner ${userId})...`);
    const meta = await figma.getFileMeta(fileKey, access_token);

    const { error: upsertErr } = await supabase
      .from("figma_files")
      .upsert(
        {
          owner_user_id: userId || null,
          file_key: fileKey,
          name: meta.name,
          thumbnail_url: meta.thumbnailUrl,
          last_modified: meta.lastModified,
          updated_at: new Date().toISOString(),
          sync_completed: false,
        },
        { onConflict: "owner_user_id,file_key" },
      );

    if (upsertErr) throw upsertErr;
    console.log(`[onboardingWorker] File metadata for ${fileKey} saved successfully.`);

    // Trigger history sync
    runSyncAfterDelay(100);
  } catch (err) {
    console.error(`[onboardingWorker] File metadata fetch failed for ${fileKey}:`, err.message);
  }
});

module.exports = worker;
