import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { getConsent, setConsent, subscribeConsent } from "../posthog";
import { Button } from "./ui";

export function useConsent() {
  return useSyncExternalStore(subscribeConsent, getConsent, () => "unset" as const);
}

/** One-time prompt for signed-in users (dashboard only). */
export function AnalyticsNotice() {
  const consent = useConsent();
  if (consent !== "unset") return null;
  return (
    <div
      role="region"
      aria-label="Analytics preference"
      className="fixed z-50 bottom-4 left-4 right-4 sm:left-auto sm:max-w-[380px] flex flex-col gap-3 p-4 rounded-xl bg-surface border border-line shadow-lg pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <p className="text-[13px] text-body leading-relaxed">
        Can we store an analytics cookie to see how Fimanu is used and improve it? Your sign-in
        cookie is separate and always on.{" "}
        <Link to="/privacy" className="text-accent hover:underline">Privacy policy</Link>
      </p>
      <div className="flex gap-2">
        <Button size="pill" onClick={() => setConsent("granted")}>Allow</Button>
        <Button size="pill" variant="secondary" onClick={() => setConsent("denied")}>No thanks</Button>
      </div>
    </div>
  );
}

/** Settings section so the choice can be changed any time. */
export function AnalyticsSection() {
  const consent = useConsent();
  const on = consent === "granted";
  return (
    <>
      <div className="flex flex-col items-start gap-3">
        <h1 className="display text-[clamp(1.25rem,5.6vw,2rem)]">Privacy</h1>
        <p className="text-[16px] leading-relaxed text-body">
          Help us improve Fimanu with an analytics cookie tied to your account.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="ui-text text-ink">Analytics is {on ? "on" : "off"}</span>
          <span className="text-[13px] text-muted">
            When off, nothing is stored on your device for analytics. Your sign-in cookie and embeds are unaffected.
          </span>
        </span>
      </div>
      <div>
        <button
          type="button"
          onClick={() => setConsent(on ? "denied" : "granted")}
          className={`ui-text inline-flex h-11 items-center justify-center rounded-full px-6 transition-[background-color,color,transform] duration-200 ease-out-cubic active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${on ? "border border-ink/15 text-ink hover:bg-ink/[0.04]" : "bg-accent text-white hover:bg-accent-hover active:bg-accent-active"}`}
        >
          {on ? "Turn off analytics" : "Turn on analytics"}
        </button>
      </div>
    </>
  );
}
