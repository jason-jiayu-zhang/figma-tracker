import React from "react";

const BTN_BASE =
  "ui-text inline-flex items-center justify-center gap-2 rounded-full px-6 h-11 transition-[background-color,color,transform,border-color] duration-200 ease-out-cubic active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
export const BTN_PRIMARY = `${BTN_BASE} bg-accent text-white hover:bg-accent-hover active:bg-accent-active`;
export const BTN_GHOST = `${BTN_BASE} border border-ink/15 text-ink hover:bg-ink/[0.04]`;
export const BTN_DANGER = `${BTN_BASE} bg-red text-white hover:bg-red/90`;

/** Landing-style page heading: display title + body-colored lede. */
export function PanelHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="display text-[clamp(1.25rem,5.6vw,2rem)]">{title}</h1>
      <p className="text-[16px] leading-relaxed text-body">{children}</p>
    </div>
  );
}
