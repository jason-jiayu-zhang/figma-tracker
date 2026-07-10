import React, { Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import DashboardSkeleton from "./components/DashboardSkeleton";
import { useSession } from "./session";
import { IS_APP_MODE } from "./config";

const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Embed = React.lazy(() => import("./pages/Embed"));
const EmbedWidget = React.lazy(() => import("./pages/EmbedWidget"));
const Onboard = React.lazy(() => import("./pages/Onboard"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Files = React.lazy(() => import("./pages/Files"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Settings = React.lazy(() => import("./pages/Settings"));
const PublicProfile = React.lazy(() => import("./pages/PublicProfile"));

function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="min-h-dvh bg-hairline flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div aria-hidden="true" className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue" />
        {label && (
          <span className="text-[12px] text-muted uppercase tracking-[0.12em] font-semibold">
            {label}
          </span>
        )}
        <span className="sr-only">{label ?? "Loading"}</span>
      </div>
    </div>
  );
}

// Kick off Figma OAuth (POST /api/oauth/start → { url }).
async function startOAuth() {
  try {
    const res = await axios.post("/api/oauth/start");
    if (res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
  } catch (err) {
    console.error("Failed to start OAuth:", err);
  }
}

function OAuthRedirect() {
  useEffect(() => {
    startOAuth();
  }, []);
  return <Spinner label="Redirecting to Figma…" />;
}

// The authenticated dashboard shell: sidebar + routed content + footer.
function AppLayout() {
  return (
    <div className="bg-canvas overflow-x-clip">
      <div className="w-full min-h-dvh flex items-start justify-center py-6 px-6 lg:px-8">
        <div className="flex flex-row gap-8 w-[1080px] max-w-full relative items-start">
          <Sidebar className="bg-surface flex flex-col items-center justify-between sticky top-6 h-[calc(100dvh-3rem)] px-3 py-4 rounded-4xl shadow-card shrink-0 w-22" />
          <div className="flex flex-col flex-1 min-w-0 shrink-0 min-h-[calc(100dvh-3rem)]">
            <Suspense fallback={<DashboardSkeleton />}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/files" element={<Files />} />
                <Route path="/embed" element={<Embed />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                {/* Legacy alias */}
                <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-center pb-8">
        <Footer />
      </div>
    </div>
  );
}

// App-subdomain (dashboard) routing, gated on the cookie session.
function AppRoutes() {
  const { loggedIn, loading, refresh } = useSession();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";
  const path = location.pathname;

  // Right after OAuth (?connected=1) the session cookie is set synchronously by
  // the backend, but the SPA may have loaded /me before the redirect landed.
  // Poll a few times instead of re-triggering OAuth (fixes the login loop).
  useEffect(() => {
    if (!justConnected || loggedIn) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      const u = await refresh();
      if (u || tries >= 6) clearInterval(id);
    }, 800);
    return () => clearInterval(id);
  }, [justConnected, loggedIn, refresh]);

  if (loading) return <Spinner label="Loading" />;

  if (!loggedIn) {
    // Let the self-serve onboarding flow render (it drives its own connect),
    // and keep showing it while we poll for the freshly-set session.
    if (path === "/onboard" || justConnected) {
      return (
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/onboard" element={<Onboard />} />
            <Route path="*" element={<Onboard />} />
          </Routes>
        </Suspense>
      );
    }
    // Any other app route with no session → straight to OAuth.
    return <OAuthRedirect />;
  }

  // Logged in: onboarding is still reachable (add-files step), everything else
  // renders in the dashboard shell. Root auto-redirects to /dashboard.
  return (
    <Suspense fallback={<Spinner label="Loading" />}>
      <Routes>
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const path = location.pathname;
  const standalone = searchParams.get("standalone") === "1";

  // 1. Embed widget — fully public, no auth/session gating.
  const isWidget =
    path === "/embed-widget" || path === "/cattlelog-embed" || standalone;
  if (isWidget) {
    return (
      <Suspense fallback={null}>
        <Routes>
          <Route path="*" element={<EmbedWidget />} />
        </Routes>
      </Suspense>
    );
  }

  // 2. Public profile — fully public, no auth.
  if (path.startsWith("/u/")) {
    return (
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/u/:slug" element={<PublicProfile />} />
        </Routes>
      </Suspense>
    );
  }

  // 3. Marketing site (root domain): render the Landing page only.
  if (!IS_APP_MODE) {
    return (
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    );
  }

  // 4. Dashboard app (app.* subdomain or VITE_IS_APP=1).
  return <AppRoutes />;
}

export default App;
