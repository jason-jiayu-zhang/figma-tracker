import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useFigmaData } from "../useFigmaData";
import { User as UserIcon } from "lucide-react";

const imgFrame43 = "http://localhost:3845/assets/dc8ea431dcefd460d2f45a955c192e13a83a1829.svg";
const imgFrame44 = "http://localhost:3845/assets/bdcf59e0bff15fdf3a487151cfffd8e82199b3cb.svg";
const imgFrame46 = "http://localhost:3845/assets/ab590deb3d77bd9221c55e530395b63fdbdf1f05.svg";
const imgFrame47 = "http://localhost:3845/assets/c16bdc689d8ee776175a884985bd7e04f8b53c99.svg";

export default function Sidebar({ className }: { className?: string }) {
  const { stats } = useFigmaData();
  const location = useLocation();
  const path = location.pathname;

  const user = stats?.user;

  const navItems = [
    { icon: imgFrame43, path: "/" },
    { icon: imgFrame44, path: "/files" },
    { icon: imgFrame46, path: "/embed" },
    { icon: imgFrame47, path: "/new" },
  ];

  return (
    <div className={className || "bg-white flex flex-col gap-12 h-[768px] items-start justify-center px-3 py-2 relative rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0"} data-name="Nav Bar">
      <Link 
        to="/profile"
        className={`aspect-square bg-[#fffaf4] flex items-center justify-center overflow-hidden relative rounded-4xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full mb-[-32px] transition-all hover:scale-105 active:scale-95 border-2 ${path === '/profile' ? 'border-[#1ABCFE]' : 'border-transparent'}`}
      >
        {user?.img_url ? (
          <img alt={user.display_name || 'Profile'} className="block size-full object-cover" src={user.img_url} />
        ) : (
          <div className="flex items-center justify-center size-full text-[#A6A6A6]">
            <UserIcon size={24} />
          </div>
        )}
      </Link>
      <div className="flex flex-col gap-4 items-start px-2 relative shrink-0 w-16">
        {navItems.map((item, idx) => {
          const isActive = path === item.path || (path !== "/" && item.path !== "/" && path.startsWith(item.path));
          return (
            <Link
              key={idx}
              to={item.path}
              className={`flex h-12 items-center justify-center overflow-clip p-3 relative rounded-4xl shrink-0 w-full transition-all ${
                isActive 
                  ? "bg-[#f5f5f5] shadow-inner border border-transparent" 
                  : "bg-[#fffaf4] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#f0f0f0]"
              }`}
            >
              <div className="relative shrink-0 size-6">
                <img alt="" className="block max-w-none size-full pointer-events-none opacity-80" src={item.icon} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

