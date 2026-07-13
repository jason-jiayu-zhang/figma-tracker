import React from "react";
import { Link } from "react-router-dom";
import imgFimanuLogoFull from "../assets/FimanuLogoFull.svg";

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
      className="group scroll-mt-24 pt-9 pb-1 text-ink text-[20px] font-semibold tracking-[-0.2px] text-balance"
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
    <ul className="list-disc pl-6 flex flex-col gap-2 text-body text-[15px] leading-[1.7] tracking-[-0.1px] marker:text-line text-pretty">
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
  const articleRef = React.useRef<HTMLElement>(null);
  const [toc, setToc] = React.useState<{ id: string; text: string }[]>([]);
  const [active, setActive] = React.useState("");

  React.useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const headings = Array.from(
      article.querySelectorAll<HTMLHeadingElement>("h2[id]")
    );
    setToc(headings.map((h) => ({ id: h.id, text: h.textContent || "" })));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-88px 0px -66% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-canvas min-h-dvh w-full flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-[1000px]">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Fimanu home">
            <img src={imgFimanuLogoFull} alt="Fimanu" className="h-9 w-auto" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-body transition-colors hover:border-ink/20 hover:text-ink"
          >
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to app
          </Link>
        </header>

        <div className="pt-8 flex flex-col items-center lg:grid lg:grid-cols-[220px_1fr] lg:gap-14 lg:items-start">
          {toc.length > 1 && (
            <nav aria-label="On this page" className="hidden lg:block w-full">
              <div className="sticky top-10 flex flex-col gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-muted">
                  On this page
                </p>
                <ul className="flex flex-col gap-0.5">
                  {toc.map(({ id, text }) => {
                    const isActive = active === id;
                    return (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          aria-current={isActive ? "true" : undefined}
                          className={`block border-l-2 pl-4 py-1.5 text-[13px] leading-snug text-pretty transition-colors ${
                            isActive
                              ? "border-ink text-ink font-medium"
                              : "border-transparent text-body hover:border-line hover:text-ink"
                          }`}
                        >
                          {text}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          )}

          <div className="w-full max-w-[720px] min-w-0 lg:max-w-none">
            <article
              ref={articleRef}
              className="bg-surface rounded-4xl shadow-card px-6 py-10 sm:px-10 sm:py-12"
            >
              <div className="flex flex-col items-start gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-hairline px-3 py-1 text-[12px] font-medium text-muted">
                  <span className="size-1.5 rounded-full bg-body/50" />
                  Updated {updated}
                </span>
                <h1 className="text-ink text-[34px] leading-[1.1] font-semibold tracking-[-0.5px] text-balance">
                  {title}
                </h1>
              </div>
              <div className="pt-6 flex flex-col gap-4">{children}</div>
            </article>

            <div className="pt-8 flex items-center justify-center gap-4 text-[14px]">
              <Link
                to="/privacy"
                className="text-muted hover:text-ink hover:underline"
              >
                Privacy Policy
              </Link>
              <span aria-hidden className="text-line">
                •
              </span>
              <Link
                to="/terms"
                className="text-muted hover:text-ink hover:underline"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
