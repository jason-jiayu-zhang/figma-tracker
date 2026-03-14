import React from "react";
import { Activity, RefreshCw } from "lucide-react";
import Heatmap from "./Heatmap";
import ToggleGroup from "./ToggleGroup";

export default function ActivityPanel({
  activity,
  totalEdits,
  filterMine,
  setFilterMine,
  syncing,
  triggerSync,
}: {
  activity: any;
  totalEdits: number;
  filterMine: boolean;
  setFilterMine: (v: boolean) => void;
  syncing: boolean;
  triggerSync: () => void;
}) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[8px] flex-shrink-0" style={{ background: "#F24E1E1A", color: "#F24E1E" }}>
            <Activity size={14} />
          </div>
          <div>
            <div className="text-[14px] font-semibold">Activity</div>
            <div className="text-[11px] text-[#A6A6A6]">{totalEdits} edits · last year</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup
            value={filterMine}
            onChange={setFilterMine}
            options={[
              { label: "My Edits", value: true },
              { label: "All Edits", value: false },
            ]}
          />
          <button
            className={`flex items-center gap-2 bg-[#181818] text-white px-4 py-1.5 rounded-lg text-[13px] font-bold hover:bg-[#333] transition-all active:scale-95 ${syncing ? "opacity-50 pointer-events-none" : ""}`}
            onClick={triggerSync}
            disabled={syncing}
          >
            <RefreshCw
              size={14}
              className={syncing ? "animate-spin" : ""}
            />
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
      </div>
      <div className="p-6 overflow-x-auto">
        <Heatmap data={activity?.dailyTotals ?? {}} theme="light" />
      </div>
    </section>
  );
}
