import React, { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import posthog from "posthog-js";
import { useFigmaData } from "../useFigmaData";
import { Button } from "./ui";

export default function AddFileModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { addFile } = useFigmaData();
  const [newFileUrl, setNewFileUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // Drives the subtle scale+fade entrance (flips true one frame after mount).
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      setShown(false);
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [isOpen, onClose]);

  const extractFileKey = (url: string) => {
    const match = url.match(
      /figma\.com\/(?:design|file|board)\/([a-zA-Z0-9\-_]+)/,
    );
    return match ? match[1] : url.trim();
  };

  const handleAddFile = async () => {
    if (!newFileUrl.trim()) return;
    const finalKey = extractFileKey(newFileUrl);

    setAddError(null);
    setIsAdding(true);
    const res = await addFile(finalKey);
    setIsAdding(false);

    if (res.success) {
      posthog.capture("file_added");
      setNewFileUrl("");
      (onSuccess || onClose)();
    } else {
      setAddError("Failed to track file. Make sure the URL or key is valid.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ease-out ${shown ? "opacity-100" : "opacity-0"}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="addfile-title"
        className={`bg-surface rounded-3xl shadow-card w-full max-w-lg p-8 relative transition-transform duration-200 ease-out ${shown ? "scale-100" : "scale-95"}`}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-6 right-6 text-muted hover:text-ink transition-colors"
        >
          <X size={24} />
        </button>

        <h2 id="addfile-title" className="text-2xl font-bold mb-3 text-ink">
          Track a New File
        </h2>
        <p className="text-body text-base mb-6 leading-relaxed">
          Paste a Figma share link or enter the file ID directly. We'll extract
          the ID from the URL automatically.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="figma-url"
              className="text-base font-semibold text-ink"
            >
              Figma URL or File ID{" "}
              <span aria-hidden="true" className="text-accent">
                *
              </span>
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
              aria-describedby={
                addError ? "figma-url-hint figma-url-error" : "figma-url-hint"
              }
              className="w-full px-4 py-3 bg-canvas border border-line text-ink rounded-xl outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-base"
            />
            <p
              id="figma-url-hint"
              className="text-[13px] text-body leading-relaxed"
            >
              The file key is the string right after{" "}
              <span className="font-mono text-ink">/design/</span> or{" "}
              <span className="font-mono text-ink">/file/</span> in the URL.
            </p>
          </div>

          {addError && (
            <p
              id="figma-url-error"
              role="alert"
              className="text-sm text-accent font-medium"
            >
              {addError}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFile}
              disabled={isAdding || !newFileUrl.trim()}
              aria-busy={isAdding}
              className="min-w-[120px]"
            >
              {isAdding ? (
                <>
                  <div
                    aria-hidden="true"
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  <span className="sr-only">Adding…</span>
                </>
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
