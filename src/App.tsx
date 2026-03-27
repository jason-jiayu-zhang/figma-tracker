import React from "react";
import { Routes, Route, Link, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import Dashboard from "./pages/Dashboard";
import Embed from "./pages/Embed";
import EmbedWidget from "./pages/EmbedWidget";
import { useFigmaData } from "./useFigmaData";
import Onboard from "./pages/Onboard";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";

function Header({ stats }: { stats: any }) {

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div className="w-full px-6 py-0 h-[60px] flex items-center justify-end">

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: stats?.myFigmaUserId ? "#0acf83" : "var(--text-muted)",
              }}
            >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: stats?.myFigmaUserId ? "#0acf83" : "#5a6070",
                display: "inline-block",
                boxShadow: stats?.myFigmaUserId ? "0 0 8px #0acf8380" : "none",
              }}
            />
            {stats?.myFigmaUserId ? "Connected" : "Not connected"}
          </div>
          <button
            onClick={async () => {
              try {
                const res = await axios.post("/api/oauth/start");
                if (res.data?.url) window.location.href = res.data.url;
                else alert("Failed to start OAuth");
              } catch (err) {
                console.error("start oauth failed", err);
                alert("Failed to start OAuth");
              }
            }}
            className="ml-4 px-3 py-1.5 rounded-lg font-bold"
            style={{
              background: "#1ABCFE",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              border: "none",
              cursor: "pointer",
            }}
          >
            Connect
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  const { stats, loading } = useFigmaData();
  const [searchParams] = useSearchParams();
  const forceOnboard = searchParams.get("onboard") === "1";
  const justConnected = searchParams.get("connected") === "1";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1ABCFE]"></div>
      </div>
    );
  }

  const location = useLocation();
  const isWidget = location.pathname === "/embed-widget";
  const isOnboarding = !isWidget && (forceOnboard || justConnected || !stats?.myFigmaUserId);

  if (isOnboarding) {
    return (
      <Routes>
        <Route path="*" element={<Onboard />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/embed-widget" element={<EmbedWidget />} />
      <Route path="*" element={
        <div className="bg-[#fffaf4] overflow-x-hidden">
          {/* Viewport block for Nav Bar and Main Content */}
          <div className="w-full min-h-screen flex items-center justify-center py-[16px]">
            <div className="flex flex-row gap-[32px] w-[1020px] max-w-full relative">
              <Sidebar className="bg-white flex flex-col gap-[48px] h-[768px] items-start justify-center px-[12px] py-[8px] relative rounded-[32px] shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-[88px]" />
              
              <div className="flex flex-col w-[900px] max-w-full shrink-0">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/embed" element={<Embed />} />
                </Routes>
              </div>
            </div>
          </div>

          {/* Footer naturally flows below the fold */}
          <div className="w-full flex justify-center pb-[32px]">
            <Routes>
              <Route path="/" element={<Footer />} />
              <Route path="/embed" element={<Footer />} />
            </Routes>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;
