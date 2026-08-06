import React from "react";
import { Link } from "react-router";
import imgFimanuLogoFull from "../assets/fimanu-logo-full.svg";
import { CONTACT_EMAIL } from "../config";

const LINKS: { label: string; to?: string; href?: string }[] = [
  { label: "About", to: "/about" },
  { label: "Docs", to: "/docs" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Feedback", href: `mailto:${CONTACT_EMAIL}?subject=Fimanu%20Feedback` },
];

const Footer: React.FC = () => {
  return (
    <div className="w-full flex justify-center">
      <footer className="flex w-[1080px] max-w-[calc(100%-3rem)] flex-wrap items-center justify-between gap-4 rounded-3xl border border-hairline bg-surface px-6 py-4 shadow-card">
        <div className="flex items-center gap-3">
          <img alt="Fimanu" className="h-5 w-auto opacity-80" src={imgFimanuLogoFull} />
          <span className="text-[12px] text-muted">© 2026 Jason Jiayu Zhang</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {LINKS.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className="text-[13px] font-semibold text-body transition-colors hover:text-ink">
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className="text-[13px] font-semibold text-body transition-colors hover:text-ink">
                {l.label}
              </a>
            )
          )}
        </nav>
      </footer>
    </div>
  );
};

export default Footer;
