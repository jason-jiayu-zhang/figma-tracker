import React from "react";

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse w-full">
      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 h-32 rounded-3xl" />
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-gray-200 h-[400px] rounded-3xl w-full" />
    </div>
  );
}
