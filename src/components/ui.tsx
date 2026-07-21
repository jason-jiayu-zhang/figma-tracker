import React, { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────────────────────
   Fimanu design-system primitives. One source of truth for the
   recurring patterns: cards, section headers, icon chips, inline
   stats, buttons, segmented controls, and KPI tiles.
   Colors come from the semantic tokens in index.css (ink / body /
   muted / line / surface / canvas / accent) plus the Figma brand
   palette used for category accents.
   ──────────────────────────────────────────────────────────── */

export type ChipColor = "blue" | "purple" | "green" | "orange" | "red" | "accent";

/* Categorical file palette: vivid, on-brand hues spread around the color wheel
   (the 5 Figma brand colors plus 7 complements) so distinct files read as
   distinct. All are saturated enough to carry the white row text. */
const FILE_COLORS = [
  "#0acf83", // green (brand)
  "#06b6a4", // teal
  "#1abcfe", // blue (brand)
  "#6366f1", // indigo
  "#a259ff", // purple (brand)
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red (brand)
  "#f24e1e", // orange (brand)
  "#ea8c00", // amber
  "#7ca60c", // chartreuse
];

/** Deterministic color keyed by file identity, so a file keeps the same color
   everywhere and doesn't change when a list re-sorts. Uses a djb2 hash, which
   scatters keys evenly across the palette so distinct files rarely collide. */
export function colorForKey(key: string): string {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return FILE_COLORS[Math.abs(hash) % FILE_COLORS.length];
}

const CHIP: Record<ChipColor, { bg: string; fg: string }> = {
  blue: { bg: "rgba(26,188,254,0.10)", fg: "#1abcfe" },
  purple: { bg: "rgba(162,89,255,0.10)", fg: "#a259ff" },
  green: { bg: "rgba(10,207,131,0.10)", fg: "#0acf83" },
  orange: { bg: "rgba(242,78,30,0.10)", fg: "#f24e1e" },
  red: { bg: "rgba(239,68,68,0.10)", fg: "#ef4444" },
  accent: { bg: "rgba(242,59,39,0.10)", fg: "#f23b27" },
};

/** Tinted, brand-colored square that holds a section/stat icon.
   With `plain`, drops the tinted box and renders a bare near-black line icon. */
export function IconChip({
  color = "blue",
  plain = false,
  className = "",
  children,
}: {
  color?: ChipColor;
  plain?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (plain) {
    return (
      <div className={`size-10 shrink-0 flex items-center justify-center text-ink ${className}`}>
        {children}
      </div>
    );
  }
  const c = CHIP[color];
  return (
    <div
      className={`size-10 shrink-0 flex items-center justify-center rounded-xl ${className}`}
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {children}
    </div>
  );
}

/** White elevated card. */
export function Card({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-surface rounded-4xl shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Standard section header: brand icon chip + title + subtitle + optional action. */
export function SectionHeader({
  color = "blue",
  plain = false,
  icon,
  title,
  subtitle,
  action,
  className = "",
}: {
  color?: ChipColor;
  plain?: boolean;
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 w-full ${className}`}>
      <div className="flex gap-3 items-center min-w-0">
        <IconChip color={color} plain={plain}>{icon}</IconChip>
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="font-bold text-[20px] tracking-[-0.2px] leading-tight text-ink truncate">
            {title}
          </h2>
          {subtitle != null &&
            (typeof subtitle === "string" ? (
              <p className="text-[12px] text-muted tracking-[-0.12px] leading-none">{subtitle}</p>
            ) : (
              subtitle
            ))}
        </div>
      </div>
      {action}
    </div>
  );
}

export interface StatItem {
  icon?: React.ReactNode;
  label: React.ReactNode;
  strong?: boolean;
}

/** The dot-separated inline stat row (e.g. "1,204 edits · 🔥 8-day streak · best 31"). */
export function StatInline({ items, className = "" }: { items: StatItem[]; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-[12px] tracking-[-0.12px] text-body whitespace-nowrap tabular-nums ${className}`}
    >
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-line">·</span>}
          <span className={`flex items-center gap-1 ${it.strong ? "font-semibold text-ink" : ""}`}>
            {it.icon}
            {it.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent hover:bg-accent-hover active:bg-accent-active text-white shadow-sm",
  secondary: "bg-surface border border-accent text-accent hover:bg-canvas shadow-sm",
  ghost: "text-body hover:bg-hairline",
  dark: "bg-ink hover:bg-black text-white shadow-sm",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: { variant?: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface SegOption<T> {
  label: React.ReactNode;
  value: T;
}

/** Pill segmented control (My/All, time ranges, Link/iframe, …). */
export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
  ariaLabel = "View options",
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const cell =
    size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-[14px]";
  return (
    <div role="group" aria-label={ariaLabel} className={`bg-canvas flex items-center p-1 rounded-lg shrink-0 ${className}`}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`flex items-center justify-center rounded-md transition-[color,background-color,box-shadow] font-normal tracking-[-0.14px] ${cell} ${
            value === opt.value
              ? "bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** The app shell column. Every page — full-bleed canvas or list — aligns its
   chrome to this exact box so the top nav and sub-nav never shift between
   routes. Paired with SHELL_TOP_PAD, which clears the fixed nav.
   Never combine with another width utility: `w-full` is emitted after
   `w-[1080px]` in the utilities layer, so it silently wins and the column
   stretches to the viewport. */
export const SHELL = "w-[1080px] max-w-[calc(100%-3rem)] mx-auto";
export const SHELL_TOP_PAD = "pt-[88px]";

/** Vertical hairline separating groups of controls inside a dock. */
export function Divider() {
  return <div className="w-px self-stretch bg-line shrink-0" aria-hidden="true" />;
}

const POPOVER_ALIGN = {
  left: "left-0",
  center: "left-1/2 -translate-x-1/2",
  right: "right-0",
} as const;

/** Disclosure panel anchored above its trigger; closes on outside click and
   Escape. The trigger is a render prop so callers keep their own button markup
   (and its aria-expanded/aria-haspopup wiring). */
export function Popover({
  trigger,
  align = "right",
  panelClassName = "",
  className = "",
  children,
}: {
  trigger: (state: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  align?: keyof typeof POPOVER_ALIGN;
  panelClassName?: string;
  className?: string;
  children: React.ReactNode | ((state: { close: () => void }) => React.ReactNode);
}) {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    if (!isOpen) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  return (
    <div className={`relative shrink-0 ${className}`} ref={root}>
      {trigger({ isOpen, toggle })}
      {isOpen && (
        <div
          className={`absolute bottom-[calc(100%+8px)] ${POPOVER_ALIGN[align]} z-50 bg-surface rounded-2xl shadow-card-hover border border-line animate-in fade-in zoom-in duration-200 motion-reduce:animate-none ${panelClassName}`}
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

/** KPI tile: brand chip + big value + label. Becomes a button when onClick is set. */
export function StatTile({
  color = "blue",
  plain = false,
  icon,
  value,
  label,
  onClick,
  title,
  disabled,
  className = "",
}: {
  color?: ChipColor;
  plain?: boolean;
  icon: React.ReactNode;
  value: React.ReactNode;
  label: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <IconChip color={color} plain={plain}>{icon}</IconChip>
      <div className="flex flex-col min-w-0">
        <p className="font-semibold text-[22px] tracking-[-0.22px] text-ink leading-none truncate tabular-nums">
          {value}
        </p>
        <p className="text-[12px] text-body tracking-[-0.12px] mt-1 truncate">{label}</p>
      </div>
    </>
  );
  const base = "bg-surface flex items-center gap-3 p-4 rounded-3xl shadow-card flex-1 min-w-0";
  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`${base} text-left transition-[transform,box-shadow] hover:shadow-card-hover active:scale-[0.98] disabled:opacity-70 ${className}`}
      >
        {inner}
      </button>
    );
  }
  return <div title={title} className={`${base} ${className}`}>{inner}</div>;
}
