import React from "react";

export default function Settings() {
  return (
    <div className="py-[18px]">
      <div className="bg-white rounded-xl p-5 border border-[#eee] shadow-[0_6px_30px_rgba(0,0,0,0.04)]">
        <h1 className="text-[18px] font-semibold mb-2 text-[#181818]">Settings</h1>
        <p className="text-[#8a8a8a] text-[13px]">Configure syncing, API keys, and account settings.</p>
        <div className="text-center text-[#A6A6A6] py-6 italic text-[13px]">Manage your connection and preferences here.</div>
      </div>
    </div>
  );
}
