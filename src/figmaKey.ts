/* Shared by the onboarding file list and the Files-page "Track a new file"
   modal so a link that's recognized in one place is recognized in the other.
   Accepts a full Figma link (…/design/KEY/…, /file/, /proto/, /board/) and
   returns the bare key; anything else passes straight through so a raw key
   still works. */
export function extractFileKey(input: string): string {
  const val = input.trim();
  const m = val.match(/figma\.com\/(?:file|design|proto|board)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : val;
}
