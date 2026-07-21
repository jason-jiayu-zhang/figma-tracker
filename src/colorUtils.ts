// Color math shared by the Studio editing controls: hex parsing, WCAG contrast
// checks, and deriving a 4-step heatmap ramp from a single accent color.

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  const expanded = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return /^[0-9a-fA-F]{6}$/.test(expanded) ? `#${expanded.toLowerCase()}` : null;
}

function toRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? "#000000";
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

export function rgbToHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return toHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type ContrastGrade = "AAA" | "AA" | "AA Large" | "Fail";

export function contrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

// A 4-step ramp (lightest → darkest) anchored on the accent. The accent lands
// at step 3 and the earlier steps walk lightness up / saturation down, so a
// single brand color yields a heatmap scale that still reads as one hue.
export function deriveRamp(accent: string): { levels: string[]; empty: string } {
  const [h, s, l] = rgbToHsl(accent);
  const sat = Math.max(0.25, Math.min(0.95, s));
  const endL = Math.max(0.28, Math.min(0.62, l));
  const startL = 0.86;
  const levels = [0, 1, 2, 3].map((i) => {
    const t = i / 3;
    return hslToHex(h, sat * (0.4 + 0.6 * t), startL + (endL - startL) * t);
  });
  return { levels, empty: hslToHex(h, Math.min(sat, 0.3), 0.93) };
}

// Darker text on light backgrounds and vice versa — used to auto-pick a legible
// foreground when the user only chose a background.
export function readableOn(bg: string): string {
  return relativeLuminance(bg) > 0.45 ? "#1a1a1a" : "#f5f5f5";
}

export const EYEDROPPER_SUPPORTED =
  typeof window !== "undefined" && "EyeDropper" in window;

export async function pickScreenColor(): Promise<string | null> {
  if (!EYEDROPPER_SUPPORTED) return null;
  try {
    const Picker = (window as any).EyeDropper;
    const { sRGBHex } = await new Picker().open();
    return normalizeHex(sRGBHex);
  } catch {
    return null; // user dismissed
  }
}
