import React from "react";
import { Clock, FileText, X } from "lucide-react";
import { FigmaFile, FigmaVersion } from "../types";
import { format } from "date-fns";

export default function TimelinePanel({
  selectedFile,
  versions,
  loadingVersions,
  closeTimeline,
}: {
  selectedFile: FigmaFile | null;
  versions: FigmaVersion[];
  loadingVersions: boolean;
  closeTimeline: () => void;
}) {
  if (!selectedFile) return null;

  return (
    <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm" id="timeline-panel">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[8px] flex-shrink-0" style={{ background: "#1ABCFE1A", color: "#1ABCFE" }}>
            <Clock size={14} />
          </div>
          <div>
            <div className="text-[14px] font-semibold">Version History</div>
            <div className="text-[11px] text-[#A6A6A6]">{selectedFile.name}</div>
          </div>
        </div>
        <button className="text-[12px] font-bold text-[#A6A6A6] hover:text-[#181818] flex items-center gap-1.5 transition-colors" onClick={closeTimeline}>
          <X size={14} /> Close
        </button>
      </div>
      <div className="p-6">
        {loadingVersions ? (
          <div className="text-center py-12 text-[#A6A6A6] italic text-[13px]">Loading versions…</div>
        ) : versions.length > 0 ? (
          <div className="flex flex-col">
            {versions.map((v) => (
              <div className="relative flex gap-5" key={v.version_id}>
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1ABCFE] mt-1.5 shadow-[0_0_8px_rgba(26,188,254,0.4)]" />
                  {/* vertical line */}
                  <div className="w-px flex-1 bg-[#EBEBEB] my-1" />
                </div>
                <div className="flex-1 pb-8">
                  <div className="text-[15px] font-bold text-[#181818] mb-1">{v.label || "Untitled Version"}</div>
                  {v.description && (<div className="text-[#A6A6A6] text-sm leading-relaxed mb-2">{v.description}</div>)}
                  <div className="flex gap-4 text-[11px] text-[#A6A6A6] font-bold">
                    <span className="flex items-center gap-1.5"><Clock size={11} /> {v.created_at ? format(new Date(v.created_at), "MMM d, h:mm a") : "—"}</span>
                    <span className="flex items-center gap-1.5"><FileText size={11} /> {v.created_by_handle}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[#A6A6A6] italic text-[13px]">No versions found for this filter.</div>
        )}
      </div>
    </section>
  );
}
