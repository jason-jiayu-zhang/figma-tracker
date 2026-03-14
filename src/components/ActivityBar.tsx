import React from "react";
import { Bell, Zap, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function ActivityBar() {
  return (
    <div className="w-14 flex flex-col gap-2.5 items-center p-3 bg-transparent m-5" aria-hidden>
      <Link to="/activity" className="w-11 h-11 flex items-center justify-center rounded-[12px] bg-white text-[#444] shadow-[0_6px_20px_rgba(0,0,0,0.04)] no-underline transition-transform hover:-translate-y-0.5" title="Activity">
        <Bell size={16} />
      </Link>
      <Link to="/files" className="w-11 h-11 flex items-center justify-center rounded-[12px] bg-white text-[#444] shadow-[0_6px_20px_rgba(0,0,0,0.04)] no-underline transition-transform hover:-translate-y-0.5" title="Files">
        <Zap size={16} />
      </Link>
      <Link to="/" className="w-11 h-11 flex items-center justify-center rounded-[12px] bg-white text-[#444] shadow-[0_6px_20px_rgba(0,0,0,0.04)] no-underline transition-transform hover:-translate-y-0.5" title="Timeline">
        <Clock size={16} />
      </Link>
    </div>
  );
}
