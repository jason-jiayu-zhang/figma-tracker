import React from "react";

export default function ToggleGroup<T>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div className="flex bg-[#F5F5F5] border border-[#EBEBEB] rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${value === opt.value ? "bg-white text-[#181818] shadow-sm" : "text-[#A6A6A6] hover:text-[#181818]"}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
