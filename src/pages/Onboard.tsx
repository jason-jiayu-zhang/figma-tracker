import { useState, useEffect } from "react";
import posthog from "posthog-js";
import axios from "axios";
import imgFimanuLogo from "../assets/fimanu-logo-full.svg";
import { Plus, X, Check, ArrowRight, ShieldCheck, Link2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useSession } from "../session";
import { Button, colorForKey } from "../components/ui";
import { extractFileKey } from "../figmaKey";

/* Goal-gradient head start: never show 0%. Connecting Figma already happened on
   the landing page, so the bar opens well past the starting line — the closer
   the fill looks to full, the harder it is to abandon. */
const PROGRESS = { 1: 60, 2: 100 } as const;

/** Slim progress track — the numeric head-start cue. */
function ProgressBar({ step }: { step: number }) {
  const pct = PROGRESS[step as 1 | 2] ?? 60;
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-body tracking-[-0.12px]">
          {step === 2 ? "Setup complete" : "You're almost there"}
        </span>
        <span className="text-[12px] font-bold text-green tabular-nums tracking-[-0.12px]">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-hairline overflow-hidden">
        <div
          className="h-full rounded-full bg-green transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* Real Figma keys run ~22-25 base62 chars, so this only fires once a paste
   looks like an actual key rather than a few stray characters — it's a
   confidence cue, not a validation gate (the backend still has final say). */
const MIN_RECOGNIZED_KEY_LEN = 8;

export default function Onboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refresh } = useSession();
  const [step, setStep] = useState(1); // 1: Files, 2: Success
  const [files, setFiles] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLinkHint, setShowLinkHint] = useState(false);

  useEffect(() => {
    posthog.capture('onboarding_view_step', { step });
  }, [step]);

  useEffect(() => {
    // Returning from OAuth: the session cookie is already set. Rely on it —
    // poll /api/user/me until it resolves instead of re-triggering OAuth.
    if (searchParams.get("connected") === "1" && !user) {
      let tries = 0;
      const id = setInterval(async () => {
        tries += 1;
        const u = await refresh();
        if (u || tries >= 6) clearInterval(id);
      }, 800);
      return () => clearInterval(id);
    }
  }, [searchParams, user, refresh]);

  const addFileField = () => {
    posthog.capture('onboarding_add_file_field');
    setFiles([...files, ""]);
  };
  const toggleLinkHint = () => {
    if (!showLinkHint) posthog.capture('onboarding_link_hint_open');
    setShowLinkHint((v) => !v);
  };
  const removeFileField = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles.length ? newFiles : [""]);
  };

  const updateFileField = (index: number, val: string) => {
    const newFiles = [...files];
    newFiles[index] = val;
    setFiles(newFiles);
  };

  const submitFiles = async () => {
    setError(null);
    const entries = files
      .map(raw => ({ raw, key: extractFileKey(raw) }))
      .filter(e => e.key);
    if (entries.length === 0) {
      setError("Please add at least one file key.");
      return;
    }

    posthog.capture('onboarding_submit_files', { count: entries.length });
    setIsSubmitting(true);
    // Submit all files concurrently; allSettled (rather than all) so one bad
    // link doesn't roll back files that already saved successfully.
    const results = await Promise.allSettled(
      entries.map(e => axios.post("/api/user/files", { fileKey: e.key }))
    );
    setIsSubmitting(false);

    const failed = entries.filter((_, i) => results[i].status === "rejected");
    if (failed.length === 0) {
      setStep(2);
      return;
    }

    // Leave only the failed entries so the user can fix and retry just those
    // — the rest already saved and don't need to be resubmitted.
    setFiles(failed.map(f => f.raw));
    setError(
      failed.length === entries.length
        ? "Failed to save files. Make sure the URLs or keys are valid."
        : `Saved the rest, but couldn't add: ${failed.map(f => f.raw).join(", ")}`
    );
  };

  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center p-6 gap-5">
      <img src={imgFimanuLogo} alt="Fimanu" className="h-7 w-auto" />

      <div className="w-full max-w-[540px] flex flex-col gap-7">
        <ProgressBar step={step} />

        <div
          key={step}
          className="flex flex-col gap-6 min-h-[236px] border-t border-hairline pt-7 animate-fade-in-up"
        >
          {step === 1 && (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="display text-[20px] leading-tight text-ink">Select files</h2>
                  <button
                    type="button"
                    onClick={toggleLinkHint}
                    aria-expanded={showLinkHint}
                    aria-controls="file-link-hint"
                    className="shrink-0 text-[12px] text-muted underline decoration-muted/40 underline-offset-4 transition-colors hover:text-ink"
                  >
                    Where do I find this?
                  </button>
                </div>
                <p className="text-[12px] text-muted tracking-[-0.12px]">
                  Paste a link to any file, board, or prototype — we'll grab the key and give it a color.
                </p>
                {showLinkHint && (
                  <p id="file-link-hint" className="text-[12px] text-muted leading-relaxed mt-1 animate-fade-in-up">
                    In Figma, open the file, then <span className="font-semibold text-body">Share → Copy link</span>.
                    Paste it below — we'll pull out the key for you.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {files.map((file, idx) => {
                  const key = extractFileKey(file);
                  const recognized = key.length >= MIN_RECOGNIZED_KEY_LEN;
                  return (
                    <div key={idx} className="animate-fade-in-up">
                      {recognized ? (
                        // Same idiom as a Files-page row (FileRow in Files.tsx): the whole
                        // row becomes the file's dashboard color, not just a small chip —
                        // this is a live preview of the row it'll become after tracking.
                        <div
                          key="claimed"
                          className="flex items-center gap-3 rounded-lg pl-3 pr-2 py-2.5 animate-claim"
                          style={{ backgroundColor: colorForKey(key) }}
                        >
                          <Check size={18} className="text-white shrink-0" strokeWidth={2.5} />
                          <div className="flex-1 min-w-0 flex flex-col">
                            <input
                              type="text"
                              value={file}
                              onChange={(e) => updateFileField(idx, e.target.value)}
                              aria-label={`Figma file link or key ${idx + 1}`}
                              className="w-full bg-transparent outline-none font-mono font-semibold text-[13px] text-white tracking-[-0.12px] truncate focus-visible:outline-none"
                            />
                            <span className="font-medium text-[11px] text-white/75 tracking-[-0.12px] truncate">
                              key · {key}
                            </span>
                          </div>
                          {files.length > 1 && (
                            <button
                              onClick={() => removeFileField(idx)}
                              aria-label="Remove file"
                              className="text-white/75 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 shrink-0"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          key="unclaimed"
                          className="flex items-center gap-3 rounded-lg border-2 border-dashed border-line pl-3 pr-2 py-2.5 focus-within:border-accent transition-colors"
                        >
                          <Link2 size={18} className="text-muted shrink-0" />
                          <input
                            type="text"
                            value={file}
                            onChange={(e) => updateFileField(idx, e.target.value)}
                            aria-label={`Figma file link or key ${idx + 1}`}
                            placeholder="Paste a Figma file URL or key"
                            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[13px] text-ink placeholder:text-muted"
                          />
                          {files.length > 1 && (
                            <button
                              onClick={() => removeFileField(idx)}
                              aria-label="Remove file"
                              className="text-muted hover:text-accent hover:bg-hairline transition-colors p-2 rounded-full shrink-0"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={addFileField}
                  className="flex items-center justify-center gap-2 h-11 border border-dashed border-line rounded-lg text-body hover:border-accent hover:text-accent transition-colors font-semibold text-[13px]"
                >
                  <Plus size={16} /> Add another file
                </button>
              </div>

              <p className="text-[12px] text-muted leading-relaxed">
                Prefer the raw key instead of a link? That works too — and you can always add more files later.
              </p>

              <div className="flex flex-col gap-2.5">
                <Button variant="primary" onClick={submitFiles} disabled={isSubmitting} className="h-11 w-full">
                  {isSubmitting ? "Saving…" : "Start tracking"} <ArrowRight size={18} />
                </Button>
                <button
                  onClick={() => {
                    posthog.capture('onboarding_skip_files');
                    navigate("/studio");
                  }}
                  disabled={isSubmitting}
                  className="h-11 w-full flex items-center justify-center rounded-xl text-body hover:text-ink hover:bg-hairline transition-colors font-semibold text-[13px] disabled:opacity-50"
                >
                  Skip for now
                </button>
              </div>
              {error && <p role="alert" className="text-[13px] text-red font-medium">{error}</p>}
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="display text-[20px] leading-tight text-ink">You're all set</h2>
                <p className="text-[12px] text-muted tracking-[-0.12px]">
                  We've started syncing. Full version history can take a few minutes to appear.
                </p>
              </div>
              <div className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-3">
                <div className="size-9 shrink-0 rounded-xl bg-green/10 text-green flex items-center justify-center">
                  <Check size={18} />
                </div>
                <p className="text-[13px] text-body">
                  Your files are queued and syncing in the background.
                </p>
              </div>
              <Button variant="dark" onClick={() => {
                posthog.capture('onboarding_complete');
                navigate("/studio");
              }} className="h-11 w-full">
                Go to Studio <ArrowRight size={18} />
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="text-[12px] text-muted flex items-center gap-1.5">
        <ShieldCheck size={13} /> Metadata &amp; version history only — never your design content.
      </p>
    </div>
  );
}
