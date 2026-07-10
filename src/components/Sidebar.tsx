import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "../session";
import { User as UserIcon } from "lucide-react";

import imgNavDashboard from "../assets/NavDashboard.svg";
import imgNavFiles from "../assets/NavFiles.svg";
import imgNavEmbed from "../assets/NavEmbed.svg";
import imgNavNew from "../assets/NavNew.svg";
import imgNavSettings from "../assets/NavSettings.svg";

function NavIcon({
  icon,
  to,
  active,
  label,
}: {
  icon: string;
  to: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={`flex h-12 items-center justify-center overflow-clip p-3 relative rounded-4xl shrink-0 w-full transition-[background-color,box-shadow] duration-150 ease-out ${
        active
          ? "bg-hairline shadow-inner border border-transparent"
          : "bg-canvas shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#f0f0f0]"
      }`}
    >
      <div className="relative shrink-0 size-6">
        <img alt="" className="block max-w-none size-full pointer-events-none opacity-80" src={icon} />
      </div>
    </Link>
  );
}

export default function Sidebar({ className }: { className?: string }) {
  const { user } = useSession();
  const location = useLocation();
  const path = location.pathname;

  const isActive = (p: string) => path === p || (p !== "/" && path.startsWith(p));

  const navItems = [
    { icon: imgNavDashboard, path: "/dashboard", label: "Dashboard" },
    { icon: imgNavFiles, path: "/files", label: "Files" },
    { icon: imgNavEmbed, path: "/embed", label: "Embed" },
  ];

  return (
    <div className={className} data-name="Nav Bar">
      {/* Top: avatar + primary navigation */}
      <div className="flex flex-col gap-8 items-start w-full">
        <Link
          to="/profile"
          title="Profile"
          aria-label="Profile"
          className={`aspect-square bg-canvas flex items-center justify-center overflow-hidden relative rounded-4xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full transition-[transform,border-color] duration-150 ease-out hover:scale-105 active:scale-95 border-2 ${
            isActive("/profile") ? "border-[#1ABCFE]" : "border-transparent"
          }`}
        >
          {user?.img_url ? (
            <img alt={user.handle || "Profile"} className="block size-full object-cover" src={user.img_url} />
          ) : (
            <div className="flex items-center justify-center size-full text-muted">
              <UserIcon size={24} />
            </div>
          )}
        </Link>

        <nav aria-label="Primary" className="flex flex-col gap-4 items-start px-2 relative shrink-0 w-16">
          <ul className="flex flex-col gap-4 items-start w-full">
            {navItems.map((item) => (
              <li key={item.path} className="w-full">
                <NavIcon icon={item.icon} to={item.path} active={isActive(item.path)} label={item.label} />
              </li>
            ))}
          </ul>

          {/* Quick-add: an ACTION, not a page — accent-styled so it reads as "create".
              Opens the Add File modal from anywhere via /files?add=1. */}
          <Link
            to="/files?add=1"
            title="Track a new file"
            aria-label="Track a new file"
            className="flex h-12 items-center justify-center overflow-clip p-3 relative rounded-4xl shrink-0 w-full transition-[background-color,transform] duration-150 ease-out bg-accent hover:bg-accent-hover active:scale-95 shadow-[0px_1px_3px_0px_rgba(242,59,39,0.4)]"
          >
            <div className="relative shrink-0 size-6">
              <img
                alt=""
                className="block max-w-none size-full pointer-events-none brightness-0 invert opacity-95"
                src={imgNavNew}
              />
            </div>
          </Link>
        </nav>
      </div>

      {/* Bottom-pinned: settings */}
      <div className="flex flex-col gap-4 items-start px-2 relative shrink-0 w-16">
        <NavIcon icon={imgNavSettings} to="/settings" active={isActive("/settings")} label="Settings" />
      </div>
    </div>
  );
}
