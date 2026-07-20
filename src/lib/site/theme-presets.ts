// Single source of truth for the public site's theme options — consumed by
// src/app/s/[tenant]/layout.tsx (runtime CSS var override), the
// updateSiteTheme server action (validation), and ThemeSettings.tsx (swatch
// rendering). Every theme is exactly 2 colors: `ink` (text) and `paper`
// (background) — theme.css derives everything else from these two via
// color-mix(), so that's all any theme, preset or custom, needs to supply.

export type PresetThemeName = "editorial-default" | "inverted" | "warm-beige" | "sage";
export type ThemeName = PresetThemeName | "custom";

export const THEME_NAMES: ThemeName[] = ["editorial-default", "inverted", "warm-beige", "sage", "custom"];

export const THEME_PRESETS: Record<PresetThemeName, { ink: string; paper: string; label: string }> = {
  "editorial-default": { ink: "oklch(0.18 0 0)", paper: "oklch(0.99 0.002 90)", label: "기본" },
  inverted: { ink: "oklch(0.99 0.002 90)", paper: "oklch(0.18 0 0)", label: "역전" },
  "warm-beige": { ink: "#3B2E24", paper: "#F1E7D8", label: "웜베이지" },
  sage: { ink: "#1F2E22", paper: "#E7EDE4", label: "세이지" },
};

function isPresetThemeName(value: string): value is PresetThemeName {
  return value in THEME_PRESETS;
}

export function resolveThemeColors(
  settings:
    | { themeName: string; themeCustomInk: string | null; themeCustomPaper: string | null }
    | null
    | undefined
): { ink: string; paper: string } {
  const name = settings?.themeName ?? "editorial-default";
  if (name === "custom" && settings?.themeCustomInk && settings?.themeCustomPaper) {
    return { ink: settings.themeCustomInk, paper: settings.themeCustomPaper };
  }
  return isPresetThemeName(name) ? THEME_PRESETS[name] : THEME_PRESETS["editorial-default"];
}

// Mirrors theme.css's @theme block mix stops exactly (kept in sync manually
// — see the comment there). Needed because a CSS custom property declared
// once at :root, like --color-site-ink-body, resolves any var() references
// inside it (e.g. var(--color-site-ink)) using :root's OWN value, not the
// value re-declared further down the tree on layout.tsx's wrapper element —
// custom properties inherit their already-substituted computed value, they
// don't re-resolve nested var()s per descendant. So overriding just
// --color-site-ink/-paper on the wrapper (as this file used to do) silently
// failed to recolor anything that goes through a *derived* token (About/
// IndexTab body text, muted text, borders, placeholders). Fix: compute every
// derived token's color-mix() with the literal ink/paper values inlined
// (no var() left to mis-resolve) and set all of them on the same wrapper.
const DERIVED_MIX_STOPS: Record<string, number> = {
  "--color-site-ink-body": 91,
  "--color-site-ink-soft": 79,
  "--color-site-ink-muted": 67,
  "--color-site-ink-faint": 54,
  "--color-site-border": 11,
  "--color-site-placeholder-a": 6,
  "--color-site-placeholder-b": 2,
};

export function themeCssVars(ink: string, paper: string): Record<string, string> {
  const vars: Record<string, string> = {
    "--color-site-ink": ink,
    "--color-site-paper": paper,
  };
  for (const [name, percent] of Object.entries(DERIVED_MIX_STOPS)) {
    vars[name] = `color-mix(in oklch, ${ink} ${percent}%, ${paper})`;
  }
  return vars;
}
