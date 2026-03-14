import React from "react";
import { useFigmaData } from "../useFigmaData";

export default function Files() {
  const { files } = useFigmaData();

  return (
    <div className="py-[18px]">
      <div className="bg-white rounded-xl p-5 border border-[#eee] shadow-[0_6px_30px_rgba(0,0,0,0.04)]">
        <h1 className="text-[18px] font-semibold mb-2 text-[#181818]">Tracked Files</h1>
        <div>
          {files.length === 0 ? (
            <div className="text-center text-[#A6A6A6] py-6 italic text-[13px]">No files tracked yet.</div>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {files.map((f) => (
                <li key={f.id} className="flex justify-between items-center p-2.5 rounded-md">
                  <div className="font-medium text-[#181818]">{f.name}</div>
                  <div className="text-[#A6A6A6] text-[13px]">{f.teamName ?? "No Team"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
