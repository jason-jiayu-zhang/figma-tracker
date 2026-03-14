import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Grid,
  FileText,
  Activity,
  BarChart2,
  Users,
  Settings,
  Layers,
} from "lucide-react";

export default function Sidebar() {
  const loc = useLocation();
  const items = [
    { to: "/", title: "Dashboard", icon: <Grid size={18} /> },
    { to: "/activity", title: "Activity", icon: <Activity size={18} /> },
    { to: "/files", title: "Files", icon: <FileText size={18} /> },
    { to: "/insights", title: "Insights", icon: <BarChart2 size={18} /> },
    { to: "/teams", title: "Teams", icon: <Users size={18} /> },
    { to: "/integrations", title: "Integrations", icon: <Layers size={18} /> },
  ];

  return (
    <aside className="w-18 rounded-full bg-white flex items-center justify-center shadow-[0_18px_40px_rgba(12,18,22,0.08)] fixed left-5 top-5 bottom-5 z-40" aria-label="Primary navigation">
      <div className="flex flex-col items-center w-full p-3 gap-3">
        <div className="">
          <Link to="/" title="Home" className="block no-underline">
            <div className="w-11 h-11 rounded-[12px] bg-gradient-to-b from-gray-100 to-white shadow-[0_6px_18px_rgba(0,0,0,0.05)]" />
          </Link>
        </div>

        <nav className="flex flex-col gap-2.5 items-center mt-1.5" role="navigation">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              title={it.title}
              aria-label={it.title}
              className={`w-11 h-11 flex items-center justify-center rounded-[10px] text-[#6b7280] no-underline transition-transform hover:bg-[#fafafa] hover:-translate-y-0.5 ${loc.pathname === it.to ? "bg-[#eef2ff] text-[#4f46e5] shadow-[0_10px_26px_rgba(79,70,229,0.06)]" : ""}`}
            >
              <div className="flex items-center justify-center">{it.icon}</div>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pb-1.5">
          <Link to="/settings" title="Settings" className="w-11 h-11 flex items-center justify-center rounded-[10px] text-[#6b7280] no-underline transition-transform hover:bg-[#fafafa] hover:-translate-y-0.5 mb-0.5">
            <div className="flex items-center justify-center">
              <Settings size={16} />
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
