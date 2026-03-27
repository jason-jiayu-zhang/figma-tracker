import React, { useState, useEffect } from "react";
import Heatmap from "../components/Heatmap";
import axios from "axios";
import { Info, FileText, Plus, X, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Onboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Connect, 2: Files, 3: Success
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if we just returned from OAuth
    if (searchParams.get("connected") === "1") {
      setIsConnected(true);
      setStep(2);
    } else {
      checkConnection();
    }
  }, [searchParams]);

  const checkConnection = async () => {
    try {
      const res = await axios.get("/api/user/me");
      if (res.data.connected) {
        setIsConnected(true);
        setStep(2);
      }
    } catch (err) {
      console.error("Failed to check connection", err);
    }
  };

  const startOAuth = async () => {
    try {
      const res = await axios.post("/api/oauth/start");
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      alert("Failed to start OAuth");
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
    const validFiles = files.map(f => f.trim()).filter(Boolean);
    if (validFiles.length === 0) {
      alert("Please add at least one file key.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure user is connected via OAuth before adding files
      const meRes = await axios.get("/api/user/me");
      if (!meRes.data?.connected) {
        // Start OAuth and include requested file keys so they're saved on callback
        const startRes = await axios.post("/api/oauth/start", { fileKeys: validFiles.join(",") });
        if (startRes.data?.url) {
          window.location.href = startRes.data.url;
          return;
        } else {
          alert("Failed to start OAuth");
          return;
        }
      }

      for (const fileKey of validFiles) {
        await axios.post("/api/user/files", { fileKey });
      }
      setStep(3);
    } catch (err) {
      alert("Failed to save files.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleData: Record<string, number> = {};
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const day = new Date(d.getTime() - i * 24 * 60 * 60 * 1000);
    sampleData[day.toISOString().slice(0, 10)] = Math.floor(Math.random() * 6);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Side: Steps/Info */}
          <div className="w-full md:w-[350px] bg-[#181818] text-white p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-10">
                <div className="w-8 h-8 bg-[#1ABCFE] rounded-lg"></div>
                <span className="text-xl font-bold tracking-tight">FigPulse</span>
              </div>

              <div className="flex flex-col gap-8">
                {[
                  { s: 1, title: "Connect Figma", desc: "Link your account" },
                  { s: 2, title: "Select Files", desc: "Choose what to track" },
                  { s: 3, title: "Ready!", desc: "Start monitoring" },
                ].map((item) => (
                  <div key={item.s} className={`flex gap-4 items-center ${step === item.s ? "opacity-100" : "opacity-40"}`}>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= item.s ? "bg-[#1ABCFE] border-[#1ABCFE]" : "border-white"}`}>
                      {step > item.s ? <CheckCircle2 size={16} /> : item.s}
                    </div>
                    <div>
                      <h4 className="font-bold leading-tight">{item.title}</h4>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-20">
              <p className="text-xs text-gray-500">
                Authorized access to file metadata and versions history only. We never read your design content.
              </p>
            </div>
          </div>

          {/* Right Side: Content */}
          <div className="flex-1 p-10 md:p-16 flex flex-col justify-center">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-4xl font-black text-[#181818] mb-4">Visualize your workflow.</h1>
                <p className="text-lg text-[#6B6B6B] mb-10 leading-relaxed">
                  Connect your Figma account to start generating activity heatmaps and tracking contributions across all your teams.
                </p>
                <button
                  onClick={startOAuth}
                  className="w-full md:w-auto bg-[#1ABCFE] text-white px-10 py-4 rounded-xl font-black text-lg hover:bg-[#16a6e0] transition-all shadow-lg hover:shadow-[#1ABCFE]/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  Connect Figma <ArrowRight size={20} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-black text-[#181818] mb-2 text-center md:text-left">Which files?</h2>
                <p className="text-[#6B6B6B] mb-8 text-center md:text-left">Add the file keys you want to monitor. You can find this in the Figma URL.</p>
                
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={file}
                        onChange={(e) => updateFileField(idx, e.target.value)}
                        placeholder="Enter file key (e.g. ABC123XYZ)"
                        className="flex-1 px-4 py-3 bg-[#f9f9f9] border-2 border-transparent focus:border-[#1ABCFE] rounded-xl outline-none transition-all font-mono text-sm"
                      />
                      {files.length > 1 && (
                        <button onClick={() => removeFileField(idx)} className="p-3 text-gray-400 hover:text-red-500 transition-colors">
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-6">
                  <button 
                    onClick={addFileField}
                    className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-[#1ABCFE] hover:text-[#1ABCFE] transition-all font-bold"
                  >
                    <Plus size={18} /> Add another file
                  </button>

                  <button
                    onClick={submitFiles}
                    disabled={isSubmitting}
                    className="bg-[#1ABCFE] text-white py-4 rounded-xl font-black text-lg hover:bg-[#16a6e0] transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? "Saving..." : "Start Tracking"} <CheckCircle2 size={20} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-[#0ACF83]/10 text-[#0ACF83] rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-4xl font-black text-[#181818] mb-4">You're all set!</h2>
                <p className="text-lg text-[#6B6B6B] mb-10">We've started syncing your files. It may take a few minutes for the full history to appear on your dashboard.</p>
                <button
                  onClick={() => navigate("/")}
                  className="bg-[#181818] text-white px-12 py-4 rounded-xl font-black text-lg hover:bg-black transition-all active:scale-95"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
