import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Flame,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import imgFimanuLogo from "../assets/Fimanu Logo.svg";
import { useSession } from "../session";
import { APP_DASHBOARD_URL } from "../config";

/* ── Motion primitives ──────────────────────────────────────── */

/** Progress (0→1) of a tall section scrolling past a pinned viewport.
    This is what drives the hero scrub in place of a scroll library. */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(total <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / total)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

/** Reveals every .reveal / .line-mask once, on first intersection. */
function useReveals() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal, .line-mask"),
    );
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/** Fires once when an element first scrolls into view. */
function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setSeen(true),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Remaps t from [i,o] to [0,1], clamped — lets one scrub drive staged moves. */
const range = (t: number, i: number, o: number) =>
  Math.min(1, Math.max(0, (t - i) / (o - i)));

/* ── Decorative widget mocks ────────────────────────────────── */

/** Deterministic 0..1 so the mock heatmap renders identically every time. */
const fract = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function MockHeatmap({
  accent = "#f23b27",
  empty = "#efe9e1",
}: {
  accent?: string;
  empty?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="ui-text text-ink">418 changes this year</span>
        <span className="ui-text text-muted">2026</span>
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: 26 }).map((_, c) => (
          <div key={c} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, r) => {
              const lvl = Math.floor(fract(c * 7 + r) * 5);
              return (
                <div
                  key={r}
                  className="size-[9px] rounded-[2px]"
                  style={{
                    background: lvl === 0 ? empty : accent,
                    opacity: lvl === 0 ? 1 : 0.25 + lvl * 0.1875,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="ui-text text-muted">Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className="size-[9px] rounded-[2px]"
            style={{
              background: l === 0 ? empty : accent,
              opacity: l === 0 ? 1 : 0.25 + l * 0.1875,
            }}
          />
        ))}
        <span className="ui-text text-muted">More</span>
      </div>
    </div>
  );
}

function MockStreak({ accent = "#f23b27" }: { accent?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid size-14 shrink-0 place-items-center rounded-2xl"
        style={{ background: `${accent}1a`, color: accent }}
      >
        <Flame size={26} strokeWidth={2.2} />
      </div>
      <div className="flex flex-col gap-1">
        <span
          className="display text-[2rem] leading-none"
          style={{ color: accent }}
        >
          12 days
        </span>
        <span className="ui-text text-muted">Current design streak</span>
      </div>
    </div>
  );
}

const BREAKDOWN = [
  { label: "Design System", pct: 42, color: "#a259ff" },
  { label: "Mobile App", pct: 27, color: "#1abcfe" },
  { label: "Marketing Site", pct: 19, color: "#0acf83" },
  { label: "Explorations", pct: 12, color: "#f24e1e" },
];

