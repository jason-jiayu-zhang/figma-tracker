# Project instructions

## Styling

- Stack is **Tailwind v4** (via `@tailwindcss/vite`). Design tokens live in `src/index.css` under `@theme` (colors, shadows, `--spacing`). Semantic tokens: `ink` / `body` / `muted` (text), `canvas` / `surface` / `line` / `hairline` (surfaces), `accent` (primary action), plus the Figma brand palette for categories.
- **Do all spacing with Tailwind utilities** (`gap-*`, `p*-*`, `m*-*`, `space-*`). No raw CSS margins/padding for layout, and no inline `style` spacing except genuinely dynamic, runtime-computed values (e.g. `Heatmap.tsx`).
- **Never add an unlayered global reset that sets `margin`/`padding` on elements** (e.g. `* { margin: 0 }`). Tailwind's Preflight already zeroes default margins, and an unlayered rule silently **overrides every Tailwind margin / `mx-auto` / `space-*` utility app-wide** (unlayered CSS beats `@layer utilities`) — the utility class stays in the DOM but computes to `0`, so spacing looks mysteriously dead. If you truly need custom base styles, wrap them in `@layer base { ... }` so utilities still win.
- Symptom to watch for: a margin/`mx-auto` class is present but `getComputedStyle` reports `0` → check for an unlayered global selector in `src/index.css`.
