import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { Button } from "./ui";

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
      <div className="bg-surface rounded-3xl shadow-xl w-full max-w-lg p-8 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-muted hover:text-ink transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-3 text-ink">Track a New File</h2>
        <p className="text-body text-base mb-6 leading-relaxed">
          Paste a Figma share link or enter the file ID directly. We'll extract the ID from the URL automatically.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold text-ink">Figma URL or File ID</label>
            <input
              autoFocus
              type="text"
              value={newFileUrl}
              onChange={(e) => setNewFileUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFile()}
              placeholder="https://www.figma.com/design/<file-key>/<file-name>"
              className="w-full px-4 py-3 bg-canvas border border-line text-ink rounded-xl outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-base"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAddFile} disabled={isAdding || !newFileUrl.trim()} className="min-w-[120px]">
              {isAdding ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Track File
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
