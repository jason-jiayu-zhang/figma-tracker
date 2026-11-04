import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { BarChart3 } from "lucide-react";
import { getConsent, setConsent, subscribeConsent } from "../posthog";
import { Button, Card, SectionHeader } from "./ui";

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

/** Settings panel so the choice can be changed any time. */
export function AnalyticsCard() {
  const consent = useConsent();
  const on = consent === "granted";
  return (
    <Card className="flex flex-col gap-5 p-6 animate-fade-in-up">
      <SectionHeader
        icon={<BarChart3 size={20} />}
        title="Analytics"
        subtitle="Help us improve Fimanu with an analytics cookie tied to your account."
      />
      <p className="text-[13px] text-muted leading-relaxed max-w-[560px]">
        Currently <strong className="text-ink">{on ? "on" : "off"}</strong>. When off, nothing is stored on
        your device for analytics. Your sign-in cookie and embeds are unaffected.
      </p>
      <div>
        <Button variant={on ? "secondary" : "primary"} onClick={() => setConsent(on ? "denied" : "granted")}>
          {on ? "Turn off analytics" : "Turn on analytics"}
        </Button>
      </div>
    </Card>
  );
}
