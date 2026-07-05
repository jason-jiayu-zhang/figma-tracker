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
    <div className="min-h-screen bg-[#fffaf4] flex flex-col items-center overflow-x-clip font-sans">
      {/* Navigation */}
      <nav className="w-full max-w-6xl px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center">
          <img src={imgFimanuLogo} alt="Fimanu" className="h-8 w-auto" />
        </div>
        <div>
          <a
            href={ctaHref}
            className="bg-[#181818] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-black transition-colors"
          >
            {loggedIn ? "Go to Dashboard" : "Sign In"}
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl px-6 flex flex-col items-center justify-center text-center mt-20 mb-32 z-10">
        <div className="inline-block px-4 py-1.5 rounded-full bg-[#1ABCFE]/10 text-[#1ABCFE] font-semibold text-sm mb-8 animate-fade-in-up">
          Introducing Fimanu 1.0
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-[#181818] tracking-tight leading-tight mb-8 max-w-4xl animate-fade-in-up animation-delay-100">
          Visualize your team's <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1ABCFE] to-[#0ACF83]">Figma activity</span> in real-time.
        </h1>
        <p className="text-xl text-[#6B6B6B] mb-12 max-w-2xl animate-fade-in-up animation-delay-200">
          Automatically track file contributions, generate GitHub-style activity heatmaps, and gain insights into your design workflow without lifting a finger.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-300">
          <a
            href={ctaHref}
            className="bg-[#1ABCFE] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#16a6e0] transition-all shadow-lg hover:shadow-[#1ABCFE]/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {loggedIn ? "Go to Dashboard" : "Get Started for Free"} <ArrowRight size={20} />
          </a>
        </div>
      </main>

      {/* Features Section */}
      <section className="w-full bg-white py-24 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#0ACF83]/10 text-[#0ACF83] rounded-2xl flex items-center justify-center mb-6">
              <Activity size={32} />
            </div>
            <h3 className="text-2xl font-bold text-[#181818] mb-4">Activity Heatmaps</h3>
            <p className="text-[#6B6B6B] leading-relaxed">
              Beautiful, interactive heatmaps showing your daily design contributions, just like GitHub.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#A259FF]/10 text-[#A259FF] rounded-2xl flex items-center justify-center mb-6">
              <Users size={32} />
            </div>
            <h3 className="text-2xl font-bold text-[#181818] mb-4">Team Tracking</h3>
            <p className="text-[#6B6B6B] leading-relaxed">
              Monitor exactly who is working on what, and when, across all your monitored Figma files.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#F24E1E]/10 text-[#F24E1E] rounded-2xl flex items-center justify-center mb-6">
              <FileText size={32} />
            </div>
            <h3 className="text-2xl font-bold text-[#181818] mb-4">File Insights</h3>
            <p className="text-[#6B6B6B] leading-relaxed">
              Drill down into specific files to see version history, active collaborators, and peak editing times.
            </p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="w-full py-8 text-center text-[#6B6B6B] border-t border-gray-100 bg-white">
        <p>© 2026 Fimanu. All rights reserved.</p>
      </footer>
    </div>
  );
}
