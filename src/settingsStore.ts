// Studio editor state is persisted per widget under a versioned key so a reload
// keeps the design the user built. Bump the version in the key when a stored
// field changes meaning, so stale shapes are dropped instead of half-restored.

export function readSettings<T>(key: string): Partial<T> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function writeSettings<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode / quota — settings just don't persist
  }
}
