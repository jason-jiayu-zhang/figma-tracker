import React from "react";
import { Link } from "react-router";
import imgFimanuLogoFull from "../assets/fimanu-logo-full.svg";
import { PrimaryNav, AccountNav } from "./TopNav";
import { Skeleton } from "./ui";

export type SidebarSection = { id: string; label: string; icon: React.ReactNode; content: React.ReactNode };

/** Labeled group inside a sidebar section so related controls read as one unit. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</span>
      {children}
    </div>
  );
}

/** Sidebar controls. Every section is visible at once, so nothing is hidden
    behind a tab and the canvas never has to dodge a floating panel. */
export function SidebarControls({ sections, label = "Settings" }: { sections: SidebarSection[]; label?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      // Below lg the controls are the last thing on the page, so give them room to
      // breathe (plus the iOS home-indicator inset) instead of ending flush at the edge.
      className="bg-surface border-t border-hairline max-lg:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:border-t-0 lg:border-r lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-gutter:stable] custom-scrollbar"
    >
      {sections.map((sec) => (
        <section
          key={sec.id}
          aria-labelledby={`sidebar-${sec.id}`}
          className="flex flex-col gap-3.5 px-4 py-4 border-b border-hairline last:border-b-0 lg:px-5"
        >
          <h2 id={`sidebar-${sec.id}`} className="flex items-center gap-1.5 text-[13px] font-extrabold text-accent">
            {sec.icon}
            {sec.label}
          </h2>
          {sec.content}
        </section>
      ))}
    </div>
  );
}

/** A full-width segmented switcher for the sidebar's top slot. */
export function SidebarSwitcher<T extends string>({
  label,
  value,
  onChange,
  options,
  columns,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon: React.ReactNode; count?: number }[];
  columns?: number;
}) {
  const cols = columns ?? options.length;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      className="grid gap-1 p-1 rounded-xl bg-canvas border border-line"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex flex-col items-center justify-center gap-1.5 min-w-0 px-1 py-2.5 rounded-lg text-[12px] leading-none font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${value === o.id ? "bg-surface text-ink ring-1 ring-accent/30 shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.icon}
          <span className="max-w-full truncate">
            {o.label}
            {o.count !== undefined && <span className="ml-1 font-medium tabular-nums text-muted">{o.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/** The dashboard frame shared by Studio, Files and Settings: a full-width header
    bar, a left sidebar (top slot + scrolling body) and a canvas.
    On small screens the DOM order (top slot → canvas → body) keeps the canvas next
    to the top slot. Gutters are 16px on phones, 20px from lg. */
export default function AppShell({
  actions,
  sidebarTop,
  sidebar,
  children,
  canvasClassName = "",
}: {
  /** Page actions, shown in the header between the nav and the account. */
  actions?: React.ReactNode;
  sidebarTop: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  canvasClassName?: string;
}) {
  return (
    <div className="bg-canvas min-h-dvh lg:h-dvh w-full flex flex-col">
      {/* Header: a flat list of items reordered per breakpoint with `order-*`.
          Desktop is a flex row: logo · nav ········ actions | account.
          Below lg it's a 2-column grid: logo and account share the top row, then
          nav and actions share the second. That row is `lg:contents`, so on desktop
          its children join the flex row directly and take their own order. */}
      <header className="shrink-0 bg-surface border-b border-hairline px-4 py-3 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 lg:flex lg:flex-wrap lg:px-5 lg:py-4">
        <Link to="/studio" aria-label="Fimanu" className="order-1 justify-self-start shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <img src={imgFimanuLogoFull} alt="Fimanu" className="h-7 w-auto" />
        </Link>
        <div className="order-2 lg:order-5">
          <AccountNav bare />
        </div>
        <div className="order-3 col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 lg:contents">
          <div className="lg:order-2 lg:ml-1">
            <PrimaryNav bare />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 lg:order-3 lg:ml-auto">{actions}</div>
        </div>
        <div className="hidden lg:block order-4 w-px h-5 bg-line" aria-hidden="true" />
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="px-4 py-3 bg-surface border-b border-hairline lg:px-5 lg:py-4 lg:border-r lg:col-start-1 lg:row-start-1">
          {sidebarTop}
        </div>

        <main className={`flex flex-col min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:min-h-0 ${canvasClassName}`}>
          {children}
        </main>

        {sidebar}
      </div>
    </div>
  );
}

/** Generic sidebar placeholder (switcher + a few control groups) for loading states. */
export function SidebarSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="hidden lg:block lg:col-start-1 lg:row-start-2 bg-surface lg:border-r lg:border-hairline lg:overflow-hidden"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3.5 px-5 py-4 border-b border-hairline last:border-b-0">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Whole-page loading state: the real header around an empty sidebar and a
    centered spinner in the canvas. */
export function AppShellSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <AppShell
      sidebarTop={<div aria-hidden="true" className="h-[58px]" />}
      sidebar={<SidebarSkeleton />}
    >
      <div role="status" className="flex flex-1 items-center justify-center">
        <div aria-hidden="true" className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="sr-only">{label}</span>
      </div>
    </AppShell>
  );
}
