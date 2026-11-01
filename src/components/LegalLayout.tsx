import React from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import imgFimanuLogo from "../assets/fimanu-logo.svg";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function H({ children }: { children: React.ReactNode }) {
  const id = typeof children === "string" ? slugify(children) : undefined;
  return (
    <h2
      id={id}
      className="group scroll-mt-12 pt-6 text-ink text-[17px] font-semibold tracking-[-0.2px] whitespace-nowrap"
    >
      {id ? (
        <a
          href={`#${id}`}
          className="relative inline-block before:absolute before:-left-5 before:top-0 before:text-muted before:opacity-0 before:transition-opacity before:content-['#'] group-hover:before:opacity-100"
        >
          {children}
        </a>
      ) : (
        children
      )}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-body text-[15px] leading-[1.7] tracking-[-0.1px] text-pretty">
      {children}
    </p>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-6 flex flex-col gap-2 text-body text-[15px] leading-[1.7] tracking-[-0.1px] marker:text-muted/50 text-pretty">
      {children}
    </ul>
  );
}

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-canvas px-gutter py-16 font-sans text-ink">
      <main className="flex w-full max-w-xl flex-1 flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Fimanu home">
            <img src={imgFimanuLogo} alt="Fimanu" className="h-7 w-auto" />
          </Link>
          <Link
            to="/"
            className="ui-text inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </header>

        <article className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-2 pb-2">
            <h1 className="display text-display-sm whitespace-nowrap">{title}</h1>
            <span className="text-[13px] text-muted">Updated {updated}</span>
          </div>
          {children}
        </article>
      </main>

      <footer className="flex w-full max-w-xl flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-10 text-[13px] text-muted">
        <span>© 2026 Jason Jiayu Zhang · Not affiliated with Figma, Inc.</span>
        <span className="flex items-center gap-4">
          <Link to="/privacy" className="transition-colors hover:text-ink">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-ink">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
