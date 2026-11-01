import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { ArrowRight, Info } from "lucide-react";
import imgFimanuLogo from "../assets/fimanu-logo.svg";
import Seo from "../components/Seo";
import { useSession } from "../session";

/** True for Safari (desktop + iOS), excluding Chrome/Firefox/Edge/Android —
 *  including their iOS WebKit builds. Safari is the only browser where a
 *  content/ad blocker corrupts Figma's login bundle and crashes the tab
 *  ("reloaded because a problem occurred"), so we gate the pre-flight hint to
 *  it and never tax the majority. */
function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(
    navigator.userAgent,
  );
}

const BTN_BASE =
  "ui-text inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 transition-[background-color,color,transform,border-color] duration-200 ease-out-cubic active:scale-[0.98]";
const BTN_PRIMARY = `${BTN_BASE} bg-ink text-white hover:bg-black`;
const BTN_GHOST = `${BTN_BASE} border border-ink/15 text-ink hover:bg-ink/[0.04]`;

/** The rest of the site. App pages need a Figma session, so signed-out
 *  visitors get sent through OAuth instead of bounced back to this page. */
const PAGES = [
  { label: "Studio", href: "/studio", desc: "Style heatmaps, streaks and breakdowns", app: true },
  { label: "Files", href: "/files", desc: "Choose which Figma files are tracked", app: true },
  { label: "Settings", href: "/settings", desc: "Publishing, account and data", app: true },
  { label: "Docs", href: "/docs", desc: "How to embed your widgets", app: false },
  { label: "About", href: "/about", desc: "What Fimanu is and isn't", app: false },
];

const ROW =
  "group flex items-center justify-between gap-4 py-4 text-left transition-colors duration-200 ease-out-cubic";

