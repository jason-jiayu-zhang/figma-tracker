import React from "react";
import { ArrowRight, Activity, Users, FileText } from "lucide-react";
import imgFimanuLogo from "../assets/FimanuLogoFull.svg";
import { useSession } from "../session";
import { APP_DASHBOARD_URL } from "../config";

export default function Landing() {
  // Marketing page: only a lightweight session check (no authenticated data).
  const { loggedIn } = useSession();

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
          Visualize your team's <span className="text-blue">Figma activity</span> in real-time.
        </h1>
        <p className="text-xl text-body text-pretty mb-12 max-w-2xl animate-fade-in-up animation-delay-200">
          Automatically track file contributions, generate GitHub-style activity heatmaps, and gain insights into your design workflow without lifting a finger.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-300">
          <a
            href={ctaHref}
            className="bg-blue text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#16a6e0] transition-[transform,box-shadow,background-color] duration-200 ease-out shadow-card hover:shadow-card-hover active:scale-95 flex items-center justify-center gap-2"
          >
            {loggedIn ? "Go to Dashboard" : "Get Started for Free"} <ArrowRight size={20} />
          </a>
        </div>
      </main>

      {/* Features Section */}
      <section className="w-full bg-surface py-24 border-t border-line">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green/10 text-green rounded-2xl flex items-center justify-center mb-6">
              <Activity size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-4">Activity Heatmaps</h2>
            <p className="text-body text-pretty leading-relaxed">
              Beautiful, interactive heatmaps showing your daily design contributions, just like GitHub.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-purple/10 text-purple rounded-2xl flex items-center justify-center mb-6">
              <Users size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-4">Team Tracking</h2>
            <p className="text-body text-pretty leading-relaxed">
              Monitor exactly who is working on what, and when, across all your monitored Figma files.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange/10 text-orange rounded-2xl flex items-center justify-center mb-6">
              <FileText size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-4">File Insights</h2>
            <p className="text-body text-pretty leading-relaxed">
              Drill down into specific files to see version history, active collaborators, and peak editing times.
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
