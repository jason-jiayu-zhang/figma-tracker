import React from "react";
import { useFigmaData } from "../useFigmaData";

export default function Teams() {
  const { files } = useFigmaData();
  const teams = Array.from(new Set(files.map((f) => f.teamName).filter(Boolean)));

  return (
    <div className="py-[18px]">
      <div className="bg-white rounded-xl p-5 border border-[#eee] shadow-[0_6px_30px_rgba(0,0,0,0.04)]">
        <h1 className="text-[18px] font-semibold mb-2 text-[#181818]">Teams & Projects</h1>
        <p className="text-[#8a8a8a] text-[13px]">Overview of teams and projects where tracked files belong.</p>
        <div>
          {teams.length === 0 ? (
            <div className="text-center text-[#A6A6A6] py-6 italic text-[13px]">No teams detected.</div>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {teams.map((t) => (
                <li key={t} className="p-2.5 rounded-md text-[#181818]">{t}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
