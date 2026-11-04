// Dashboard timezone preference. Stored per-browser (like Studio's editor state);
// when unset we follow the browser, which is what the heatmap's local days assume.
const KEY = "ft_timezone_v1";

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  } catch {
    return "America/Los_Angeles";
  }
}

/** The user's saved override, or null to follow the browser. */
export function getSavedTimezone(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveTimezone(tz: string | null) {
  try {
    if (tz) localStorage.setItem(KEY, tz);
    else localStorage.removeItem(KEY);
  } catch {
    // private mode / quota — the preference just won't persist
  }
}

/** The timezone the dashboard should bucket activity in. */
export function getTimezone(): string {
  return getSavedTimezone() || browserTimezone();
}

export function allTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (fn) return fn("timeZone");
  } catch {
    /* fall through */
  }
  return [browserTimezone()];
}
