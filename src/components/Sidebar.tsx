import React from "react";
import { Link, useLocation } from "react-router-dom";

const imgFigmanuLogo = "http://localhost:3845/assets/386d23f3f069f99360f4343fd24b341537c35c46.svg";
const imgFrame43 = "http://localhost:3845/assets/dc8ea431dcefd460d2f45a955c192e13a83a1829.svg";
const imgFrame44 = "http://localhost:3845/assets/bdcf59e0bff15fdf3a487151cfffd8e82199b3cb.svg";
const imgFrame45 = "http://localhost:3845/assets/4fa4e7f57bef498198a4d1c1a2d299363574b95e.svg";
const imgFrame46 = "http://localhost:3845/assets/ab590deb3d77bd9221c55e530395b63fdbdf1f05.svg";
const imgFrame47 = "http://localhost:3845/assets/c16bdc689d8ee776175a884985bd7e04f8b53c99.svg";

export default function Sidebar({ className }: { className?: string }) {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { icon: imgFrame43, path: "/" },
    { icon: imgFrame44, path: "/files" },
    { icon: imgFrame45, path: "/settings" },
    { icon: imgFrame46, path: "/embed" },
    { icon: imgFrame47, path: "/new" },
  ];

  return (
    <div className={className || "bg-white flex flex-col gap-[48px] h-[768px] items-start justify-center px-[12px] py-[8px] relative rounded-[32px] shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0"} data-name="Nav Bar">
      <div className="aspect-[64/64] bg-[#fffaf4] flex items-center justify-center overflow-clip relative rounded-[32px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full mb-[-32px]">
        <div className="h-[40px] relative shrink-0 w-[32.667px]" data-name="Figmanu Logo">
          <div className="absolute inset-[-2.6%_-3.19%] pointer-events-none">
            <img alt="" className="block max-w-none size-full" src={imgFigmanuLogo} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-[16px] items-start px-[8px] relative shrink-0 w-[64px]">
        {navItems.map((item, idx) => {
          const isActive = path === item.path || (path !== "/" && item.path !== "/" && path.startsWith(item.path));
          return (
            <Link
              key={idx}
              to={item.path}
              className={`flex h-[48px] items-center justify-center overflow-clip p-[12px] relative rounded-[32px] shrink-0 w-full transition-all ${
                isActive 
                  ? "bg-[#f5f5f5] shadow-inner border border-transparent" 
                  : "bg-[#fffaf4] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#f0f0f0]"
              }`}
            >
              <div className="relative shrink-0 size-[24px]">
                <img alt="" className="block max-w-none size-full pointer-events-none opacity-80" src={item.icon} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
