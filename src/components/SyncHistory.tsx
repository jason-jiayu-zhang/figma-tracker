import React from "react";
import { format } from "date-fns";

export default function SyncHistory({ syncHistory }: { syncHistory: any[] }) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[8px] flex-shrink-0" style={{ background: "#0ACF831A", color: "#0ACF83" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20v-6" stroke="#0ACF83" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12a8 8 0 1 0-8 8" stroke="#0ACF83" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold">Sync History</div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#F5F5F5]">
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">Files Synced</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">New Versions</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {syncHistory.map((sync, i) => (
              <tr key={sync.id} className={`hover:bg-[#F9F9F9] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                <td className="px-6 py-4 text-[13px] text-[#181818]">{sync.synced_at ? format(new Date(sync.synced_at), "MMM d, h:mm a") : "—"}</td>
                <td className="px-6 py-4 text-[13px] tabular-nums text-[#181818]">{sync.files_synced}</td>
                <td className="px-6 py-4 text-[13px] tabular-nums text-[#181818]">{sync.new_versions_found}</td>
                <td className="px-6 py-4">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sync.status === "success" ? "bg-[#0ACF83]/10 text-[#0ACF83]" : "bg-[#EF4444]/10 text-[#EF4444]"}`}>
                    {sync.status === "success" ? "✓ SUCCESS" : "✗ FAILED"}
                  </span>
                </td>
              </tr>
            ))}
            {syncHistory.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-[#A6A6A6] italic text-[13px]">No sync history yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
