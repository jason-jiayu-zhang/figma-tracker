import React, { useState, useEffect } from "react";
import axios from "axios";
import imgFimanuLogo from "../assets/FimanuLogoFull.svg";
import { Plus, X, Check, ArrowRight, Figma, FolderPlus, Sparkles, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "../session";
import { Card, Button, SectionHeader } from "../components/ui";

const STEPS = [
  { n: 1, label: "Connect" },
  { n: 2, label: "Files" },
  { n: 3, label: "Done" },
];

/* Goal-gradient head start: never show 0%. Just landing here earns credit, so
   the bar reads as already-in-motion rather than an empty starting line. The
   closer the fill looks to full, the harder it is to abandon. */
const PROGRESS = { 1: 25, 2: 65, 3: 100 } as const;

/** Slim progress track above the stepper — the numeric head-start cue. */
function ProgressBar({ step }: { step: number }) {
  const pct = PROGRESS[step as 1 | 2 | 3] ?? 25;
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-body tracking-[-0.12px]">
          {step === 3 ? "Setup complete" : "You're almost there"}
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

/** Horizontal progress stepper built from the dashboard's chip motif. */
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-start w-full">
      {STEPS.map((s, i) => {
        const done = step > s.n;
        const current = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-2 w-14 shrink-0">
              <div
                className={`size-10 rounded-xl flex items-center justify-center font-bold text-[14px] transition-colors ${
                  done
                    ? "bg-green text-white"
                    : current
                      ? "bg-blue text-white shadow-sm"
                      : "bg-hairline text-muted"
                }`}
              >
                {done ? <Check size={18} /> : s.n}
              </div>
              <span
                className={`text-[11px] tracking-[0.02em] leading-none transition-colors ${
                  current ? "text-ink font-semibold" : done ? "text-body font-medium" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-[2px] flex-1 rounded-full mt-5 transition-colors ${step > s.n ? "bg-green" : "bg-line"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* Smart default: shift the user's task from "hunt down the file key" to just
   "paste the URL". Accepts a full Figma link (…/design/KEY/…, /file/, /proto/,
   /board/) and returns the bare key; anything else passes straight through so a
   raw key still works. */
function extractFileKey(input: string): string {
  const val = input.trim();
  const m = val.match(/figma\.com\/(?:file|design|proto|board)\/([A-Za-z0-9]+)/i);
  return m ? m[1] : val;
}

export default function Onboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refresh } = useSession();
  const [step, setStep] = useState(1); // 1: Connect, 2: Files, 3: Success
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the local "connected" flag in sync with the cookie session.
  useEffect(() => {
    if (user) {
      setIsConnected(true);
      setStep((s) => (s < 2 ? 2 : s));
    }
  }, [user]);

  useEffect(() => {
    const forcedStep = searchParams.get("step");
    if (forcedStep) {
      setStep(parseInt(forcedStep));
      return;
    }

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

  const startOAuth = async () => {
    setError(null);
    try {
      const res = await axios.post("/api/oauth/start");
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError("Failed to start OAuth");
      }
    } catch (err) {
      setError("Failed to start OAuth");
    }
  };

  const addFileField = () => setFiles([...files, ""]);
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
    const validFiles = files.map(f => extractFileKey(f)).filter(Boolean);
    if (validFiles.length === 0) {
      setError("Please add at least one file key.");
      return;
    }

    // The session is guaranteed by the time we reach the files step, so just add.
    if (!isConnected && !user) {
      // Session not established yet — send the user back to connect.
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit all files concurrently for faster optimistic UI response
      await Promise.all(validFiles.map(fileKey => axios.post("/api/user/files", { fileKey })));

      setStep(3);
    } catch (err) {
      setError("Failed to save files.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center p-6 gap-5">
      <img src={imgFimanuLogo} alt="Fimanu" className="h-7 w-auto" />

      <Card className="w-full max-w-[540px] p-7 flex flex-col gap-7">
        <ProgressBar step={step} />
        <Stepper step={step} />

        <div className="h-px bg-line w-full" />

        <div
          key={step}
          className="flex flex-col gap-6 min-h-[236px] animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {step === 1 && (
            <>
              <SectionHeader
                plain
                icon={<Figma size={20} />}
                title="Connect Figma"
                subtitle="Link your account to generate activity heatmaps and track contributions across your teams."
              />
              <div className="bg-canvas rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck size={18} className="text-green shrink-0 mt-0.5" />
                <p className="text-[13px] text-body leading-relaxed">
                  We request read access to <span className="text-ink font-medium">file metadata, version history, and comments</span> only — never your design content.
                </p>
              </div>
              <Button variant="primary" onClick={startOAuth} className="h-11 w-full">
                Connect Figma <ArrowRight size={18} />
              </Button>
              {error && <p role="alert" className="text-[13px] text-accent font-medium">{error}</p>}
            </>
          )}

          {step === 2 && (
            <>
              <SectionHeader
                plain
                icon={<FolderPlus size={20} />}
                title="Select files"
                subtitle="Paste a Figma file link for anything you want to monitor — we'll pull out the key for you."
              />

              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {files.map((file, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={file}
                      onChange={(e) => updateFileField(idx, e.target.value)}
                      aria-label={`Figma file link or key ${idx + 1}`}
                      placeholder="Paste a Figma file URL or key"
                      className="flex-1 px-4 h-11 bg-canvas border border-line focus:border-accent rounded-xl outline-none transition-colors font-mono text-[13px] text-ink placeholder:text-muted"
                    />
                    {files.length > 1 && (
                      <button
                        onClick={() => removeFileField(idx)}
                        aria-label="Remove file"
                        className="size-11 shrink-0 flex items-center justify-center rounded-xl text-muted hover:text-accent hover:bg-hairline transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addFileField}
                  className="flex items-center justify-center gap-2 h-11 border border-dashed border-line rounded-xl text-body hover:border-accent hover:text-accent transition-colors font-semibold text-[13px]"
                >
                  <Plus size={16} /> Add another file
                </button>
              </div>

              <p className="text-[13px] text-body leading-relaxed">
                Just paste the whole file URL — we grab the key automatically. Prefer the raw key? That works too. At least one is required; you can add more later.
              </p>

              <Button variant="primary" onClick={submitFiles} disabled={isSubmitting} className="h-11 w-full">
                {isSubmitting ? "Saving…" : "Start tracking"} <ArrowRight size={18} />
              </Button>
              {error && <p role="alert" className="text-[13px] text-accent font-medium">{error}</p>}
            </>
          )}

          {step === 3 && (
            <>
              <SectionHeader
                plain
                icon={<Sparkles size={20} />}
                title="You're all set"
                subtitle="We've started syncing. Full version history can take a few minutes to appear."
              />
              <div className="bg-canvas rounded-2xl p-4 flex items-center gap-3">
                <div className="size-9 shrink-0 rounded-xl bg-green/10 text-green flex items-center justify-center">
                  <Check size={18} />
                </div>
                <p className="text-[13px] text-body">
                  Your files are queued and syncing in the background.
                </p>
              </div>
              <Button variant="dark" onClick={() => navigate("/dashboard")} className="h-11 w-full">
                Go to Dashboard <ArrowRight size={18} />
              </Button>
            </>
          )}
        </div>
      </Card>

      <p className="text-[12px] text-muted flex items-center gap-1.5">
        <ShieldCheck size={13} /> Metadata &amp; version history only — never your design content.
      </p>
    </div>
  );
}
