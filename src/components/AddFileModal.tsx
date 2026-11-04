import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { Button, Modal } from "./ui";
import { extractFileKey } from "../figmaKey";

export default function AddFileModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess?: () => void }) {
  const { addFile } = useFigmaData();
  const [newFileUrl, setNewFileUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      setAddError(null);
      setNewFileUrl("");
    }
  }, [isOpen]);

  const handleAddFile = async () => {
    if (!newFileUrl.trim()) return;
    const finalKey = extractFileKey(newFileUrl);

    setAddError(null);
    setIsAdding(true);
    const res = await addFile(finalKey);
    setIsAdding(false);

    if (res.success) {
      setNewFileUrl("");
      (onSuccess || onClose)();
    } else {
      setAddError(res.error || "Failed to track file. Make sure the URL or key is valid.");
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title="Track a new file"
      description="Paste a Figma share link or enter the file ID directly. We'll pull the ID out of the URL for you."
      dismissible={!isAdding}
      footer={
        <>
          <Button variant="ghost" className="border border-line" onClick={onClose} disabled={isAdding}>Cancel</Button>
          <Button onClick={handleAddFile} disabled={isAdding || !newFileUrl.trim()} aria-busy={isAdding} className="min-w-[120px]">
            {isAdding ? (
              <>
                <div aria-hidden="true" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="sr-only">Adding…</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Track file
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="figma-url" className="text-[13px] font-bold text-muted uppercase tracking-wider">
          Figma URL or File ID <span aria-hidden="true" className="text-accent">*</span>
        </label>
        <input
          autoFocus
          id="figma-url"
          type="text"
          value={newFileUrl}
          onChange={(e) => setNewFileUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddFile()}
          placeholder="https://www.figma.com/design/<file-key>/<file-name>"
          aria-invalid={addError ? true : undefined}
          aria-describedby={addError ? "figma-url-hint figma-url-error" : "figma-url-hint"}
          className="w-full px-4 py-3 bg-canvas border border-line text-ink rounded-xl outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-[13px]"
        />
        <p id="figma-url-hint" className="text-[12px] text-muted leading-relaxed">
          The file key is the string right after <span className="font-mono text-ink">/design/</span> or <span className="font-mono text-ink">/file/</span> in the URL.
        </p>
        {addError && (
          <p id="figma-url-error" role="alert" className="text-[12px] text-red font-medium">{addError}</p>
        )}
      </div>
    </Modal>
  );
}
