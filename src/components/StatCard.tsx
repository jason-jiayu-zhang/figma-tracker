import React from "react";

export default function StatCard({
  value,
  label,
  icon,
  color,
  small,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="group bg-white border border-[#EBEBEB] rounded-xl px-5 py-4 shadow-sm hover:border-[#D1D1D1] transition-all hover:-translate-y-1 flex flex-col gap-1">
      <div
        className="w-8 h-8 flex items-center justify-center rounded-lg mb-1 transition-transform group-hover:scale-110"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className={`font-bold text-[#181818] leading-tight text-[24px]`}>
        {value}
      </div>
      <div className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
