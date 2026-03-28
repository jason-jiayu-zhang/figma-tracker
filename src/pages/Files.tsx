import React, { useState } from "react";
import { Plus, X, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { formatDistanceToNow } from "date-fns";
import AddFileModal from "../components/AddFileModal";

const rowColors = ["#f24e1e", "#9851f9", "#1abcfe", "#0acf83"];

export default function Files() {
  const { files, removeFile, refresh, loading } = useFigmaData();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleRemoveFile = async (fileKey: string) => {
    if (confirm("Are you sure you want to stop tracking this file?")) {
      await removeFile(fileKey);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1abcfe] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="content-stretch flex flex-col gap-6 items-start relative shrink-0 w-full mb-[50px]">
      <div className="bg-white content-stretch flex flex-col gap-4 items-start justify-center p-6 relative rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-full h-fit">
        {/* Header */}
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <div className="content-stretch flex gap-3 items-center relative shrink-0">
            <div className="relative shrink-0 size-10 flex items-center justify-center rounded-xl bg-[#fffaf4] text-[#1abcfe]">
              <FileText size={20} />
            </div>
            <div className="content-stretch flex flex-col gap-1 items-start leading-[normal] relative shrink-0 text-black whitespace-nowrap">
              <p className="font-semibold relative shrink-0 text-[24px] tracking-[-0.24px]">
                Files Tracked
              </p>
              <p className="font-normal relative shrink-0 text-[12px] tracking-[-0.12px] text-[#737373]">
                Check version history for each file tracked.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#fffaf4] hover:bg-[#f5ebd9] transition-colors content-stretch flex gap-2 h-9 items-center justify-center pl-[14px] pr-4 py-1.5 relative rounded-lg shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-40"
          >
            <Plus size={16} className="text-black" />
            <p className="font-normal leading-5 relative shrink-0 text-[16px] text-black tracking-[-0.16px] whitespace-nowrap">
              Add File
            </p>
          </button>
        </div>

        {/* Table Content */}
        <div className="content-stretch flex flex-col gap-2 items-start relative shrink-0 w-full rounded-lg pb-2 mt-4">
          {/* Table Header */}
          <div className="content-stretch flex items-center justify-between pl-3 pr-[33.5px] py-1 relative shrink-0 w-full">
            <div className="content-stretch flex flex-[1_0_0] items-center justify-start min-h-px min-w-px pr-4 relative">
              <p className="font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black tracking-[-0.14px]">
                File ID
              </p>
            </div>
            <p className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
              File Type
            </p>
            <p className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
              User Seat
            </p>
            <p className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
              Last edit
            </p>
          </div>

          {/* Files List */}
          {files.map((file, i) => {
            const rowColor = rowColors[i % rowColors.length];
            const lastSync = file.last_modified ? formatDistanceToNow(new Date(file.last_modified), { addSuffix: true }) : "Unknown";

            return (
              <div
                key={file.file_key}
                className="content-stretch flex items-center justify-between pl-3 pr-4 py-3 relative rounded-lg shrink-0 w-full transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: rowColor }}
              >
                <div className="content-stretch flex flex-[1_0_0] flex-col items-start leading-[normal] min-h-px min-w-[200px] relative whitespace-nowrap overflow-hidden">
                  <p className="font-extrabold relative shrink-0 text-[18px] text-white tracking-[-0.18px] truncate max-w-[200px] w-full">
                    {file.name || "Untitled"}
                  </p>
                  <p className="font-medium relative shrink-0 text-[12px] text-[rgba(255,255,255,0.75)] tracking-[-0.12px]">
                    {file.file_key}
                  </p>
                </div>

                <p className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-[rgba(255,255,255,0.75)] text-center tracking-[-0.16px]">
                  Figma Design
                </p>
                <p className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-[rgba(255,255,255,0.75)] text-center tracking-[-0.16px]">
                  Edit
                </p>
                <p className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-[rgba(255,255,255,0.75)] text-center tracking-[-0.16px]">
                  {lastSync}
                </p>

                <button
                  className="text-[rgba(255,255,255,0.75)] hover:text-white transition-colors p-2 rounded-full cursor-pointer hover:bg-white/10"
                  onClick={() => handleRemoveFile(file.file_key)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}

          {files.length === 0 && (
            <div className="w-full py-12 flex flex-col items-center justify-center text-[#737373]">
              <FileText size={48} className="mb-4 opacity-50" />
              <p>No files are currently tracked.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-[#1abcfe] font-medium hover:underline"
              >
                Add your first file
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add File Modal */}
      <AddFileModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); refresh(); }}
      />
    </div>
  );
}