function MockBreakdown() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {BREAKDOWN.map((b) => (
          <div
            key={b.label}
            style={{ width: `${b.pct}%`, background: b.color }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {BREAKDOWN.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: b.color }}
            />
            <span className="ui-text flex-1 truncate text-ink">{b.label}</span>
            <span className="ui-text text-muted">{b.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WidgetCard({
  title,
  children,
  className = "",
  style,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-surface p-5 shadow-card ${className}`}
      style={style}
    >
      <div className="ui-text mb-4 text-muted uppercase">{title}</div>
      {children}
    </div>
  );
}

/* ── Shared bits ────────────────────────────────────────────── */

const BTN_BASE =
  "ui-text inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 transition-[background-color,color,transform,border-color] duration-200 ease-out-cubic active:scale-[0.98] disabled:opacity-60";
const BTN_PRIMARY = `${BTN_BASE} bg-ink text-white hover:bg-black`;
const BTN_GHOST = `${BTN_BASE} border border-ink/15 text-ink hover:bg-ink/[0.04]`;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="ui-text reveal inline-flex items-center gap-2 text-muted uppercase">
      <span className="size-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function Landing() {
  const { loggedIn } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useReveals();

  const heroRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(heroRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The app lives on the app subdomain; link there when configured,
  // otherwise fall back to a same-origin path.
  const appBase = APP_DASHBOARD_URL;
  const studioHref = appBase ? `${appBase}/studio` : "/studio";

  const startOAuth = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await axios.post("/api/oauth/start");
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      setError("Failed to start OAuth");
    } catch {
      setError("Failed to start OAuth");
    }
    setBusy(false);
  };

  const PrimaryCta = ({ className = "" }: { className?: string }) =>
    loggedIn ? (
      <a href={studioHref} className={`${BTN_PRIMARY} ${className}`}>
        Open Studio <ArrowRight size={16} />
      </a>
    ) : (
      <button
        type="button"
        onClick={startOAuth}
        disabled={busy}
        className={`${BTN_PRIMARY} ${className}`}
      >
        {busy ? "Connecting…" : "Connect Figma"} <ArrowRight size={16} />
      </button>
    );

  // Hero scrub: copy lifts away while the widget cluster rises and fans out.
  const copyT = range(p, 0, 0.55);
  const cardsT = range(p, 0.05, 0.85);

  return (
    <div className="min-h-dvh overflow-clip bg-canvas font-sans text-ink">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 px-gutter py-4">
        <div
          className={`mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full pl-5 pr-2 transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-out-cubic ${
            scrolled
              ? "bg-surface/80 shadow-card backdrop-blur-xl"
              : "bg-transparent"
          }`}
        >
          <a href="/" className="flex items-center gap-2" aria-label="Fimanu">
            <img src={imgFimanuLogo} alt="Fimanu" className="h-6 w-auto" />
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["Widgets", "#widgets"],
              ["How it works", "#how"],
              ["Studio", "#studio"],
              ["Docs", "/docs"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="ui-text rounded-full px-4 py-2 text-body transition-colors duration-200 ease-out-cubic hover:bg-ink/[0.05] hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>
          <PrimaryCta className="h-10 px-5" />
        </div>
      </header>

      {/* ── 1. Hero — pinned, scroll-scrubbed ────────────────── */}
      {/* Full height only where the card cluster is visible — on mobile the
          hero is a single screen, which also parks the scrub at 0. */}
      <section ref={heroRef} className="relative h-dvh md:h-[260vh]">
        <div className="sticky top-0 flex h-dvh flex-col items-center justify-center overflow-hidden">
          {/* Warm field behind the type, echoing the brand accent. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(60% 50% at 50% 34%, rgba(242,59,39,0.14) 0%, rgba(242,59,39,0) 70%)",
            }}
          />

          <div
            className="flex flex-col items-center px-gutter text-center"
            style={{
              transform: `translateY(${lerp(0, -80, copyT)}px)`,
              opacity: 1 - range(p, 0.34, 0.62),
            }}
          >
            <SectionLabel>Figma activity, embeddable</SectionLabel>

            <h1 className="display mt-6 text-display-lg">
              <span className="line-mask">
                <span>Your design work,</span>
              </span>
              <span className="line-mask" style={{ "--reveal-delay": "0.09s" } as React.CSSProperties}>
                <span className="text-accent">on every page.</span>
              </span>
            </h1>

            <p className="reveal mt-7 max-w-xl text-lede text-body [--reveal-delay:0.28s]">
              Fimanu turns your Figma version history into embeddable heatmaps,
              streak badges, and file breakdowns — designed in Studio, pasted
              anywhere.
            </p>

            <div className="reveal mt-9 flex flex-wrap items-center justify-center gap-3 [--reveal-delay:0.38s]">
              <PrimaryCta />
              <a href="#how" className={BTN_GHOST}>
                See how it works
              </a>
            </div>

            {error && (
              <p
                role="alert"
                className="ui-text mt-4 rounded-full bg-accent/10 px-4 py-2 text-accent"
              >
                {error}
              </p>
            )}

            <p className="reveal mt-6 flex max-w-md items-start gap-2 text-left text-[13px] leading-relaxed text-muted [--reveal-delay:0.46s]">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <span>
                Read access to file metadata, version history, and comments
                only — never your design content.
              </span>
            </p>
          </div>

          {/* Widget cluster: converged and low, then fans out on scroll. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center md:flex"
            style={{ transform: `translateY(${lerp(12, -30, cardsT)}vh)` }}
          >
            <div className="relative flex w-full max-w-6xl items-end justify-center">
              <WidgetCard
                title="Streak"
                className="absolute w-[300px]"
                style={{
                  transform: `translate(${lerp(0, -400, cardsT)}px, ${lerp(40, 24, cardsT)}px) rotate(${lerp(0, -7, cardsT)}deg)`,
                }}
              >
                <MockStreak />
              </WidgetCard>

              <WidgetCard
                title="Breakdown"
                className="absolute w-[300px]"
                style={{
                  transform: `translate(${lerp(0, 400, cardsT)}px, ${lerp(40, 24, cardsT)}px) rotate(${lerp(0, 7, cardsT)}deg)`,
                }}
              >
                <MockBreakdown />
              </WidgetCard>

              <WidgetCard
                title="Activity heatmap"
                className="relative z-10 w-[440px]"
                style={{ transform: `scale(${lerp(0.94, 1, cardsT)})` }}
              >
                <MockHeatmap />
              </WidgetCard>
            </div>
          </div>

          <div
            className="ui-text absolute bottom-8 text-muted"
            style={{ opacity: 1 - range(p, 0, 0.18) }}
          >
            Scroll
          </div>
        </div>
      </section>

      {/* ── 2. Widget rail ───────────────────────────────────── */}
      <section id="widgets" className="py-section">
        <div className="grid-16">
          <div className="col-span-16 flex flex-col items-center text-center md:col-span-12 md:col-start-3">
            <SectionLabel>Three widgets</SectionLabel>
            <h2 className="display reveal mt-6 text-display-md [--reveal-delay:0.06s]">
              One connection.
              <br />
              Everything you ship.
            </h2>
          </div>
        </div>

        <div className="grid-16 mt-block">
          {[
            {
              t: "Activity heatmap",
              d: "A year of version-history activity, rendered as a calendar grid in your accent colour.",
              n: <MockHeatmap />,
            },
            {
              t: "Streak badge",
              d: "Consecutive days with a saved version. Compact enough for a README badge row.",
              n: <MockStreak />,
            },
            {
              t: "File breakdown",
              d: "Where your hours actually went, split by file and weighted by change volume.",
              n: <MockBreakdown />,
            },
          ].map((w, i) => (
            <article
              key={w.t}
              className="reveal col-span-16 flex flex-col gap-6 rounded-card border border-line bg-surface p-6 shadow-card transition-[transform,box-shadow] duration-300 ease-out-cubic hover:-translate-y-1 hover:shadow-card-hover md:col-span-5"
              style={{ "--reveal-delay": `${i * 0.1}s` } as React.CSSProperties}
            >
              <div className="grid min-h-[190px] place-items-center rounded-[14px] bg-canvas p-5">
                {w.n}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="display text-[1.375rem]">{w.t}</h3>
                <p className="text-[15px] leading-relaxed text-body">{w.d}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 3. Full-bleed accent walkthrough ─────────────────── */}
      <Walkthrough />

      {/* ── 4. Studio — left-aligned media hero ──────────────── */}
      <section id="studio" className="py-section">
        <div className="grid-16 items-center gap-y-block">
          <div className="col-span-16 flex flex-col items-start md:col-span-6">
            <SectionLabel>Studio</SectionLabel>
            <h2 className="display reveal mt-6 text-display-md [--reveal-delay:0.06s]">
              Design it once.
              <br />
              Paste it anywhere.
            </h2>
            <p className="reveal mt-6 max-w-md text-lede text-body [--reveal-delay:0.14s]">
              Pick a widget, set the palette, radius, and background, and watch
              it render live. Studio hands you a single snippet — no build step,
              no script tag.
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3 [--reveal-delay:0.22s]">
              <PrimaryCta />
              <a href="/docs" className={BTN_GHOST}>
                Read the docs <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <div className="reveal col-span-16 md:col-span-9 md:col-start-8 [--reveal-delay:0.12s]">
            <div className="rounded-panel border border-line bg-surface p-3 shadow-card">
              <div className="flex items-center gap-1.5 px-2 py-2">
                <span className="size-2.5 rounded-full bg-line" />
                <span className="size-2.5 rounded-full bg-line" />
                <span className="size-2.5 rounded-full bg-line" />
                <span className="ui-text ml-2 text-muted">
                  fimanu.studio — heatmap
                </span>
              </div>
              <div className="grid gap-3 rounded-[14px] bg-canvas p-6 sm:grid-cols-[1fr_180px]">
                <div className="grid place-items-center rounded-[10px] border border-line bg-surface p-5">
                  <MockHeatmap />
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    ["Theme", "Cream"],
                    ["Accent", "#F23B27"],
                    ["Radius", "12px"],
                    ["Background", "Transparent"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5"
                    >
                      <span className="ui-text truncate text-muted">{k}</span>
                      <span className="ui-text shrink-0 text-ink">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Centered product overview ─────────────────────── */}
      <section className="py-section">
        <div className="grid-16">
          <div className="col-span-16 text-center md:col-span-10 md:col-start-4">
            <h2 className="display reveal text-display-sm text-body">
              <span className="text-ink">Dark mode?</span> Built in.{" "}
              <span className="text-ink">Custom accent?</span> Any hex.{" "}
              <span className="text-ink">Transparent background?</span> Done.{" "}
              <span className="text-ink">Private files?</span> Never touched.
            </h2>
          </div>
        </div>

        <div className="grid-16 mt-block">
          {[
            ["Zero JavaScript", "Embeds render as an image or iframe — safe for README, Notion, and Framer alike."],
            ["Cached at the edge", "Widgets serve from cache and refresh on your sync schedule, not on every view."],
            ["Read-only scopes", "Metadata, version history, and comments. Your file contents stay in Figma."],
            ["Yours to revoke", "Disconnect from Settings and every embed stops resolving immediately."],
          ].map(([t, d], i) => (
            <div
              key={t}
              className="reveal col-span-16 flex flex-col gap-2 border-t border-line pt-5 sm:col-span-8 md:col-span-4"
              style={{ "--reveal-delay": `${i * 0.08}s` } as React.CSSProperties}
            >
              <h3 className="display text-[1.125rem]">{t}</h3>
              <p className="text-[15px] leading-relaxed text-body">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Overlapping interactive panel ─────────────────── */}
      <EmbedPlayground />

      {/* ── 7. Destinations marquee ──────────────────────────── */}
      <section className="py-section">
        <div className="grid-16">
          <div className="col-span-16 flex flex-col items-center text-center">
            <SectionLabel>Anywhere that renders an image</SectionLabel>
            <h2 className="display reveal mt-6 text-display-md [--reveal-delay:0.06s]">
              Drop it in and
              <br />
              it just shows up.
            </h2>
          </div>
        </div>

        <div className="marquee edge-fade mt-block overflow-hidden">
          <div className="marquee-track gap-3">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 gap-3 pr-3">
                {[
                  "GitHub README",
                  "Notion",
                  "Framer",
                  "Webflow",
                  "Portfolio site",
                  "Linear docs",
                  "Slack canvas",
                  "Obsidian",
                  "Ghost",
                  "Substack",
                ].map((d) => (
                  <span
                    key={d}
                    className="ui-text flex h-14 items-center whitespace-nowrap rounded-full border border-line bg-surface px-7 text-body"
                  >
                    {d}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Oversized closing CTA ─────────────────────────── */}
      <section className="pb-section pt-block text-center">
        <div className="grid-16">
          <div className="col-span-16">
            <h2 className="display reveal text-display-xl">
              Ship your first
              <br />
              <span className="text-accent">embed today.</span>
            </h2>
            <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-3 [--reveal-delay:0.12s]">
              <PrimaryCta />
              <a href="/docs" className={BTN_GHOST}>
                Browse the docs
              </a>
            </div>
            <p className="ui-text reveal mt-6 text-muted [--reveal-delay:0.18s]">
              Free while in beta · Connect in under a minute
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-line py-block">
        <div className="grid-16 gap-y-10">
          <div className="col-span-16 flex flex-col gap-4 md:col-span-5">
            <img src={imgFimanuLogo} alt="Fimanu" className="h-6 w-auto self-start" />
            <p className="max-w-xs text-[15px] leading-relaxed text-body">
              Embeddable activity widgets for the work you already do in Figma.
            </p>
          </div>

          {[
            ["Product", [["Studio", "/studio"], ["Files", "/files"], ["Settings", "/settings"], ["Docs", "/docs"]]],
            ["Company", [["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/terms"]]],
            ["Resources", [["How it works", "#how"], ["Widgets", "#widgets"]]],
          ].map(([title, links]) => (
            <div
              key={title as string}
              className="col-span-8 flex flex-col gap-3 md:col-span-3"
            >
              <h3 className="ui-text text-muted uppercase">{title as string}</h3>
              {(links as string[][]).map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="ui-text w-fit text-body transition-colors duration-200 ease-out-cubic hover:text-ink"
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="grid-16 mt-12">
          <div className="col-span-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <span className="ui-text text-muted">© 2026 Fimanu</span>
            <span className="ui-text text-muted">
              Not affiliated with Figma, Inc.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Full-bleed accent walkthrough ──────────────────────────── */

const STEPS = [
  { k: "Connect", d: "Authorise Fimanu against your Figma account. Read-only scopes." },
  { k: "Choose", d: "Pick the files whose version history should feed your widgets." },
  { k: "Theme", d: "Set palette, radius, and background until the preview looks right." },
  { k: "Copy", d: "Studio generates one snippet — Markdown, HTML, or a bare URL." },
  { k: "Live", d: "Paste it. The embed refreshes on your sync schedule from then on." },
];

function Walkthrough() {
  const ref = useRef<HTMLElement>(null);
  const started = useInView(ref);
  const [step, setStep] = useState(0);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (!started) return;
    setStep(0);
    const t = window.setInterval(
      () => setStep((s) => (s >= STEPS.length - 1 ? s : s + 1)),
      2400,
    );
    return () => window.clearInterval(t);
  }, [started, runId]);

  const done = step >= STEPS.length - 1;

  return (
    <section ref={ref} id="how" className="bg-accent py-section text-white">
      <div className="grid-16">
        <div className="col-span-16 flex flex-col items-start gap-6 md:col-span-9">
          <span className="ui-text inline-flex items-center gap-2 uppercase opacity-70">
            <span className="size-1.5 rounded-full bg-white" />
            How it works
          </span>
          <h2 className="display text-display-md">
            Simple, fast
            <br />
            &amp; read-only.
          </h2>
        </div>

        <div className="col-span-16 flex items-end md:col-span-5 md:col-start-12 md:justify-end">
          <button
            type="button"
            onClick={() => setRunId((n) => n + 1)}
            className="ui-text inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-5 transition-colors duration-200 ease-out-cubic hover:bg-white/10"
          >
            <RotateCcw size={15} /> Restart
          </button>
        </div>
      </div>

      <div className="grid-16 mt-block">
        {STEPS.map((s, i) => {
          const active = i === step;
          const past = i < step;
          return (
            <button
              key={s.k}
              type="button"
              onClick={() => setStep(i)}
              aria-current={active ? "step" : undefined}
              className="col-span-16 flex flex-col gap-3 border-t border-white/25 pt-4 text-left transition-opacity duration-300 ease-out-cubic sm:col-span-8 md:col-span-3"
              style={{ opacity: active ? 1 : past ? 0.7 : 0.45 }}
            >
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full border border-white/40 text-[11px]">
                  {past || (done && active) ? <Check size={12} /> : i + 1}
                </span>
                <span className="display text-[1.25rem]">{s.k}</span>
              </div>
              <p className="text-[15px] leading-relaxed text-white/85">{s.d}</p>
              <span className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-white/25">
                <span
                  className="block h-full rounded-full bg-white transition-[width] duration-[2400ms] ease-linear"
                  style={{ width: active || past ? "100%" : "0%" }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ── Interactive embed playground ───────────────────────────── */

const THEMES = [
  { k: "Cream", accent: "#f23b27", bg: "#fffaf4" },
  { k: "Slate", accent: "#1abcfe", bg: "#0f1115" },
  { k: "Forest", accent: "#0acf83", bg: "#ffffff" },
  { k: "Grape", accent: "#a259ff", bg: "#faf7ff" },
];

function EmbedPlayground() {
  const [theme, setTheme] = useState(0);
  const [copied, setCopied] = useState(false);
  const t = THEMES[theme];
  const dark = theme === 1;

  const snippet = `![Figma activity](https://fimanu.app/e/heatmap.svg?u=you&accent=${encodeURIComponent(t.accent)})`;

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(snippet).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  }, [snippet]);

  return (
    <section className="px-gutter">
      {/* Pulled up so it overlaps the section above — the same overlap
          trick the reference uses to break the section grid. */}
      <div className="reveal mx-auto -mt-block max-w-[1400px] rounded-panel border border-line bg-surface p-6 shadow-card sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col items-start gap-5">
            <SectionLabel>Try it</SectionLabel>
            <h2 className="display text-display-sm">
              Theme it,
              <br />
              then take the snippet.
            </h2>

            <div className="flex flex-wrap gap-2">
              {THEMES.map((th, i) => (
                <button
                  key={th.k}
                  type="button"
                  onClick={() => setTheme(i)}
                  aria-pressed={i === theme}
                  className={`ui-text inline-flex h-10 items-center gap-2 rounded-full border px-4 transition-[background-color,border-color] duration-200 ease-out-cubic ${
                    i === theme
                      ? "border-ink bg-ink text-white"
                      : "border-line text-body hover:bg-ink/[0.04]"
                  }`}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: th.accent }}
                  />
                  {th.k}
                </button>
              ))}
            </div>

            <div className="flex w-full max-w-lg items-center gap-2 rounded-full border border-line bg-canvas py-2 pl-5 pr-2">
              <code className="ui-text flex-1 truncate text-body">
                {snippet}
              </code>
              <button
                type="button"
                onClick={copy}
                className="ui-text inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-white transition-colors duration-200 ease-out-cubic hover:bg-black"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex-1">
            <div
              className="grid min-h-[260px] place-items-center rounded-card p-8 transition-colors duration-500 ease-out-cubic"
              style={{
                background: t.bg,
                border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "var(--color-line)"}`,
              }}
            >
              <div className={dark ? "[&_*]:!text-white/80" : ""}>
                <MockHeatmap
                  accent={t.accent}
                  empty={dark ? "#232833" : "#efe9e1"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
