import React from "react";
import { Link, useLocation } from "react-router";
import { useSession } from "../session";
import { FileText, Wand2, Settings as SettingsIcon, Plus, User as UserIcon } from "lucide-react";
import { SHELL } from "./ui";

const NAV = [
  { to: "/files", label: "Files", icon: <FileText size={15} /> },
  { to: "/studio", label: "Studio", icon: <Wand2 size={15} /> },
];

/** Floating top navigation: the app's primary destinations on the left, account
   and settings on the right. Shares the Studio header's pill language so the
   canvas pages and the list pages read as one surface.
   Fixed to the SHELL column rather than each page's own layout, so the pills
   land on identical coordinates on every route and never jump on navigation. */
const PILL_SURFACE = "p-1 rounded-full bg-surface border border-hairline shadow-card";

function useIsActive() {
  const path = useLocation().pathname;
  return (p: string) => path === p || (p !== "/" && path.startsWith(p));
}

/** Primary destinations + quick-add. `bare` drops the pill container's own
   surface so it can sit inside another card (the Studio header). */
export function PrimaryNav({ bare = false }: { bare?: boolean }) {
  const isActive = useIsActive();
  return (
      <nav
        aria-label="Primary"
        className={`flex items-center gap-1 ${bare ? "" : PILL_SURFACE}`}
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={isActive(item.to) ? "page" : undefined}
            title={item.label}
            className={`flex items-center gap-1.5 h-8 px-3 sm:px-3.5 rounded-full text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive(item.to) ? "bg-canvas text-ink ring-1 ring-accent/30" : "text-muted hover:text-ink"
            }`}
          >
            {item.icon}
            <span className="max-sm:sr-only">{item.label}</span>
          </Link>
        ))}

        {/* Quick-add is an ACTION, not a destination — accent-filled so it reads
            as "create". Opens the Add File modal from anywhere via /files?add=1. */}
        <Link
          to="/files?add=1"
          title="Track a new file"
          aria-label="Track a new file"
          className="flex items-center justify-center size-8 rounded-full bg-accent text-white transition-[background-color,transform] duration-150 ease-out hover:bg-accent-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={3} />
        </Link>
      </nav>
  );
}

/** Settings + account. `bare` as above. */
export function AccountNav({ bare = false }: { bare?: boolean }) {
  const { user } = useSession();
  const isActive = useIsActive();
  return (
      <div className={`flex items-center gap-1 ${bare ? "" : PILL_SURFACE}`}>
        <Link
          to="/settings"
          title="Settings"
          aria-label="Settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={`flex items-center justify-center size-8 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            isActive("/settings") ? "bg-canvas text-ink ring-1 ring-accent/30" : "text-muted hover:text-ink"
          }`}
        >
          <SettingsIcon size={16} />
        </Link>
        <Link
          to="/settings"
          title="Account"
          aria-label="Account"
          className="size-8 rounded-full overflow-hidden bg-canvas flex items-center justify-center text-muted transition-transform duration-150 ease-out hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {user?.img_url ? (
            <img alt={user.handle || "Profile"} className="block size-full object-cover" src={user.img_url} />
          ) : (
            <UserIcon size={16} />
          )}
        </Link>
      </div>
  );
}

export default function TopNav() {
  return (
    <div className={`fixed top-6 inset-x-0 z-40 flex items-center justify-between gap-3 ${SHELL}`}>
      <PrimaryNav />
      <AccountNav />
    </div>
  );
}
