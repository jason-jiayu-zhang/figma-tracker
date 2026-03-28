import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useFigmaData } from "../useFigmaData";

export default function AddFileModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess?: () => void }) {
  const { addFile } = useFigmaData();
  const [newFileUrl, setNewFileUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const extractFileKey = (url: string) => {
    const match = url.match(/figma\.com\/(?:design|file|board)\/([a-zA-Z0-9\-_]+)/);
    return match ? match[1] : url.trim();
  };

  const handleAddFile = async () => {
    if (!newFileUrl.trim()) return;
    const finalKey = extractFileKey(newFileUrl);
    
    setIsAdding(true);
    const res = await addFile(finalKey);
    setIsAdding(false);
    
    if (res.success) {
      setNewFileUrl("");
      (onSuccess || onClose)();
    } else {
      alert("Failed to track file. Make sure the URL or key is valid.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#A6A6A6] hover:text-black transition-colors"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-3 text-black">Track a New File</h2>
        <p className="text-[#5a6070] text-base mb-6 leading-relaxed">
          Paste a Figma share link or enter the file ID directly. We'll extract the ID from the URL automatically.
        </p>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold text-black">Figma URL or File ID</label>
            <input
              autoFocus
              type="text"
              value={newFileUrl}
              onChange={(e) => setNewFileUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFile()}
              placeholder="https://www.figma.com/design/OmcL296OeqZ4xsHzNcap65/..."
              className="w-full px-4 py-3 bg-[#fffaf4] border border-[#EBEBEB] text-[#181818] rounded-xl outline-none focus:border-[#1ABCFE] focus:ring-2 focus:ring-[#1ABCFE]/20 transition-all font-mono text-base"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-medium text-[#737373] hover:bg-[#f5f5f5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddFile}
              disabled={isAdding || !newFileUrl.trim()}
              className="bg-[#1ABCFE] hover:bg-[#16a6e0] text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[120px]"
            >
              {isAdding ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Track File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
