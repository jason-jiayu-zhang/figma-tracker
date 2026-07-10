import React, { useState, useEffect } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useFigmaData } from "../useFigmaData";
import { formatDistanceToNow } from "date-fns";
import AddFileModal from "../components/AddFileModal";
import { Card, SectionHeader, Button, IconChip } from "../components/ui";

const rowColors = ["#f24e1e", "#a259ff", "#1abcfe", "#0acf83"];

export default function Files() {
  const { files, removeFile, refresh, loading } = useFigmaData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // The nav's "+" quick-add action deep-links here with ?add=1 — open the modal
  // and strip the param so a refresh/back doesn't re-trigger it.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setShowAddModal(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("add");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  const handleRemoveFile = async (fileKey: string) => {
    if (confirm("Are you sure you want to stop tracking this file?")) {
      await removeFile(fileKey);
    }
  };

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div aria-hidden="true" className="w-8 h-8 border-2 border-blue border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 items-start w-full mb-[50px]">
      <Card className="flex flex-col gap-5 items-start p-6 w-full h-fit">
        {/* Header */}
        <SectionHeader
          plain
          icon={<FileText size={20} />}
          title="Files Tracked"
          subtitle="Check version history for each file tracked."
          action={
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add File
            </Button>
          }
        />

        {/* Table Content */}
        {files.length > 0 && (
        <table className="content-stretch flex flex-col gap-2 items-start relative shrink-0 w-full rounded-lg pb-2">
          {/* Table Header */}
          <thead className="w-full">
            <tr className="content-stretch flex items-center justify-between pl-3 pr-[33.5px] py-1 relative shrink-0 w-full">
              <th scope="col" className="content-stretch flex flex-[1_0_0] items-center justify-start min-h-px min-w-px pr-4 relative font-medium leading-[normal] text-[14px] text-black tracking-[-0.14px]">
                File ID
              </th>
              <th scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
                File Type
              </th>
              <th scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
                User Seat
              </th>
              <th scope="col" className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[14px] text-black text-center tracking-[-0.14px]">
                Last edit
              </th>
            </tr>
          </thead>

          {/* Files List */}
          <tbody className="flex flex-col gap-2 w-full">
          {files.map((file, i) => {
            const rowColor = rowColors[i % rowColors.length];
            const lastSync = file.last_modified ? formatDistanceToNow(new Date(file.last_modified), { addSuffix: true }) : "Unknown";

            return (
              <tr
                key={file.file_key}
                className="content-stretch flex items-center justify-between pl-3 pr-4 py-3 relative rounded-lg shrink-0 w-full transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: rowColor }}
              >
                <td className="content-stretch flex flex-[1_0_0] flex-col items-start leading-[normal] min-h-px min-w-[200px] relative whitespace-nowrap overflow-hidden">
                  <span className="font-extrabold relative shrink-0 text-[18px] text-white tracking-[-0.18px] truncate max-w-[200px] w-full">
                    {file.name || "Untitled"}
                  </span>
                  <span className="font-medium relative shrink-0 text-[12px] text-white tracking-[-0.12px]">
                    {file.file_key}
                  </span>
                </td>

                <td className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-white text-center tracking-[-0.16px]">
                  Figma Design
                </td>
                <td className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-white text-center tracking-[-0.16px]">
                  Edit
                </td>
                <td className="flex-[1_0_0] font-medium leading-[normal] min-h-px min-w-px relative text-[16px] text-white text-center tracking-[-0.16px] tabular-nums">
                  {lastSync}
                </td>

                <td>
                  <button
                    aria-label={`Stop tracking ${file.name || file.file_key}`}
                    className="text-white/75 hover:text-white transition-colors p-2 rounded-full cursor-pointer hover:bg-white/10"
                    onClick={() => handleRemoveFile(file.file_key)}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
        )}

        {files.length === 0 && (
            <div className="w-full py-16 flex flex-col items-center justify-center text-center gap-4">
              <IconChip plain>
                <FileText size={20} />
              </IconChip>
              <div className="flex flex-col gap-1.5 max-w-[320px]">
                <h3 className="font-bold text-[18px] tracking-[-0.18px] text-ink">No files tracked yet</h3>
                <p className="text-[14px] text-body leading-relaxed">
                  Add a Figma file to start tracking its version history and activity.
                </p>
              </div>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Add your first file
              </Button>
            </div>
          )}
      </Card>

      {/* Add File Modal */}
      <AddFileModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); refresh(); }}
      />
    </div>
  );
}