export default function Landing() {
  const { loggedIn, loading } = useSession();
  const [showSwitch, setShowSwitch] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);

  // Safari-only pre-flight hint: a content/ad blocker can crash Figma's login
  // page before OAuth even starts. Persisted so it doesn't nag on every visit.
  const safariBrowser = isSafariBrowser();
  const [safariHintDismissed, setSafariHintDismissed] = useState(() => {
    try {
      return localStorage.getItem("ft_safari_hint_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const dismissSafariHint = () => {
    try {
      localStorage.setItem("ft_safari_hint_dismissed", "1");
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
    setSafariHintDismissed(true);
  };

  const startOAuth = () => {
    posthog.capture("onboarding_start_oauth");
    // Timestamped flag so that if the user returns here still logged out (the
    // attempt failed or was aborted), we can prompt them to sign out of Figma
    // and reconnect. Cleared on a confirmed session in session.tsx.
    try {
      localStorage.setItem("ft_oauth_pending", String(Date.now()));
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
    // Navigate directly to the GET endpoint (302 to Figma) so Chrome extensions
    // can't intercept a JS-initiated navigation.
    window.location.href = "/api/oauth/start";
  };

  const dismissFailedModal = () => {
    try {
      localStorage.removeItem("ft_oauth_pending");
    } catch {
      /* ignore */
    }
    setShowFailedModal(false);
  };

  // A previous OAuth attempt that never produced a session: flag still set,
  // done loading, logged out. The 15-minute window keeps a stale flag from
  // surfacing on an unrelated visit days later.
  useEffect(() => {
    if (loading || loggedIn) return;
    try {
      const ts = Number(localStorage.getItem("ft_oauth_pending"));
      if (ts > 0 && Date.now() - ts < 15 * 60 * 1000) {
        setShowFailedModal(true);
        posthog.capture("onboarding_oauth_failed", {
          browser: safariBrowser ? "safari" : "other",
        });
      }
    } catch {
      /* ignore */
    }
  }, [loading, loggedIn]);

  // Kill-switch via PostHog flag `oauth-recovery-popup`. Fails OPEN: the popup
  // shows unless the flag is explicitly turned off.
  useEffect(() => {
    const unsub = posthog.onFeatureFlags(() => {
      if (posthog.isFeatureEnabled("oauth-recovery-popup") === false) {
        setShowFailedModal(false);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Escape closes the recovery popup.
  useEffect(() => {
    if (!showFailedModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissFailedModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFailedModal]);

  // Figma remembers the last account in its own session cookie and its OAuth
  // endpoint has no account picker, so the only fix for "wrong account" is to
  // sign out of Figma first (new tab, so this page stays put).
  const signOutOfFigma = () => {
    posthog.capture("onboarding_switch_figma_account");
    window.open("https://www.figma.com/logout", "_blank", "noopener");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center bg-canvas px-gutter py-16 font-sans text-ink">
      <Seo
        title="Fimanu — Embeddable Figma Activity Widgets"
        description="Turn your Figma version history into embeddable activity heatmaps, streak badges, and file breakdowns for your README, Notion, or portfolio."
        path="/"
      />

      {/* Recovery popup: shown when a prior OAuth attempt didn't complete. */}
      {showFailedModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-gutter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="oauth-failed-title"
        >
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={dismissFailedModal}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-full max-w-md flex-col gap-3 rounded-3xl border border-line bg-surface p-6 shadow-card">
            <h2 id="oauth-failed-title" className="display text-[20px] text-ink">
              That Figma sign-in didn't complete
            </h2>
            <p className="text-[14px] leading-relaxed text-body">
              If Figma's page reloaded or crashed — most common on Safari with an
              ad or content blocker — pause the blocker for figma.com, then
              reconnect.
            </p>
            <p className="text-[14px] leading-relaxed text-body">
              Or, if you picked the wrong Figma account, Figma stays signed into
              it and won't offer a picker next time. Sign out of Figma first,
              then reconnect to choose a different account.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={signOutOfFigma}
                className={`${BTN_GHOST} h-10 px-4`}
              >
                Sign out of Figma <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={startOAuth}
                className={`${BTN_PRIMARY} h-10 px-4`}
              >
                Reconnect Figma <ArrowRight size={15} />
              </button>
            </div>
            <button
              type="button"
              onClick={dismissFailedModal}
              className="ui-text w-fit pt-1 text-[13px] text-muted underline decoration-muted/40 underline-offset-4 transition-colors hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex w-full max-w-lg flex-1 flex-col justify-center gap-10">
        <div className="flex flex-col items-start gap-5">
          <img src={imgFimanuLogo} alt="Fimanu" className="h-7 w-auto" />
          <h1 className="display whitespace-nowrap text-[clamp(1.25rem,5.6vw,2rem)]">
            Your Figma activity, <span className="text-accent">embeddable.</span>
          </h1>
          <p className="text-[16px] leading-relaxed text-body">
            Fimanu tracks the version history, comments, and dev resources of the
            Figma files you choose, and turns them into heatmaps, streaks, and
            breakdowns you can paste into a README, Notion, or portfolio.
          </p>

          <div className="flex flex-col items-start gap-3">
            {loggedIn ? (
              <a
                href="/studio"
                onClick={() => posthog.capture("landing_cta_click", { cta: "open_studio" })}
                className={BTN_PRIMARY}
              >
                Open Studio <ArrowRight size={16} />
              </a>
            ) : (
              <button type="button" onClick={startOAuth} className={BTN_PRIMARY}>
                Connect Figma <ArrowRight size={16} />
              </button>
            )}
            <span className="text-[13px] text-muted">
              Read-only: file metadata, version history, and comments. Never your
              design content.
            </span>
          </div>

          {!loggedIn && safariBrowser && !safariHintDismissed && (
            <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-[13px] leading-relaxed text-body">
              <Info size={15} className="mt-0.5 shrink-0 text-muted" />
              <span className="flex-1">
                On Safari? If Figma's page reloads or won't load, pause your ad
                blocker (or content blocker) for figma.com, then try again.
              </span>
              <button
                type="button"
                onClick={dismissSafariHint}
                aria-label="Dismiss"
                className="ui-text shrink-0 text-muted transition-colors hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          )}

          {!loggedIn && (
            <div className="flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={() => setShowSwitch((v) => !v)}
                aria-expanded={showSwitch}
                className="ui-text text-[13px] text-muted underline decoration-muted/40 underline-offset-4 transition-colors hover:text-ink"
              >
                Signed in with the wrong Figma account?
              </button>
              {showSwitch && (
                <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-4 text-[13px] leading-relaxed text-body">
                  <p>
                    Figma keeps you signed into the last account you used, and
                    won't offer a picker during connect. Sign out of Figma first,
                    then reconnect to choose a different account.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={signOutOfFigma}
                      className={`${BTN_GHOST} h-9 px-4 text-[13px]`}
                    >
                      Sign out of Figma <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={startOAuth}
                      className={`${BTN_PRIMARY} h-9 px-4 text-[13px]`}
                    >
                      Reconnect Figma <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <nav aria-label="Site" className="flex flex-col divide-y divide-line border-y border-line">
          {PAGES.map(({ label, href, desc, app }) => {
            const inner = (
              <>
                <span className="flex flex-col gap-0.5">
                  <span className="ui-text text-ink">{label}</span>
                  <span className="text-[13px] text-muted">{desc}</span>
                </span>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-muted transition-transform duration-200 ease-out-cubic group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </>
            );
            return app && !loggedIn ? (
              <button key={label} type="button" onClick={startOAuth} className={ROW}>
                {inner}
              </button>
            ) : (
              <a
                key={label}
                href={href}
                onClick={() => posthog.capture("landing_nav_click", { link: label })}
                className={ROW}
              >
                {inner}
              </a>
            );
          })}
        </nav>
      </main>

      <footer className="flex w-full max-w-lg flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-10 text-[13px] text-muted">
        <span>© 2026 Jason Jiayu Zhang · Not affiliated with Figma, Inc.</span>
        <span className="flex items-center gap-4">
          <a href="/privacy" className="transition-colors hover:text-ink">Privacy</a>
          <a href="/terms" className="transition-colors hover:text-ink">Terms</a>
        </span>
      </footer>
    </div>
  );
}
