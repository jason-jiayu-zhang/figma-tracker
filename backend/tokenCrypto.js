const crypto = require("crypto");

// Encrypt Figma OAuth tokens at rest (AES-256-GCM). The stored format is
//   enc:v1:<iv>:<authTag>:<ciphertext>   (each part base64)

const PREFIX = "enc:v1:";

const RAW_KEY = process.env.TOKEN_ENCRYPTION_KEY;
if (!RAW_KEY || RAW_KEY.length < 32) {
  throw new Error(
    "TOKEN_ENCRYPTION_KEY must be set to a random string of at least 32 characters. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
}
// Normalize any-length secret into a 32-byte key.
const KEY = crypto.createHash("sha256").update(RAW_KEY).digest();

function encrypt(plaintext) {
  if (plaintext == null) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map((b) => b.toString("base64")).join(":");
}

function decrypt(value) {
  if (value == null) return value;
  // Anything not in the enc:v1: format is unusable, not plaintext to pass along:
  // every stored token was migrated, so a bare string here means corruption.
  if (typeof value !== "string" || !value.startsWith(PREFIX)) {
    console.error("[tokenCrypto] Refusing to use a token that is not enc:v1-encrypted");
    return null;
  }
  try {
    const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(":");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ct = Buffer.from(ctB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch (err) {
    console.error("[tokenCrypto] Failed to decrypt token:", err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
