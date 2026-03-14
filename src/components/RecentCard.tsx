import React from "react";
import { format } from "date-fns";

export default function RecentCard({ activity }: { activity: any }) {
  return (
    <section className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
      <div className="flex flex-col px-6 py-4 border-b border-[#EBEBEB]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-bold text-[#181818]">Recent</h2>
            <p className="text-[13px] text-[#A6A6A6]">Latest edits and activity across your tracked files</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-4">
        <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
          {(activity && activity.rows ? activity.rows.slice(0, 3) : []).map((r: any, i: number) => (
            <li key={i} className="flex justify-between items-center p-2.5 rounded-md">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-[10px] bg-[#f3f3f3]" />
                <div>
                  <div className="font-bold">{r.figma_files?.name ?? "Untitled"}</div>
                  <div className="text-[#A6A6A6] text-[13px]">{format(new Date(r.activity_date), "MMM d, yyyy")}</div>
                </div>
              </div>
              <div className="text-[#A6A6A6] text-[13px]">{r.version_count} changes</div>
            </li>
          ))}
          {(!activity || !(activity.rows && activity.rows.length)) && (
            <li className="flex justify-between items-center p-2.5 rounded-md text-[#A6A6A6] text-[13px]">No recent activity</li>
          )}
        </ul>
      </div>
    </section>
  );
}
