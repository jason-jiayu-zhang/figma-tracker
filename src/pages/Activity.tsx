import React from "react";
import { useFigmaData } from "../useFigmaData";
import { format } from "date-fns";

export default function ActivityPage() {
  const { activity } = useFigmaData();

  const recent = (Object.entries(activity?.recent || {}) as [string, number][]).slice(0, 8);

  return (
    <div className="py-[18px]">
      <div className="bg-white rounded-xl p-5 border border-[#eee] shadow-[0_6px_30px_rgba(0,0,0,0.04)]">
        <h1 className="text-[18px] font-semibold mb-2 text-[#181818]">Activity</h1>
        <p className="text-[#8a8a8a] text-[13px]">Recent edits and contributions across tracked files.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {recent.length === 0 ? (
            <div className="text-center text-[#A6A6A6] py-6 italic text-[13px]">No recent activity.</div>
          ) : (
            recent.map(([label, count]) => (
              <div key={label} className="flex justify-between items-center p-2.5 rounded-md">
                <div className="text-[13px] text-[#181818]">{label}</div>
                <div className="text-[13px] text-[#A6A6A6] font-bold">{count}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
