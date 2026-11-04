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
export type AnalyticsConsent = 'granted' | 'denied' | 'unset';
const CONSENT_KEY = 'ft_analytics_consent';
const listeners = new Set<() => void>();
let pendingUser: { id: string; props?: Record<string, unknown> } | null = null;

export function getConsent(): AnalyticsConsent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : 'unset';
  } catch {
    return 'unset';
  }
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
  try { localStorage.setItem(CONSENT_KEY, v); } catch { /* ignore */ }
  applyConsent();
  listeners.forEach((l) => l());
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (isEmbedContext()) return;
  pendingUser = { id, props };
  if (getConsent() === 'granted') applyConsent();
}

export function resetUser() {
  pendingUser = null;
  posthog.reset();
  posthog.set_config({ persistence: 'memory' });
}

export default posthog;
