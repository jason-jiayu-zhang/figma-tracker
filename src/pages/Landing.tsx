import React, { useMemo } from "react";
import { ArrowRight, Activity, Users, FileText } from "lucide-react";
import { format, subDays, startOfToday } from "date-fns";
import posthog from "posthog-js";
import imgFimanuLogo from "../assets/FimanuLogoFull.svg";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import { useSession } from "../session";
import { APP_DASHBOARD_URL } from "../config";

const demoTheme: HeatmapTheme = {
  rectSize: 12,
  rectRadius: 2,
  gap: 4,
  emptyColor: "#e8e8e8",
  levelColors: ["#1bca7c", "#1ab7fa", "#9851f9", "#f23b27"],
  textColor: "#737373",
  tooltipBgColor: "#2C2C2C",
  tooltipTextColor: "white",
};

/* Reciprocity: give value before asking for the connection. A real, populated
   heatmap of representative (weekday-heavy) activity lets a visitor see exactly
   what they'll get, so signing up reads as unlocking *their own* version rather
   than paying an entry toll. Seeded so it stays stable across renders. */
function useDemoActivity() {
  return useMemo(() => {
    const data: Record<string, number> = {};
    let seed = 20260710;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const today = startOfToday();
    for (let i = 364; i >= 0; i--) {
      const d = subDays(today, i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      if (rand() < (weekend ? 0.25 : 0.82)) {
        data[format(d, "yyyy-MM-dd")] =
          1 + Math.floor(rand() * (weekend ? 6 : 14));
      }
    }
    return data;
  }, []);
}

export default function Landing() {
  // Marketing page: only a lightweight session check (no authenticated data).
  const { loggedIn } = useSession();
  const demoActivity = useDemoActivity();

  // The dashboard lives on the app subdomain; link there when configured,
  // otherwise fall back to a same-origin path.
  const appBase = APP_DASHBOARD_URL;
  const dashHref = appBase ? `${appBase}/dashboard` : "/dashboard";
  const signInHref = appBase ? `${appBase}/onboard` : "/onboard";
  const ctaHref = loggedIn ? dashHref : signInHref;

  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center overflow-x-clip font-sans">
      {/* Navigation */}
      <nav className="w-full max-w-6xl px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center">
          <img src={imgFimanuLogo} alt="Fimanu" className="h-8 w-auto" />
        </div>
        <div>
          <a
            href={ctaHref}
            onClick={() =>
              posthog.capture("landing_cta_clicked", {
                cta_text: loggedIn ? "Go to Dashboard" : "Sign In",
                location: "nav",
              })
            }
            className="bg-ink text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-black transition-colors"
          >
            {loggedIn ? "Go to Dashboard" : "Sign In"}
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl px-6 flex flex-col items-center justify-center text-center mt-20 mb-32 z-10">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue/10 text-blue font-semibold text-sm mb-8 animate-fade-in-up">
          Introducing Fimanu 1.0
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-ink tracking-tight leading-tight text-balance mb-8 max-w-4xl animate-fade-in-up animation-delay-100">
          Visualize your team's{" "}
          <span className="text-blue">Figma activity</span> in real-time.
        </h1>
        <p className="text-xl text-body text-pretty mb-12 max-w-2xl animate-fade-in-up animation-delay-200">
          Automatically track file contributions, generate GitHub-style activity
          heatmaps, and gain insights into your design workflow without lifting
          a finger.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-300">
          <a
            href={ctaHref}
            onClick={() =>
              posthog.capture("landing_cta_clicked", {
                cta_text: loggedIn ? "Go to Dashboard" : "Get Started for Free",
                location: "hero",
              })
            }
            className="bg-blue text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#16a6e0] transition-[transform,box-shadow,background-color] duration-200 ease-out shadow-card hover:shadow-card-hover active:scale-95 flex items-center justify-center gap-2"
          >
            {loggedIn ? "Go to Dashboard" : "Get Started for Free"}{" "}
            <ArrowRight size={20} />
          </a>
        </div>

        {/* Live demo — see the product working before being asked to connect. */}
        <div className="w-full max-w-4xl mt-20 animate-fade-in-up animation-delay-300">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-semibold text-body">
              A year of design activity, at a glance
            </span>
            <span className="text-xs font-medium text-muted uppercase tracking-[0.1em]">
              Sample data
            </span>
          </div>
          <div className="bg-surface rounded-3xl shadow-card border border-line p-6 overflow-x-auto">
            <Heatmap
              data={demoActivity}
              theme="light"
              customTheme={demoTheme}
            />
          </div>
          <p className="text-body mt-5 text-base">
            This is example activity.{" "}
            <a
              href={ctaHref}
              className="text-blue font-semibold hover:underline"
            >
              Connect your Figma
            </a>{" "}
            to see your own — free, no credit card.
          </p>
        </div>
      </main>

      {/* Features Section */}
      <section className="w-full bg-surface py-24 border-t border-line">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green/10 text-green rounded-2xl flex items-center justify-center mb-6">
              <Activity size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-4">
              Activity Heatmaps
            </h2>
            <p className="text-body text-pretty leading-relaxed">
              Beautiful, interactive heatmaps showing your daily design
              contributions, just like GitHub.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-purple/10 text-purple rounded-2xl flex items-center justify-center mb-6">
              <Users size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-4">Team Tracking</h2>
            <p className="text-body text-pretty leading-relaxed">
              Monitor exactly who is working on what, and when, across all your
              monitored Figma files.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange/10 text-orange rounded-2xl flex items-center justify-center mb-6">
              <FileText size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-4">File Insights</h2>
            <p className="text-body text-pretty leading-relaxed">
              Drill down into specific files to see version history, active
              collaborators, and peak editing times.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-body border-t border-line bg-surface">
        <p>© 2026 Fimanu. All rights reserved.</p>
      </footer>
    </div>
  );
}
