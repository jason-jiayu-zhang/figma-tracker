// Backfill: encrypt legacy plaintext Figma OAuth tokens at rest.
//
// Token encryption only kicks in on the next token write (refresh/re-auth), so
// rows created before the feature — or users who haven't triggered a write —
// still hold plaintext access_token / refresh_token. This re-encrypts those.
//
// Usage: node backend/scripts/encryptExistingTokens.js [--dry-run]
//
// Idempotent: values already prefixed with enc:v1: are skipped, so it is safe
// to re-run.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const supabase = require("../supabaseClient");
const { encrypt } = require("../tokenCrypto");

const PREFIX = "enc:v1:";
const DRY_RUN = process.argv.includes("--dry-run");

function needsEncryption(value) {
  return typeof value === "string" && value.length > 0 && !value.startsWith(PREFIX);
}

async function main() {
  if (DRY_RUN) console.log("[encryptExistingTokens] DRY RUN — no writes will be made.");

  const { data: rows, error } = await supabase
    .from("users")
    .select("id, access_token, refresh_token");

  if (error) {
    console.error("[encryptExistingTokens] Failed to fetch users:", error.message);
    process.exit(1);
  }

  let skipped = 0;
  let updated = 0;
  let errored = 0;

  for (const row of rows) {
    const update = {};
    if (needsEncryption(row.access_token)) update.access_token = encrypt(row.access_token);
    if (needsEncryption(row.refresh_token)) update.refresh_token = encrypt(row.refresh_token);

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[encryptExistingTokens] Would update ${row.id}: ${Object.keys(update).join(", ")}`);
      updated++;
      continue;
    }

    const { error: updateError } = await supabase.from("users").update(update).eq("id", row.id);
    if (updateError) {
      console.error(`[encryptExistingTokens] Failed to update ${row.id}:`, updateError.message);
      errored++;
      continue;
    }
    updated++;
  }

  console.log(
    `[encryptExistingTokens] Done. total=${rows.length} alreadyEncrypted=${skipped} updated=${updated} errored=${errored}`,
  );
  process.exit(errored > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[encryptExistingTokens] Fatal error:", err.message);
  process.exit(1);
});
