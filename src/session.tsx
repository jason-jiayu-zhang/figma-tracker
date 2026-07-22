import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import posthog from "posthog-js";

// Shape returned by GET /api/user/me (200 = logged in, 401 = not).
export interface SessionUser {
  figma_user_id: string;
  handle: string | null;
  img_url: string | null;
  profile_slug: string | null;
  public_enabled: boolean;
}

interface SessionState {
  user: SessionUser | null;
  loggedIn: boolean;
  loading: boolean;
  // Re-fetch /api/user/me. Returns the fresh user (or null if not logged in).
  refresh: () => Promise<SessionUser | null>;
}

const SessionContext = createContext<SessionState>({
  user: null,
  loggedIn: false,
  loading: true,
  refresh: async () => null,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await axios.get("/api/user/me");
      const u = res.data as SessionUser;
      setUser(u);
      posthog.identify(u.figma_user_id, {
        name: u.handle ?? undefined,
      });
      return u;
    } catch {
      // 401 (or network) => treat as logged out.
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider
      value={{ user, loggedIn: !!user, loading, refresh }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
