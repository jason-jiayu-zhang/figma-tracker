import React from "react";
import { format } from "date-fns";
import { FigmaFile } from "../types";
import { FileText } from "lucide-react";

export default function FilesTable({
  files,
  onFileClick,
}: {
  files: FigmaFile[];
  onFileClick: (f: FigmaFile) => void;
}) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[8px] flex-shrink-0" style={{ background: "#A259FF1A", color: "#A259FF" }}>
            <FileText size={14} />
          </div>
          <div>
            <div className="text-[14px] font-semibold">Tracked Files</div>
          </div>
        </div>
        {files.length > 0 && (
          <div className="text-[11px] text-[#A6A6A6] bg-[rgba(255,255,255,0.04)] border border-[#EBEBEB] px-2 py-1 rounded-[20px] font-semibold">{files.length} file{files.length !== 1 ? "s" : ""}</div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#F5F5F5]">
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">File</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">Team / Project</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">Versions</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider">Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, i) => (
              <tr key={file.id} className={`hover:bg-[#F9F9F9] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                <td className="px-6 py-4">
                  <button className="text-[13px] font-bold text-[#1ABCFE] hover:underline" onClick={() => onFileClick(file)}>
                    {file.name}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[12px] font-medium text-[#A6A6A6] bg-[#F5F5F5] border border-[#EBEBEB] px-2 py-0.5 rounded-md">{file.teamName ?? "No Team"}</span>
                </td>
                <td className="px-6 py-4 text-[13px] tabular-nums text-[#181818]">{file.versionCount}</td>
                <td className="px-6 py-4 text-[13px] text-[#A6A6A6]">{file.last_modified ? format(new Date(file.last_modified), "MMM d, yyyy") : "—"}</td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-[#A6A6A6] italic text-[13px]">No files tracked yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
