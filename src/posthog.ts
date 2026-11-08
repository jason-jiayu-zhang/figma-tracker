import posthog from 'posthog-js';

// Get keys from Vite environment variables or use fallback defaults
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || 'phc_rEc8CArya56G5Ypb5bkHRfd5ckigmbn9tx6JLnSRYuFB';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Privacy model (see Privacy page):
//  - Anonymous visitors, public pages and embeds: `memory` persistence. No
//    cookie, no localStorage; the ID lives only for the current page load, so
//    no consent banner is needed.
//  - Signed-in dashboard users: upgraded to cookie + localStorage persistence
//    after login *and* opt-in (see `setConsent` / AnalyticsNotice).
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  person_profiles: 'identified_only',
  persistence: 'memory',
  autocapture: false,
});

// Never persist anything for embed viewers, even if they happen to be signed in.
function isEmbedContext(): boolean {
  try {
    return (
      window.location.pathname.startsWith('/embed-widget') ||
      window.self !== window.top
    );
  } catch {
    return true; // cross-origin top access throws => we're framed
  }
}

// Signed-in users choose whether we store the analytics cookie. Until they
// answer ("unset") or if they decline, we stay on in-memory persistence and
// don't tie events to their account.
// The choice is stored per account, so a second account signing in on the same
// browser is asked for itself instead of inheriting the first account's answer.
export type AnalyticsConsent = 'granted' | 'denied' | 'unset';
const LEGACY_CONSENT_KEY = 'ft_analytics_consent';
const consentKey = (id: string) => `ft_analytics_consent:${id}`;
const listeners = new Set<() => void>();
let pendingUser: { id: string; props?: Record<string, unknown> } | null = null;

export function getConsent(): AnalyticsConsent {
  if (!pendingUser) return 'unset';
  try {
    const v = localStorage.getItem(consentKey(pendingUser.id));
    return v === 'granted' || v === 'denied' ? v : 'unset';
  } catch {
    return 'unset';
  }
}

// One-time migration: the old browser-wide answer belongs to whichever account
// signs in first after this change; it is then removed so nobody else inherits it.
function migrateLegacyConsent(id: string) {
  try {
    const legacy = localStorage.getItem(LEGACY_CONSENT_KEY);
    if (legacy === null) return;
    if (localStorage.getItem(consentKey(id)) === null) localStorage.setItem(consentKey(id), legacy);
    localStorage.removeItem(LEGACY_CONSENT_KEY);
  } catch { /* ignore */ }
}

export function subscribeConsent(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function applyConsent() {
  if (getConsent() === 'granted' && pendingUser) {
    posthog.set_config({ persistence: 'localStorage+cookie' });
    posthog.identify(pendingUser.id, pendingUser.props);
  } else {
    posthog.reset();
    posthog.set_config({ persistence: 'memory' });
  }
}

export function setConsent(v: 'granted' | 'denied') {
  if (!pendingUser) return;
  try { localStorage.setItem(consentKey(pendingUser.id), v); } catch { /* ignore */ }
  applyConsent();
  listeners.forEach((l) => l());
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (isEmbedContext()) return;
  migrateLegacyConsent(id);
  pendingUser = { id, props };
  if (getConsent() === 'granted') applyConsent();
  listeners.forEach((l) => l());
}

export function resetUser() {
  pendingUser = null;
  posthog.reset();
  posthog.set_config({ persistence: 'memory' });
  listeners.forEach((l) => l());
}

export default posthog;
