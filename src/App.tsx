import React, { Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import Footer from "./components/Footer";
import TopNav from "./components/TopNav";
import { SHELL, SHELL_TOP_PAD } from "./components/ui";
import { useSession } from "./session";
import { IS_APP_MODE } from "./config";

const Studio = React.lazy(() => import("./pages/Studio"));
const EmbedWidget = React.lazy(() => import("./pages/EmbedWidget"));
const Onboard = React.lazy(() => import("./pages/Onboard"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Files = React.lazy(() => import("./pages/Files"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const About = React.lazy(() => import("./pages/About"));
const Docs = React.lazy(() => import("./pages/Docs"));

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

// The authenticated dashboard shell: floating top nav + routed content + footer.
function AppLayout() {
  return (
    <div className="bg-canvas overflow-x-clip">
      <TopNav />
      <div className={`flex flex-col min-h-dvh pb-6 ${SHELL} ${SHELL_TOP_PAD}`}>
        <Suspense fallback={<Spinner label="Loading" />}>
          <Routes>
            <Route path="/files" element={<Files />} />
            <Route path="/settings" element={<Settings />} />
            {/* Legacy alias */}
            <Route path="/home" element={<Navigate to="/studio" replace />} />
            <Route path="*" element={<Navigate to="/studio" replace />} />
          </Routes>
        </Suspense>
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
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";
  const loggedOut = searchParams.get("loggedout") === "1";

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
    // Just back from OAuth: keep onboarding on screen while we poll for the
    // freshly-set session cookie instead of bouncing into OAuth again.
    if (justConnected) {
      return (
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="*" element={<Onboard />} />
          </Routes>
        </Suspense>
      );
    }
    // Just logged out (or deleted the account): land on the marketing page
    // rather than bouncing straight back into Figma OAuth.
    if (loggedOut) {
      return (
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      );
    }
    // Onboarding now starts at the add-files step, so a session is required —
    // any app route with no session goes straight to OAuth.
    return <OAuthRedirect />;
  }

  // Logged in: onboarding is still reachable (add-files step), everything else
  // renders in the dashboard shell. Root auto-redirects to /studio.
  return (
    <Suspense fallback={<Spinner label="Loading" />}>
      <Routes>
        <Route path="/onboard" element={<Onboard />} />
        {/* Studio is a full-screen canvas — no sidebar/AppLayout shell. */}
        <Route path="/studio" element={<Studio />} />
        <Route path="/" element={<Navigate to="/studio" replace />} />
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
  const isWidget = path === "/embed-widget" || standalone;
  if (isWidget) {
    return (
      <Suspense fallback={null}>
        <Routes>
          <Route path="*" element={<EmbedWidget />} />
        </Routes>
      </Suspense>
    );
  }

  // 2. Public content pages — reachable signed-out on any domain.
  if (
    path === "/privacy" ||
    path === "/terms" ||
    path === "/about" ||
    path === "/docs"
  ) {
    return (
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/about" element={<About />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </Suspense>
    );
  }

  // 3 & 4. Routing based on domain mode.
  if (IS_APP_MODE) {
    // Dashboard app only (app.* subdomain or VITE_IS_APP=1).
    return <AppRoutes />;
  }

  // Root domain: serve Marketing on `/`, App on specific paths.
  if (
    path.startsWith("/studio") ||
    path.startsWith("/files") ||
    path.startsWith("/settings") ||
    path.startsWith("/onboard") ||
    path.startsWith("/home")
  ) {
    return <AppRoutes />;
  }

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  );
}

export default App;
